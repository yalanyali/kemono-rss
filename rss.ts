import type { KemonoCreatorProfile, KemonoPost } from './types';
import { isAudioFile, getMimeType } from './types';
import { getCreatorPageUrl, getPostUrl, getFileUrl, fetchPost } from './kemono';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatRfc822Date(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toUTCString();
}

interface AudioAttachment {
  url: string;
  type: string;
  name: string;
}

function findAudioAttachments(post: KemonoPost): AudioAttachment[] {
  const audios: AudioAttachment[] = [];
  
  // Check main file (post.file can be {} so check for name property)
  if (post.file?.name && isAudioFile(post.file.name)) {
    audios.push({
      url: getFileUrl(post.file.path),
      type: getMimeType(post.file.name),
      name: post.file.name
    });
  }
  
  // Check attachments
  for (const att of post.attachments || []) {
    if (att?.name && isAudioFile(att.name)) {
      audios.push({
        url: getFileUrl(att.path),
        type: getMimeType(att.name),
        name: att.name
      });
    }
  }
  
  return audios;
}

// Build rich description including content, embed, and files
function buildRichDescription(post: KemonoPost): string {
  const parts: string[] = [];
  
  // Add content
  if (post.content) {
    parts.push(post.content);
  }
  
  // Add embed info (video links, etc.)
  if (post.embed?.url) {
    parts.push(`<p><strong>📺 Video:</strong> <a href="${post.embed.url}">${post.embed.subject || post.embed.url}</a></p>`);
  }
  
  // Add file (non-audio, like images)
  if (post.file?.name && !isAudioFile(post.file.name)) {
    const fileUrl = getFileUrl(post.file.path);
    parts.push(`<p><strong>📎 File:</strong> <a href="${fileUrl}">${post.file.name}</a></p>`);
  }
  
  // Add attachments (non-audio)
  const nonAudioAttachments = (post.attachments || []).filter(att => att?.name && !isAudioFile(att.name));
  if (nonAudioAttachments.length > 0) {
    parts.push('<p><strong>📎 Attachments:</strong></p><ul>');
    for (const att of nonAudioAttachments) {
      const attUrl = getFileUrl(att.path);
      parts.push(`<li><a href="${attUrl}">${att.name}</a></li>`);
    }
    parts.push('</ul>');
  }
  
  return parts.join('\n');
}

export async function generatePodcastRss(
  profile: KemonoCreatorProfile,
  posts: KemonoPost[]
): Promise<string> {
  const channelLink = getCreatorPageUrl(profile.service, profile.id);
  const creatorName = escapeXml(profile.name);
  
  // Build items - each post with audio becomes an episode
  const items: string[] = [];
  
  for (const post of posts) {
    const audioFiles = findAudioAttachments(post);
    
    const postLink = getPostUrl(profile.service, profile.id, post.id);
    const title = escapeXml(post.title || 'Untitled');
    const pubDate = formatRfc822Date(post.published || post.added || new Date().toISOString());
    
    if (audioFiles.length > 0) {
      // Audio post - use substring from list
      const postContent = post.content || post.substring || '';
      
      // Create one item per audio file
      for (const audio of audioFiles) {
        items.push(`
    <item>
      <title>${title}${audioFiles.length > 1 ? ` - ${escapeXml(audio.name)}` : ''}</title>
      <link>${postLink}</link>
      <description><![CDATA[${postContent}]]></description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="false">${post.id}-${encodeURIComponent(audio.name)}</guid>
      <enclosure url="${escapeXml(audio.url)}" type="${audio.type}" length="0"/>
      <itunes:author>${creatorName}</itunes:author>
      <itunes:duration>0</itunes:duration>
    </item>`);
      }
    } else {
      // Non-audio post - fetch full content from individual post endpoint
      let richDescription = post.content || post.substring || '';
      try {
        const fullPost = await fetchPost(profile.service, profile.id, post.id);
        richDescription = buildRichDescription(fullPost);
      } catch {
        // Fall back to substring if fetch fails
      }
      
      items.push(`
    <item>
      <title>${title}</title>
      <link>${postLink}</link>
      <description><![CDATA[${richDescription}]]></description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="false">${post.id}</guid>
      <itunes:author>${creatorName}</itunes:author>
    </item>`);
    }
  }
  
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${creatorName}</title>
    <link>${channelLink}</link>
    <description>Podcast feed for ${creatorName} on Kemono</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <itunes:author>${creatorName}</itunes:author>
    <itunes:owner>
      <itunes:name>${creatorName}</itunes:name>
    </itunes:owner>
    <itunes:explicit>false</itunes:explicit>
    <itunes:category text="Arts"/>
${items.join('\n')}
  </channel>
</rss>`;

  return rss;
}
