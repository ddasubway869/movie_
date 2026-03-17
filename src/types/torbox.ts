export interface TorboxAPIResponse<T> {
  success: boolean;
  detail: string;
  data: T;
  error?: string;
}

export interface TorboxUser {
  id: number;
  email: string;
  plan: number;
  total_downloaded: number;
  created_at: string;
  is_subscribed: boolean;
  premium_expires_at: string;
  base_email: string;
}

export interface TorboxTorrent {
  id: number;
  hash: string;
  name: string;
  size: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  download_state: string;
  seeds: number;
  peers: number;
  progress: number;
  download_speed: number;
  upload_speed: number;
  files: TorboxFile[];
}

export interface TorboxFile {
  id: number;
  name: string;
  size: number;
  s3_path?: string;
  mime_type?: string;
  short_name?: string;
}

export interface TorboxSearchResult {
  name: string;
  hash: string;
  size: number;
  magnet?: string;
  seeders?: number;
  leechers?: number;
  source?: string;
  quality?: string;
  cached?: boolean;
  last_known_seeders?: number;
  files?: { name: string; size: number }[];
}

export interface TorboxCreateResponse {
  torrent_id: number;
  hash: string;
  name: string;
  auth_id: string;
}
