
export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface UserProfile {
  pubkey: string;
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  nip05?: string;
  lastActive?: number;
}

export interface FeedPost extends NostrEvent {
  user?: UserProfile;
}

export interface ChatMessage {
  id: string;
  senderPubkey: string;
  content: string;
  timestamp: number;
  type?: 'text' | 'image' | 'audio';
  mediaUrl?: string;
}

export interface Report {
  id: string;
  reporterPubkey: string;
  reportedPubkey: string;
  timestamp: number;
  chatHistory: ChatMessage[];
  reason: string;
}

export enum AppRoute {
  DISCOVER = 'discover',
  CHAT = 'chat',
  PROFILE = 'profile',
  ADMIN = 'admin',
}
