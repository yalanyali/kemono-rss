import { fetchCreatorProfile, fetchCreatorPosts } from './kemono';
import { generatePodcastRss } from './rss';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Route: /get/:service/:creatorId
    const match = path.match(/^\/get\/([^\/]+)\/([^\/]+)$/);
    
    if (match) {
      const [, service, creatorId] = match;
      
      try {
        // Fetch creator profile and posts in parallel
        const [profile, posts] = await Promise.all([
          fetchCreatorProfile(service, creatorId),
          fetchCreatorPosts(service, creatorId)
        ]);

        // Generate podcast RSS
        const rss = await generatePodcastRss(profile, posts);

        return new Response(rss, {
          headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
          }
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error generating feed for ${service}/${creatorId}:`, message);
        
        return new Response(`Error: ${message}`, {
          status: 500,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
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
