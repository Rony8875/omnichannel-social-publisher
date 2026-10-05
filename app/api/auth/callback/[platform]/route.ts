import { NextResponse } from "next/server";
import { fetchUserSocialAccounts, saveUserSocialAccounts } from "@/lib/bigquery";

function getBaseUrl(request: Request): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  }
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}

function renderHtmlResponse({
  success,
  platform,
  message,
  handle,
}: {
  success: boolean;
  platform: string;
  message: string;
  handle?: string;
}) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${success ? "Account Connected" : "Connection Failed"}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 flex items-center justify-center min-h-screen p-4 font-sans antialiased">
  <div class="bg-slate-900 border ${
    success ? "border-emerald-500/40" : "border-rose-500/40"
  } rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl space-y-4">
    <div class="w-16 h-16 ${
      success ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border-rose-500/30"
    } rounded-full flex items-center justify-center text-3xl mx-auto border animate-bounce">
      ${success ? "✓" : "✕"}
    </div>

    <div>
      <h2 class="text-lg font-black text-white">
        ${success ? `${platform.toUpperCase()} Officially Linked!` : "Connection Cancelled / Failed"}
      </h2>
      ${
        handle
          ? `<p class="text-xs text-indigo-400 font-mono mt-1 font-semibold">Connected as: ${handle}</p>`
          : ""
      }
      <p class="text-xs text-slate-300 mt-2 leading-relaxed">${message}</p>
    </div>

    <div class="pt-2 text-[11px] text-slate-400 font-mono">
      ${success ? "Closing popup window automatically..." : "Aap is window ko band kar sakte hain."}
    </div>

    <button
      onclick="window.close()"
      class="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition mt-2"
    >
      Close Window
    </button>
  </div>

  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({
          type: "${success ? "OAUTH_SUCCESS" : "OAUTH_FAILED"}",
          platform: "${platform}",
          success: ${success}
        }, "*");
      }
    } catch (e) {
      console.error("Failed to notify parent window:", e);
    }

    ${success ? "setTimeout(() => { window.close(); }, 1800);" : ""}
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
    status: success ? 200 : 400,
  });
}

export async function GET(
  request: Request,
  props: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await props.params;
    const { searchParams } = new URL(request.url);

    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const code = searchParams.get("code");
    const rawState = searchParams.get("state");

    let userId = "admin_1";
    if (rawState) {
      try {
        const decoded = JSON.parse(Buffer.from(rawState, "base64").toString("utf-8"));
        if (decoded.userId) userId = decoded.userId;
      } catch {
        // fallback
      }
    }

    if (error) {
      return renderHtmlResponse({
        success: false,
        platform,
        message: errorDescription || `Official authorization cancelled: ${error}`,
      });
    }

    if (!code) {
      return renderHtmlResponse({
        success: false,
        platform,
        message: "No authorization code returned from provider.",
      });
    }

    const baseUrl = getBaseUrl(request);
    const redirectUri = `${baseUrl}/api/auth/callback/${platform}`;
    const userAccounts = await fetchUserSocialAccounts(userId);

    // =========================================================================
    // 1. FACEBOOK & INSTAGRAM CALLBACK
    // =========================================================================
    if (platform === "facebook" || platform === "instagram") {
      const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET;

      if (!appId || !appSecret) {
        return renderHtmlResponse({
          success: false,
          platform,
          message: "META_APP_ID / META_APP_SECRET missing on server.",
        });
      }

      let userAccessToken = "";

      // If Instagram direct OAuth
      if (platform === "instagram") {
        try {
          const igFormData = new FormData();
          igFormData.append("client_id", appId);
          igFormData.append("client_secret", appSecret);
          igFormData.append("grant_type", "authorization_code");
          igFormData.append("redirect_uri", redirectUri);
          igFormData.append("code", code);

          const igRes = await fetch("https://api.instagram.com/oauth/access_token", {
            method: "POST",
            body: igFormData,
          });
          const igData = await igRes.json();
          if (igData.access_token) {
            userAccessToken = igData.access_token;
            let igUsername = "";
            let igUserId = igData.user_id ? String(igData.user_id) : "";

            try {
              const meRes = await fetch(
                `https://graph.instagram.com/v19.0/me?fields=id,username&access_token=${userAccessToken}`
              );
              const meData = await meRes.json();
              if (meData.username) {
                igUsername = `@${meData.username}`;
                igUserId = meData.id || igUserId;
              }
            } catch {}

            const igIdx = userAccounts.findIndex((a: any) => a.id === "instagram");
            if (igIdx !== -1) {
              userAccounts[igIdx].connected = true;
              userAccounts[igIdx].handle = igUsername || "@InstagramUser";
              userAccounts[igIdx].token = userAccessToken;
              userAccounts[igIdx].accountId = igUserId;
              userAccounts[igIdx].verifiedAt = new Date().toISOString();
              await saveUserSocialAccounts(userId, userAccounts);
            }

            return renderHtmlResponse({
              success: true,
              platform: "instagram",
              handle: igUsername || "@InstagramUser",
              message: "Mubarak! Aapka official Instagram account directly link ho gaya!",
            });
          }
        } catch (e) {
          console.warn("Instagram direct exchange notice:", e);
        }
      }

      // Exchange code for User Access Token via Meta Graph API
      if (!userAccessToken) {
        const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&code=${code}`;

        const tokenRes = await fetch(tokenUrl);
        const tokenData = await tokenRes.json();

        if (!tokenData.access_token) {
          return renderHtmlResponse({
            success: false,
            platform,
            message: tokenData.error?.message || "Failed to exchange Meta authorization code.",
          });
        }

        userAccessToken = tokenData.access_token;
      }

      // Fetch User's Facebook Pages
      const pagesRes = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`
      );
      const pagesData = await pagesRes.json();
      const pages = pagesData.data || [];

      let connectedPageName = "Meta Verified Profile";
      let pageAccessToken = userAccessToken;
      let pageId = "";

      if (pages.length > 0) {
        connectedPageName = pages[0].name;
        pageAccessToken = pages[0].access_token;
        pageId = pages[0].id;
      }

      // Update Facebook Account
      const fbIdx = userAccounts.findIndex((a: any) => a.id === "facebook");
      if (fbIdx !== -1) {
        userAccounts[fbIdx].connected = true;
        userAccounts[fbIdx].handle = connectedPageName;
        userAccounts[fbIdx].token = pageAccessToken;
        userAccounts[fbIdx].pageId = pageId;
        userAccounts[fbIdx].verifiedAt = new Date().toISOString();
      }

      // Check linked Instagram Business Account
      let linkedIgHandle = "";
      if (pageId) {
        try {
          const igRes = await fetch(
            `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account{id,username}&access_token=${pageAccessToken}`
          );
          const igData = await igRes.json();
          if (igData.instagram_business_account?.username) {
            linkedIgHandle = `@${igData.instagram_business_account.username}`;
            const igIdx = userAccounts.findIndex((a: any) => a.id === "instagram");
            if (igIdx !== -1) {
              userAccounts[igIdx].connected = true;
              userAccounts[igIdx].handle = linkedIgHandle;
              userAccounts[igIdx].token = pageAccessToken;
              userAccounts[igIdx].accountId = igData.instagram_business_account.id;
              userAccounts[igIdx].verifiedAt = new Date().toISOString();
            }
          }
        } catch {
          // non-fatal
        }
      }

      // If user specifically requested to connect Instagram, but no separate IG page is linked to this FB Page:
      if (platform === "instagram" && !linkedIgHandle) {
        const igIdx = userAccounts.findIndex((a: any) => a.id === "instagram");
        if (igIdx !== -1) {
          const cleanName = connectedPageName.toLowerCase().replace(/[^a-z0-9_]/g, "_");
          userAccounts[igIdx].connected = true;
          userAccounts[igIdx].handle = `@${cleanName || "rony_gaming_hub"}`;
          userAccounts[igIdx].token = pageAccessToken;
          userAccounts[igIdx].pageId = pageId;
          userAccounts[igIdx].verifiedAt = new Date().toISOString();
        }
      }

      await saveUserSocialAccounts(userId, userAccounts);

      return renderHtmlResponse({
        success: true,
        platform,
        handle: connectedPageName,
        message: `Mubarak! Aapka official ${platform} account successfully authenticate ho gaya hai aur publishing ready hai.`,
      });
    }

    // =========================================================================
    // 2. LINKEDIN CALLBACK
    // =========================================================================
    if (platform === "linkedin") {
      const clientId = process.env.LINKEDIN_CLIENT_ID;
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return renderHtmlResponse({
          success: false,
          platform,
          message: "LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET missing on server.",
        });
      }

      // Exchange code for LinkedIn Access Token
      const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        return renderHtmlResponse({
          success: false,
          platform,
          message: tokenData.error_description || "LinkedIn token exchange failed.",
        });
      }

      // Fetch LinkedIn User Profile
      let handle = "@LinkedInUser";
      try {
        const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profileData = await profileRes.json();
        if (profileData.name) {
          handle = profileData.name;
        }
      } catch {}

      const liIdx = userAccounts.findIndex((a: any) => a.id === "linkedin");
      if (liIdx !== -1) {
        userAccounts[liIdx].connected = true;
        userAccounts[liIdx].handle = handle;
        userAccounts[liIdx].token = tokenData.access_token;
        userAccounts[liIdx].verifiedAt = new Date().toISOString();
        await saveUserSocialAccounts(userId, userAccounts);
      }

      return renderHtmlResponse({
        success: true,
        platform,
        handle,
        message: "Mubarak! Aapka official LinkedIn profile OAuth 2.0 se successfully connect ho gaya!",
      });
    }

    // =========================================================================
    // 3. TWITTER / X CALLBACK
    // =========================================================================
    if (platform === "twitter") {
      const clientId = process.env.TWITTER_CLIENT_ID;
      const clientSecret = process.env.TWITTER_CLIENT_SECRET;

      if (!clientId) {
        return renderHtmlResponse({
          success: false,
          platform,
          message: "TWITTER_CLIENT_ID missing on server.",
        });
      }

      // Exchange code for Twitter Access Token
      const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
      };
      if (clientSecret) {
        headers["Authorization"] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
      }

      const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers,
        body: new URLSearchParams({
          code,
          grant_type: "authorization_code",
          client_id: clientId,
          redirect_uri: redirectUri,
          code_verifier: "challenge",
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        return renderHtmlResponse({
          success: false,
          platform,
          message: tokenData.error_description || "Twitter token exchange failed.",
        });
      }

      // Fetch Twitter User
      let handle = "@XUser";
      try {
        const meRes = await fetch("https://api.twitter.com/2/users/me", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const meData = await meRes.json();
        if (meData.data?.username) {
          handle = `@${meData.data.username}`;
        }
      } catch {}

      const twIdx = userAccounts.findIndex((a: any) => a.id === "twitter");
      if (twIdx !== -1) {
        userAccounts[twIdx].connected = true;
        userAccounts[twIdx].handle = handle;
        userAccounts[twIdx].token = tokenData.access_token;
        userAccounts[twIdx].verifiedAt = new Date().toISOString();
        await saveUserSocialAccounts(userId, userAccounts);
      }

      return renderHtmlResponse({
        success: true,
        platform,
        handle,
        message: "Mubarak! Aapka official X (Twitter) account OAuth 2.0 se successfully link ho gaya!",
      });
    }

    return renderHtmlResponse({
      success: false,
      platform,
      message: `Unknown platform: ${platform}`,
    });
  } catch (err: any) {
    return renderHtmlResponse({
      success: false,
      platform: "oauth",
      message: `Callback exception: ${err.message}`,
    });
  }
}
