import type { KemonoCreatorProfile, KemonoPost } from './types';

const BASE_URL = 'https://kemono.cr/api/v1';

// Kemono API requires these headers to bypass DDoS protection
const HEADERS = {
  'Accept': 'text/css',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cookie': 'session=eyJfcGVybWFuZW50Ijp0cnVlLCJhY2NvdW50X2lkIjoyNTkyMjE0fQ.aXFEXg.UVUI8BYfZxoyWvcGz6vVMcoBJZQ'
};

export async function fetchCreatorProfile(
  service: string,
  creatorId: string
): Promise<KemonoCreatorProfile> {
  const url = `${BASE_URL}/${service}/user/${creatorId}/profile`;
  console.log(`[DEBUG] Fetching profile: ${url}`);
  
  const res = await fetch(url, { headers: HEADERS });
  console.log(`[DEBUG] Profile response: ${res.status} ${res.statusText}`);
  
  if (!res.ok) {
    const body = await res.text();
    console.error(`[ERROR] Profile fetch failed. Body:`, body.substring(0, 500));
    throw new Error(`Failed to fetch creator profile: ${res.status} ${res.statusText}`);
  }
  
  return res.json();
}

const PAGE_SIZE = 50; // Kemono API returns 50 posts per page

// Fetch first page of posts (for syncing new posts)
export async function fetchCreatorPosts(
  service: string,
  creatorId: string
): Promise<KemonoPost[]> {
  const url = `${BASE_URL}/${service}/user/${creatorId}/posts`;
  console.log(`[DEBUG] Fetching posts (first page): ${url}`);
  
  const res = await fetch(url, { headers: HEADERS });
  console.log(`[DEBUG] Posts response: ${res.status} ${res.statusText}`);
  
  if (!res.ok) {
    const body = await res.text();
    console.error(`[ERROR] Posts fetch failed. Body:`, body.substring(0, 500));
    throw new Error(`Failed to fetch creator posts: ${res.status} ${res.statusText}`);
  }
  
  return res.json();
}

// Fetch ALL posts by paginating through the API
export async function fetchAllCreatorPosts(
  service: string,
  creatorId: string
): Promise<KemonoPost[]> {
  const allPosts: KemonoPost[] = [];
  let offset = 0;
  let hasMore = true;
  
  console.log(`[DEBUG] Starting full backfill for ${service}/${creatorId}`);
  
  while (hasMore) {
    const url = `${BASE_URL}/${service}/user/${creatorId}/posts?o=${offset}`;
    console.log(`[DEBUG] Fetching posts page: ${url}`);
    
    const res = await fetch(url, { headers: HEADERS });
    
    if (!res.ok) {
      const body = await res.text();
      console.error(`[ERROR] Posts fetch failed at offset ${offset}. Body:`, body.substring(0, 500));
      throw new Error(`Failed to fetch creator posts: ${res.status} ${res.statusText}`);
    }
    
    const posts: KemonoPost[] = await res.json();
    console.log(`[DEBUG] Got ${posts.length} posts at offset ${offset}`);
    
    if (posts.length === 0) {
      hasMore = false;
    } else {
      allPosts.push(...posts);
      offset += PAGE_SIZE;
      
      // Small delay to be nice to the API
      if (hasMore && posts.length === PAGE_SIZE) {
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        hasMore = false;
      }
    }
  }
  
  console.log(`[DEBUG] Backfill complete: ${allPosts.length} total posts`);
  return allPosts;
}

interface PostResponse {
  post: KemonoPost;
}

export async function fetchPost(
  service: string,
  creatorId: string,
  postId: string
): Promise<KemonoPost> {
  const url = `${BASE_URL}/${service}/user/${creatorId}/post/${postId}`;
  const res = await fetch(url, { headers: HEADERS });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch post: ${res.status} ${res.statusText}`);
  }
  
  const data: PostResponse = await res.json();
  return data.post;
}

export function getCreatorPageUrl(service: string, creatorId: string): string {
  return `https://kemono.cr/${service}/user/${creatorId}`;
}

export function getPostUrl(service: string, creatorId: string, postId: string): string {
  return `https://kemono.cr/${service}/user/${creatorId}/post/${postId}`;
}

export function getFileUrl(path: string): string {
  // Kemono file paths are relative, prepend the base domain
  return `https://kemono.cr${path}`;
}
