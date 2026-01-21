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
  const res = await fetch(url, { headers: HEADERS });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch creator profile: ${res.status} ${res.statusText}`);
  }
  
  return res.json();
}

export async function fetchCreatorPosts(
  service: string,
  creatorId: string
): Promise<KemonoPost[]> {
  const url = `${BASE_URL}/${service}/user/${creatorId}/posts`;
  const res = await fetch(url, { headers: HEADERS });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch creator posts: ${res.status} ${res.statusText}`);
  }
  
  return res.json();
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
