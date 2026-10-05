export type SocialPlatformId =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "twitter"
  | "whatsapp"
  | "telegram";

export interface ConnectedChannel {
  channelId: string; // e.g. "6ac28a796a5c39ccb61273f6" (Buffer-style)
  userId: string;
  id: SocialPlatformId;
  platform: string;
  name: string;
  handle?: string | null;
  connected: boolean;
  icon?: string | null;
  avatarUrl?: string | null;
  pageId?: string | null;
  accountId?: string | null;
  orgId?: string | null;
  channelIdHandle?: string | null;
  token?: string | null; // Encrypted access token
  refreshToken?: string | null;
  tokenExpiresAt?: string | null;
  scopes?: string[];
  verifiedAt?: string | null;
  updated_at?: string;
  metadata?: Record<string, any>;
}

export interface OAuthStatePayload {
  userId: string;
  platform: SocialPlatformId;
  nonce: string;
  timestamp: number;
}
