import { fetchCreatorProfile, fetchCreatorPosts, fetchAllCreatorPosts } from './kemono';
import { generatePodcastRss } from './rss';
import { hasPostsForCreator, getPostsForCreator, savePosts, markSynced, getPostCount } from './db';

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
        // Fetch profile
        console.log(`[DEBUG] Fetching profile...`);
        const profile = await fetchCreatorProfile(service, creatorId);
        console.log(`[DEBUG] Fetched profile: ${profile.name}`);

        // Check if we have posts in DB
        const hasCachedPosts = hasPostsForCreator(service, creatorId);
        console.log(`[DEBUG] Has cached posts: ${hasCachedPosts}`);
        
        if (!hasCachedPosts) {
          // No posts in DB - do full backfill
          console.log(`[DEBUG] No cached posts, starting full backfill...`);
          const allPosts = await fetchAllCreatorPosts(service, creatorId);
          const saved = savePosts(allPosts);
          console.log(`[DEBUG] Backfill complete, saved ${saved} posts to DB`);
        } else {
          // Has cached posts - fetch first page and merge new posts
          console.log(`[DEBUG] Syncing new posts from first page...`);
          const firstPagePosts = await fetchCreatorPosts(service, creatorId);
          const saved = savePosts(firstPagePosts);
          console.log(`[DEBUG] Synced ${saved} posts from first page`);
        }
        
        // Mark as synced
        markSynced(service, creatorId);
        
        // Load all posts from DB
        const posts = getPostsForCreator(service, creatorId);
        console.log(`[DEBUG] Loaded ${posts.length} posts from DB`);

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
