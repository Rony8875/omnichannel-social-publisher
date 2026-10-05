import crypto from "crypto";
import { SocialPlatformId, OAuthStatePayload } from "@/types/channel";

export function generateChannelId(): string {
  // Buffer-style 24-char hex channel ID (e.g. 6ac28a796a5c39ccb61273f6)
  return crypto.randomBytes(12).toString("hex");
}

export function encodeOAuthState(payload: OAuthStatePayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeOAuthState(stateStr: string): OAuthStatePayload | null {
  try {
    return JSON.parse(Buffer.from(stateStr, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

/**
 * Builds the official provider OAuth Authorization URL
 */
export function buildOAuthUrl(
  platform: string,
  userId: string,
  redirectUri: string
): { authUrl: string; state: string } {
  const nonce = crypto.randomBytes(16).toString("hex");
  const state = encodeOAuthState({
    userId,
    platform: platform as SocialPlatformId,
    nonce,
    timestamp: Date.now(),
  });

  let authUrl = "";

  if (platform === "facebook") {
    const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || "";
    const scopes = process.env.META_SCOPES || "public_profile,pages_show_list,pages_read_engagement";
    authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${state}&scope=${encodeURIComponent(scopes)}&response_type=code`;
  } else if (platform === "instagram") {
    const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || "";
    // Buffer uses official Instagram Business login authorization
    authUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=instagram_business_basic,instagram_business_content_publish&state=${state}`;
  } else if (platform === "linkedin") {
    const clientId = process.env.LINKEDIN_CLIENT_ID || "";
    const scopes = "openid profile email w_member_social";
    authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${state}&scope=${encodeURIComponent(scopes)}`;
  } else if (platform === "twitter") {
    const clientId = process.env.TWITTER_CLIENT_ID || "";
    const scopes = "tweet.read tweet.write users.read offline.access";
    authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${state}&scope=${encodeURIComponent(scopes)}&code_challenge=challenge&code_challenge_method=plain`;
  }

  return { authUrl, state };
}

/**
 * Exchanges the authorization code for Access Tokens with the platform API
 */
export async function exchangeCodeForTokens(
  platform: string,
  code: string,
  redirectUri: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  name: string;
  handle: string;
  pageId?: string;
  accountId?: string;
}> {
  if (platform === "facebook" || platform === "instagram") {
    const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET;

    // Step 1: Exchange code for Short-Lived User Token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      throw new Error(tokenData.error?.message || "Meta token exchange failed");
    }

    const shortToken = tokenData.access_token;

    // Step 2: Exchange for Long-Lived Token (60 days)
    let longLivedToken = shortToken;
    try {
      const longRes = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
      );
      const longData = await longRes.json();
      if (longData.access_token) longLivedToken = longData.access_token;
    } catch {}

    // Step 3: Fetch linked Facebook Pages & Instagram Business Accounts
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${longLivedToken}`
    );
    const pagesData = await pagesRes.json();

    const firstPage = pagesData.data?.[0];
    if (firstPage) {
      const ig = firstPage.instagram_business_account;
      if (platform === "instagram" && ig) {
        return {
          accessToken: firstPage.access_token || longLivedToken,
          name: ig.username || "Instagram Account",
          handle: `@${ig.username}`,
          pageId: firstPage.id,
          accountId: ig.id,
        };
      }
      return {
        accessToken: firstPage.access_token || longLivedToken,
        name: firstPage.name,
        handle: firstPage.name,
        pageId: firstPage.id,
      };
    }

    return {
      accessToken: longLivedToken,
      name: "Meta Profile",
      handle: "profile",
    };
  }

  if (platform === "linkedin") {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId || "",
        client_secret: clientSecret || "",
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      throw new Error(tokenData.error_description || "LinkedIn token exchange failed");
    }

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      name: "LinkedIn Member",
      handle: "in_member",
    };
  }

  throw new Error(`Platform ${platform} token exchange not supported`);
}
