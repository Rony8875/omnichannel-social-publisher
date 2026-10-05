import { NextResponse } from "next/server";

// Base redirect URI resolver
function getBaseUrl(request: Request): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  }
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function GET(
  request: Request,
  props: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await props.params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "admin_1";

    const baseUrl = getBaseUrl(request);
    const redirectUri = `${baseUrl}/api/auth/callback/${platform}`;
    const state = Buffer.from(JSON.stringify({ userId, platform, t: Date.now() })).toString("base64");

    // 1. WhatsApp -> Handled via Baileys QR Code Engine
    if (platform === "whatsapp") {
      return NextResponse.redirect(new URL(`/oauth/whatsapp?userId=${encodeURIComponent(userId)}`, request.url));
    }

    // 2. Telegram -> Handled via Bot API (BotFather Token & Channel ID)
    if (platform === "telegram") {
      return NextResponse.redirect(new URL(`/oauth/telegram?userId=${encodeURIComponent(userId)}`, request.url));
    }

    // 3. Instagram OAuth via Meta Graph API (Official Buffer/Hootsuite flow)
    if (platform === "instagram") {
      const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID;
      if (!appId) {
        return NextResponse.redirect(
          new URL(`/oauth/instagram?userId=${encodeURIComponent(userId)}&missing_keys=true`, request.url)
        );
      }

      // Meta Dialog OAuth with Instagram permissions
      const scopes = "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement";
      const instaOAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&state=${state}&scope=${encodeURIComponent(scopes)}&response_type=code`;

      return NextResponse.redirect(instaOAuthUrl);
    }

    // 4. Facebook (Meta Graph API OAuth 2.0)
    if (platform === "facebook") {
      const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID;
      if (!appId) {
        return NextResponse.redirect(
          new URL(`/oauth/facebook?userId=${encodeURIComponent(userId)}&missing_keys=true`, request.url)
        );
      }

      const scopes = process.env.META_SCOPES || "public_profile,pages_show_list,pages_read_engagement";

      const metaOAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&state=${state}&scope=${encodeURIComponent(scopes)}&response_type=code`;

      return NextResponse.redirect(metaOAuthUrl);
    }

    // 4. LinkedIn OAuth 2.0
    if (platform === "linkedin") {
      const clientId = process.env.LINKEDIN_CLIENT_ID;
      if (!clientId) {
        return NextResponse.redirect(
          new URL(`/oauth/linkedin?userId=${encodeURIComponent(userId)}&missing_keys=true`, request.url)
        );
      }

      const scopes = "openid profile email w_member_social";
      const linkedInOAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&state=${state}&scope=${encodeURIComponent(scopes)}`;

      return NextResponse.redirect(linkedInOAuthUrl);
    }

    // 5. Twitter / X (OAuth 2.0 with PKCE)
    if (platform === "twitter") {
      const clientId = process.env.TWITTER_CLIENT_ID;
      if (!clientId) {
        return NextResponse.redirect(
          new URL(`/oauth/twitter?userId=${encodeURIComponent(userId)}&missing_keys=true`, request.url)
        );
      }

      const scopes = "tweet.read tweet.write users.read offline.access";
      const twitterOAuthUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&state=${state}&scope=${encodeURIComponent(scopes)}&code_challenge=challenge&code_challenge_method=plain`;

      return NextResponse.redirect(twitterOAuthUrl);
    }

    // Fallback for unknown platform
    return NextResponse.redirect(new URL(`/oauth/${platform}?userId=${encodeURIComponent(userId)}`, request.url));
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
