import { fetchCreatorProfile, fetchCreatorPosts } from './kemono';
import { generatePodcastRss } from './rss';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

console.log(`[DEBUG] Starting server on port ${PORT}`);
console.log(`[DEBUG] Environment:`, {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  TZ: process.env.TZ
});

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    
    console.log(`[DEBUG] Incoming request: ${req.method} ${path}`);

    // Route: /get/:service/:creatorId
    const match = path.match(/^\/get\/([^\/]+)\/([^\/]+)$/);
    
    if (match) {
      const [, service, creatorId] = match;
      console.log(`[DEBUG] Matched route - service: ${service}, creatorId: ${creatorId}`);
      
      try {
        console.log(`[DEBUG] Fetching profile and posts...`);
        // Fetch creator profile and posts in parallel
        const [profile, posts] = await Promise.all([
          fetchCreatorProfile(service, creatorId),
          fetchCreatorPosts(service, creatorId)
        ]);
        console.log(`[DEBUG] Fetched profile: ${profile.name}, posts count: ${posts.length}`);

        // Generate podcast RSS
        console.log(`[DEBUG] Generating RSS...`);
        const baseUrl = `${url.protocol}//${url.host}`;
        const rss = await generatePodcastRss(profile, posts, baseUrl);
        console.log(`[DEBUG] RSS generated, length: ${rss.length} chars`);

        return new Response(rss, {
          headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
          }
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const stack = error instanceof Error ? error.stack : '';
        console.error(`[ERROR] Error generating feed for ${service}/${creatorId}:`, message);
        console.error(`[ERROR] Stack:`, stack);
        
        return new Response(`Error: ${message}`, {
          status: 500,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    }

    // Serve silent audio file for non-audio posts
    if (path === '/silent.mp3') {
      const file = Bun.file('./silent.mp3');
      return new Response(file, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
        }
      });
    }

    // Home / usage info
    if (path === '/' || path === '') {
      return new Response(
        `Kemono Podcast RSS Server

Usage: /get/{service}/{creatorId}

Example: /get/patreon/123456

Supported services: patreon, fanbox, gumroad, subscribestar, dlsite, fantia, boosty, afdian
`,
        { headers: { 'Content-Type': 'text/plain' } }
      );
    }

    return new Response('Not Found', { status: 404 });
  }
});

console.log(`🎙️ Kemono RSS server running at http://localhost:${server.port}`);
