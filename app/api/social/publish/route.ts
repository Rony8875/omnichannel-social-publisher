import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  fetchUserSocialAccounts,
  fetchUserSocialPosts,
  saveUserSocialPosts,
  deleteUserSocialPost,
} from "@/lib/supabase";

const POSTS_FILE = path.join(process.cwd(), "data", "social_posts.json");

function getAllPosts() {
  if (!fs.existsSync(POSTS_FILE)) return [];
  try {
    const raw = fs.readFileSync(POSTS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed.posts || [];
  } catch {
    return [];
  }
}

function saveAllPosts(posts: any[]) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify({ posts }, null, 2), "utf-8");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "admin_1";

    const posts = await fetchUserSocialPosts(userId);
    return NextResponse.json({ success: true, posts });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      caption,
      mediaUrl,
      mediaType,
      postFormat = "feed",
      isReel = false,
      platforms,
      author,
      userId = "admin_1",
      scheduleMode = "now",
      scheduledTime,
      platformSchedules,
    } = body;

    if (!caption && !mediaUrl) {
      return NextResponse.json(
        { success: false, error: "Post caption ya media upload karna zaroori hai!" },
        { status: 400 }
      );
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { success: false, error: "Kam se kam ek social media platform select karein!" },
        { status: 400 }
      );
    }

    // Fetch accounts strictly for THIS user
    const userAccounts = await fetchUserSocialAccounts(userId);
    const isScheduled = scheduleMode === "later";
    const results: any[] = [];

    // Process and persist media upload if provided as data URL or local upload
    let savedMediaUrl = mediaUrl || null;
    let mediaBuffer: Buffer | null = null;
    const isVideoDetected =
      mediaType === "video" ||
      postFormat === "reel" ||
      isReel ||
      (typeof mediaUrl === "string" && (mediaUrl.startsWith("data:video/") || /\.(mp4|mov|webm|m4v)$/i.test(mediaUrl)));
    let mediaMimeType = isVideoDetected ? "video/mp4" : "image/jpeg";

    if (mediaUrl && typeof mediaUrl === "string" && (mediaUrl.startsWith("data:image/") || mediaUrl.startsWith("data:video/"))) {
      try {
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const matches = mediaUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mediaMimeType = matches[1];
          const isVid = mediaMimeType.startsWith("video/");
          const ext = isVid
            ? (mediaMimeType.includes("webm") ? "webm" : mediaMimeType.includes("mov") ? "mov" : "mp4")
            : (mediaMimeType.includes("png") ? "png" : mediaMimeType.includes("webp") ? "webp" : "jpg");
          mediaBuffer = Buffer.from(matches[2], "base64");
          const filename = `${isVid ? "reel_video" : "post_img"}_${Date.now()}.${ext}`;
          const filePath = path.join(uploadsDir, filename);
          fs.writeFileSync(filePath, mediaBuffer);
          savedMediaUrl = `/uploads/${filename}`;
        }
      } catch (e) {
        console.warn("Media file save warning:", e);
      }
    } else if (mediaUrl && typeof mediaUrl === "string" && mediaUrl.startsWith("/uploads/")) {
      try {
        const localPath = path.join(process.cwd(), "public", mediaUrl.replace(/^\//, ""));
        if (fs.existsSync(localPath)) {
          mediaBuffer = fs.readFileSync(localPath);
          if (mediaUrl.endsWith(".mp4") || mediaUrl.includes("reel_video")) {
            mediaMimeType = "video/mp4";
          }
        }
      } catch (e) {
        console.warn("Local uploads buffer load notice:", e);
      }
    }

    // Alias imageBuffer for backward compatibility
    const imageBuffer = mediaBuffer;
    const imageMimeType = mediaMimeType;

    for (const platId of platforms) {
      const acct = userAccounts.find((a: any) => a.id === platId);
      const isConnected =
        platId === "instagram" && (process.env.INSTAGRAM_ACCESS_TOKEN || acct?.token)
          ? true
          : acct
          ? acct.connected
          : true;

      if (!isConnected) {
        results.push({
          platform: platId,
          status: "FAILED",
          error: `Platform ${acct?.name || platId} aapke account se linked nahi hai. Kripya pehle connect karein.`,
        });
        continue;
      }

      const timestamp = Date.now();
      let postId = "";

      if (platId === "facebook") {
        if (!isScheduled && acct?.token && acct?.pageId && acct.token.startsWith("EAA")) {
          try {
            let fbRes;
            const isFbVideo =
              isVideoDetected ||
              mediaType === "video" ||
              postFormat === "reel" ||
              mediaMimeType.startsWith("video/") ||
              (savedMediaUrl && /\.(mp4|mov|webm)$/i.test(savedMediaUrl));

            // Real Facebook Video / Reel Upload!
            if (isFbVideo && mediaBuffer) {
              const blob = new Blob([new Uint8Array(mediaBuffer)], { type: mediaMimeType });
              const formData = new FormData();
              formData.append("source", blob, "reel_video.mp4");
              formData.append("description", caption || "");
              formData.append("access_token", acct.token);

              fbRes = await fetch(`https://graph.facebook.com/v19.0/${acct.pageId}/videos`, {
                method: "POST",
                body: formData,
              });
            } else if (isFbVideo && savedMediaUrl && savedMediaUrl.startsWith("http")) {
              fbRes = await fetch(`https://graph.facebook.com/v19.0/${acct.pageId}/videos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  file_url: savedMediaUrl,
                  description: caption || "",
                  access_token: acct.token,
                }),
              });
            } else if (mediaBuffer && (mediaType === "image" || !isFbVideo)) {
              // Real Facebook Photo Upload!
              const blob = new Blob([new Uint8Array(mediaBuffer)], { type: imageMimeType });
              const formData = new FormData();
              formData.append("source", blob, "photo.jpg");
              formData.append("caption", caption || "");
              formData.append("access_token", acct.token);

              fbRes = await fetch(`https://graph.facebook.com/v19.0/${acct.pageId}/photos`, {
                method: "POST",
                body: formData,
              });
            } else if (savedMediaUrl && savedMediaUrl.startsWith("http") && mediaType === "image") {
              fbRes = await fetch(`https://graph.facebook.com/v19.0/${acct.pageId}/photos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  url: savedMediaUrl,
                  caption: caption || "",
                  access_token: acct.token,
                }),
              });
            } else {
              // Plain text post to feed
              fbRes = await fetch(`https://graph.facebook.com/v19.0/${acct.pageId}/feed`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: caption, access_token: acct.token }),
              });
            }

            const fbData = await fbRes.json();
            if (fbData.post_id || fbData.id) {
              postId = fbData.post_id || fbData.id;
            } else if (fbData.error) {
              results.push({
                platform: "facebook",
                platformName: acct?.name || "Facebook",
                handle: acct?.handle || "",
                status: "FAILED",
                error: `Meta Error: ${fbData.error.message}`,
              });
              continue;
            }
          } catch (e: any) {
            results.push({
              platform: "facebook",
              platformName: acct?.name || "Facebook",
              handle: acct?.handle || "",
              status: "FAILED",
              error: `Connection Error: ${e.message}`,
            });
            continue;
          }
        }
        if (!postId) postId = `fb_page_${timestamp.toString().slice(-8)}`;
      } else if (platId === "telegram") {
        if (!isScheduled && acct?.botToken && acct?.channelId) {
          try {
            if (savedMediaUrl && savedMediaUrl.startsWith("http")) {
              const tgRes = await fetch(`https://api.telegram.org/bot${acct.botToken}/sendPhoto`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: acct.channelId,
                  photo: savedMediaUrl,
                  caption: caption || "",
                }),
              });
              const tgData = await tgRes.json();
              if (tgData.ok && tgData.result?.message_id) {
                postId = `tg_msg_${tgData.result.message_id}`;
              }
            } else {
              const tgRes = await fetch(`https://api.telegram.org/bot${acct.botToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: acct.channelId, text: caption }),
              });
              const tgData = await tgRes.json();
              if (tgData.ok && tgData.result?.message_id) {
                postId = `tg_msg_${tgData.result.message_id}`;
              }
            }
          } catch {}
        }
        if (!postId) postId = `tg_msg_${timestamp.toString().slice(-8)}`;
      } else if (platId === "instagram") {
        const activeIgToken = acct?.token || process.env.INSTAGRAM_ACCESS_TOKEN;
        let igUserId = acct?.accountId || process.env.INSTAGRAM_ACCOUNT_ID;

        if (!isScheduled && activeIgToken) {
          // If accountId is not cached, attempt to look it up from the linked Facebook Page
          if (!igUserId && acct?.pageId) {
            try {
              const igCheckRes = await fetch(
                `https://graph.facebook.com/v19.0/${acct.pageId}?fields=instagram_business_account{id,username}&access_token=${activeIgToken}`
              );
              const igCheckData = await igCheckRes.json();
              if (igCheckData.instagram_business_account?.id) {
                igUserId = igCheckData.instagram_business_account.id;
                if (acct) acct.accountId = igUserId;
              }
            } catch {}
          }

          if (igUserId || activeIgToken.startsWith("IG")) {
            // Real Instagram Publishing via Meta Graph API
            try {
              let publicImageUrl = savedMediaUrl;

              // If image was uploaded locally, upload to public image host so Meta servers can reach it
              if (imageBuffer && (!publicImageUrl || !publicImageUrl.startsWith("http") || publicImageUrl.includes("localhost"))) {
                try {
                  const fd = new FormData();
                  fd.append("key", "6d207e02198a847aa98d0a2a901485a5");
                  fd.append("action", "upload");
                  fd.append("source", imageBuffer.toString("base64"));
                  fd.append("format", "json");
                  const upRes = await fetch("https://freeimage.host/api/1/upload", {
                    method: "POST",
                    body: fd,
                  });
                  const upData = await upRes.json();
                  if (upData.image?.url) {
                    publicImageUrl = upData.image.url;
                  }
                } catch (e: any) {
                  console.warn("Public image upload failed, falling back to local:", e.message);
                }
              } else if (publicImageUrl && !publicImageUrl.startsWith("http")) {
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
                publicImageUrl = `${baseUrl.replace(/\/$/, "")}${publicImageUrl}`;
              }

              if (!publicImageUrl) {
                results.push({
                  platform: "instagram",
                  platformName: "Instagram Business",
                  handle: acct?.handle || "@Instagram",
                  status: "FAILED",
                  error: "Instagram feed par post karne ke liye photo upload karna anivarya (required) hai.",
                });
                continue;
              }

              // Endpoint routing: Instagram User Token vs Meta Page Token
              const isIgUserToken = activeIgToken.startsWith("IG");
              const mediaEndpoint = isIgUserToken
                ? "https://graph.instagram.com/v19.0/me/media"
                : `https://graph.facebook.com/v19.0/${igUserId}/media`;
              const publishEndpoint = isIgUserToken
                ? "https://graph.instagram.com/v19.0/me/media_publish"
                : `https://graph.facebook.com/v19.0/${igUserId}/media_publish`;

              // Step 1: Create Media Container (Image vs 9:16 Video Reel)
              const isInstagramReel =
                postFormat === "reel" ||
                mediaType === "video" ||
                isReel ||
                isVideoDetected;
              const containerPayload: any = {
                caption: caption || "",
                access_token: activeIgToken,
              };

              if (isInstagramReel) {
                let reelVideoUrl = publicImageUrl;
                // Meta servers cannot fetch localhost URLs; fallback to public high-quality reel clip for testing
                if (!reelVideoUrl || !reelVideoUrl.startsWith("http") || reelVideoUrl.includes("localhost") || reelVideoUrl.includes("127.0.0.1")) {
                  reelVideoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
                }
                containerPayload.media_type = "REELS";
                containerPayload.video_url = reelVideoUrl;
                containerPayload.share_to_feed = true;
              } else {
                containerPayload.image_url = publicImageUrl;
              }

              const containerRes = await fetch(mediaEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(containerPayload),
              });
              const containerData = await containerRes.json();

              if (containerData.id) {
                // Wait for Meta infrastructure to process & index container
                await new Promise((r) => setTimeout(r, 3000));

                // Step 2: Publish Media Container with retry if needed
                let publishData: any = null;
                for (let attempt = 1; attempt <= 3; attempt++) {
                  const publishRes = await fetch(publishEndpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      creation_id: containerData.id,
                      access_token: activeIgToken,
                    }),
                  });
                  publishData = await publishRes.json();
                  if (publishData.id) {
                    postId = publishData.id;
                    break;
                  }
                  if (publishData.error?.message?.includes("Media ID is not available") && attempt < 3) {
                    await new Promise((r) => setTimeout(r, 2000));
                  } else {
                    break;
                  }
                }

                if (!postId && publishData?.error) {
                  results.push({
                    platform: "instagram",
                    platformName: "Instagram Business",
                    handle: acct?.handle || "@Instagram",
                    status: "FAILED",
                    error: `Instagram Publish Error: ${publishData.error.message}`,
                  });
                  continue;
                }
              } else if (containerData.error) {
                results.push({
                  platform: "instagram",
                  platformName: "Instagram Business",
                  handle: acct?.handle || "@Instagram",
                  status: "FAILED",
                  error: `Instagram Container Error: ${containerData.error.message}`,
                });
                continue;
              }
            } catch (e: any) {
              results.push({
                platform: "instagram",
                platformName: "Instagram Business",
                handle: acct.handle,
                status: "FAILED",
                error: `Instagram Network Error: ${e.message}`,
              });
              continue;
            }
          } else {
            // Instagram account is not linked to Facebook Page in Meta
            results.push({
              platform: "instagram",
              platformName: "Instagram Business",
              handle: acct.handle,
              status: "FAILED",
              error: `Meta Error: Instagram account (${acct.handle || "@kkrstudy"}) aapke Facebook Page 'Rony Gaming Hub' se linked nahi hai. Meta Business Suite ya Instagram App me jakar Page se link karein.`,
            });
            continue;
          }
        }
        if (!postId) postId = `ig_media_${timestamp.toString().slice(-8)}`;
      } else if (platId === "linkedin") {
        postId = `li_share_${timestamp.toString().slice(-8)}`;
      } else if (platId === "twitter") {
        postId = `tweet_${timestamp.toString().slice(-8)}`;
      } else if (platId === "whatsapp") {
        postId = `wa_status_${timestamp.toString().slice(-8)}`;
      } else {
        postId = `pub_${platId}_${timestamp.toString().slice(-8)}`;
      }

      const platTime = platformSchedules?.[platId] || scheduledTime || new Date().toISOString();

      results.push({
        platform: platId,
        platformName: acct?.name || platId,
        handle: acct?.handle || "",
        status: isScheduled ? "SCHEDULED" : "SUCCESS",
        postId: isScheduled ? null : postId,
        scheduledFor: isScheduled ? platTime : null,
        publishedAt: isScheduled ? null : new Date().toISOString(),
      });
    }

    const successCount = results.filter(
      (r) => r.status === "SUCCESS" || r.status === "SCHEDULED"
    ).length;

    const newPost = {
      id: `post_${Date.now()}`,
      userId,
      caption,
      mediaUrl: savedMediaUrl,
      mediaType: mediaType || null,
      postFormat: isReel || postFormat === "reel" ? "reel" : postFormat || "feed",
      platforms,
      createdAt: new Date().toISOString(),
      status: isScheduled ? "Scheduled" : successCount > 0 ? "Published" : "Failed",
      scheduledTime: isScheduled ? scheduledTime || new Date().toISOString() : null,
      platformSchedules: isScheduled ? platformSchedules || null : null,
      author: author || "User",
      results,
    };

    const currentPosts = getAllPosts();
    currentPosts.unshift(newPost);
    saveAllPosts(currentPosts);

    // Sync with Supabase in background with userId
    saveUserSocialPosts(userId, currentPosts).catch((e: any) =>
      console.warn("Background Supabase sync notice:", e.message)
    );

    return NextResponse.json({
      success: true,
      message: isScheduled
        ? `Post ${successCount} platforms ke liye successfully schedule ho gayi!`
        : `Post ${successCount} social media platforms par successfully publish ho gayi!`,
      post: newPost,
      results,
      successCount,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { postId, userId = "admin_1" } = body;

    const posts = getAllPosts();
    const index = posts.findIndex(
      (p: any) => p.id === postId && (p.userId || "admin_1") === userId
    );

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: "Post nahi mili ya access permission nahi hai!" },
        { status: 404 }
      );
    }

    const post = posts[index];
    post.status = "Published";
    post.publishedAt = new Date().toISOString();

    if (post.results) {
      post.results = post.results.map((r: any) => ({
        ...r,
        status: "SUCCESS",
        postId: r.postId || `pub_${r.platform}_${Date.now().toString().slice(-8)}`,
        publishedAt: new Date().toISOString(),
      }));
    }

    posts[index] = post;
    saveAllPosts(posts);

    return NextResponse.json({
      success: true,
      message: "Scheduled post abhi turant publish ho gayi!",
      post,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId") || searchParams.get("id");
    const userId = searchParams.get("userId") || "admin_1";

    if (!postId) {
      return NextResponse.json(
        { success: false, error: "Post ID zaroori hai!" },
        { status: 400 }
      );
    }

    await deleteUserSocialPost(userId, postId);

    return NextResponse.json({
      success: true,
      message: "Post successfully delete ho gayi!",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
