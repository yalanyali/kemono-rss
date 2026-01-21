// Kemono API Response Types

export interface KemonoCreator {
  id: string;
  name: string;
  service: string;
  indexed: string;
  updated: string;
  public_id: string;
}

export interface KemonoCreatorProfile {
  id: string;
  name: string;
  service: string;
  indexed: string;
  updated: string;
  public_id: string;
  relation_id: number;
}

export interface KemonoAttachment {
  name: string;
  path: string;
}

export interface KemonoFile {
  name: string;
  path: string;
}

export interface KemonoEmbed {
  url?: string;
  subject?: string;
  description?: string;
}

export interface KemonoPost {
  id: string;
  user: string;
  service: string;
  title: string;
  content?: string;
  substring?: string; // API returns this instead of full content
  embed?: KemonoEmbed;
  shared_file?: boolean;
  added?: string;
  published: string;
  edited?: string | null;
  file?: KemonoFile | null;
  attachments: KemonoAttachment[];
}

// RSS Feed Types

export interface PodcastChannel {
  title: string;
  link: string;
  description: string;
  language: string;
  author: string;
  imageUrl: string;
  items: PodcastItem[];
}

export interface PodcastItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  guid: string;
  enclosure?: {
    url: string;
    type: string;
    length: number;
  };
}

// Audio file extensions we'll treat as podcast episodes
export const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.ogg', '.aac', '.flac'];

export function isAudioFile(filename: string | null | undefined): boolean {
  if (!filename) return false;
  const lower = filename.toLowerCase();
  return AUDIO_EXTENSIONS.some(ext => lower.endsWith(ext));
}

export function getMimeType(filename: string | null | undefined): string {
  if (!filename) return 'audio/mpeg';
  const lower = filename.toLowerCase();
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  if (lower.endsWith('.aac')) return 'audio/aac';
  if (lower.endsWith('.flac')) return 'audio/flac';
  return 'audio/mpeg';
}
