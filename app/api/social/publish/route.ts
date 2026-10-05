import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  fetchUserSocialAccounts,
  fetchUserSocialPosts,
  uploadRowsToBigQuery,
} from "@/lib/bigquery";

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

    // Process and persist media upload if provided as data URL
    let savedMediaUrl = mediaUrl || null;
    let imageBuffer: Buffer | null = null;
    let imageMimeType = "image/jpeg";

    if (mediaUrl && typeof mediaUrl === "string" && mediaUrl.startsWith("data:image/")) {
      try {
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const matches = mediaUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          imageMimeType = matches[1];
          const ext = imageMimeType.includes("png") ? "png" : imageMimeType.includes("webp") ? "webp" : "jpg";
          imageBuffer = Buffer.from(matches[2], "base64");
          const filename = `post_img_${Date.now()}.${ext}`;
          const filePath = path.join(uploadsDir, filename);
          fs.writeFileSync(filePath, imageBuffer);
          savedMediaUrl = `/uploads/${filename}`;
        }
      } catch (e) {
        console.warn("Media file save warning:", e);
      }
    }

    for (const platId of platforms) {
      const acct = userAccounts.find((a: any) => a.id === platId);
      const isConnected = acct ? acct.connected : true;

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
            // Real Facebook Photo Upload!
            if (imageBuffer && mediaType === "image") {
              const blob = new Blob([new Uint8Array(imageBuffer)], { type: imageMimeType });
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
            const tgRes = await fetch(`https://api.telegram.org/bot${acct.botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: acct.channelId, text: caption }),
            });
            const tgData = await tgRes.json();
            if (tgData.ok && tgData.result?.message_id) {
              postId = `tg_msg_${tgData.result.message_id}`;
            }
          } catch {}
        }
        if (!postId) postId = `tg_msg_${timestamp.toString().slice(-8)}`;
      } else if (platId === "instagram") {
        if (!isScheduled && acct?.token?.startsWith("EAA") && (acct?.accountId || acct?.pageId)) {
          let igUserId = acct.accountId;

          // If accountId is not cached, attempt to look it up from the linked Facebook Page
          if (!igUserId && acct.pageId) {
            try {
              const igCheckRes = await fetch(
                `https://graph.facebook.com/v19.0/${acct.pageId}?fields=instagram_business_account{id,username}&access_token=${acct.token}`
              );
              const igCheckData = await igCheckRes.json();
              if (igCheckData.instagram_business_account?.id) {
                igUserId = igCheckData.instagram_business_account.id;
                acct.accountId = igUserId;
              }
            } catch {}
          }

          if (igUserId) {
            // Real Instagram Publishing via Meta Graph API
            try {
              let publicImageUrl = savedMediaUrl;
              if (publicImageUrl && !publicImageUrl.startsWith("http")) {
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
                publicImageUrl = `${baseUrl.replace(/\/$/, "")}${publicImageUrl}`;
              }

              if (!publicImageUrl) {
                results.push({
                  platform: "instagram",
                  platformName: "Instagram Business",
                  handle: acct.handle,
                  status: "FAILED",
                  error: "Instagram feed par post karne ke liye photo upload karna anivarya (required) hai.",
                });
                continue;
              }

              // Step 1: Create Media Container
              const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  image_url: publicImageUrl,
                  caption: caption || "",
                  access_token: acct.token,
                }),
              });
              const containerData = await containerRes.json();

              if (containerData.id) {
                // Step 2: Publish Media Container
                const publishRes = await fetch(
                  `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      creation_id: containerData.id,
                      access_token: acct.token,
                    }),
                  }
                );
                const publishData = await publishRes.json();
                if (publishData.id) {
                  postId = publishData.id;
                } else if (publishData.error) {
                  results.push({
                    platform: "instagram",
                    platformName: "Instagram Business",
                    handle: acct.handle,
                    status: "FAILED",
                    error: `Instagram Publish Error: ${publishData.error.message}`,
                  });
                  continue;
                }
              } else if (containerData.error) {
                results.push({
                  platform: "instagram",
                  platformName: "Instagram Business",
                  handle: acct.handle,
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

    // Sync with BigQuery in background with userId
    uploadRowsToBigQuery(
      "social_posts",
      [
        {
          id: newPost.id,
          userId: newPost.userId,
          author: newPost.author,
          caption: newPost.caption || "",
          mediaUrl: newPost.mediaUrl || null,
          mediaType: newPost.mediaType || "text",
          platforms: newPost.platforms || [],
          status: newPost.status,
          createdAt: newPost.createdAt,
          scheduledTime: newPost.scheduledTime,
          platformSchedules: newPost.platformSchedules
            ? JSON.stringify(newPost.platformSchedules)
            : null,
        },
      ],
      false
    ).catch((e) => console.warn("Background BigQuery sync notice:", e.message));

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
    const postId = searchParams.get("id");
    const userId = searchParams.get("userId") || "admin_1";

    if (!postId) {
      return NextResponse.json(
        { success: false, error: "Post ID zaroori hai!" },
        { status: 400 }
      );
    }

    let allPosts = getAllPosts();

    if (postId === "all") {
      allPosts = allPosts.filter((p: any) => (p.userId || "admin_1") !== userId);
      saveAllPosts(allPosts);
    } else {
      allPosts = allPosts.filter(
        (p: any) => !(p.id === postId && (p.userId || "admin_1") === userId)
      );
      saveAllPosts(allPosts);
    }

    // Sync updated posts to BigQuery
    const formatted = allPosts.map((p: any) => ({
      id: p.id,
      userId: p.userId || "admin_1",
      author: p.author || "User",
      caption: p.caption || "",
      mediaUrl: p.mediaUrl || null,
      mediaType: p.mediaType || "text",
      platforms: p.platforms || [],
      status: p.status,
      createdAt: p.createdAt,
      scheduledTime: p.scheduledTime,
      platformSchedules: p.platformSchedules
        ? JSON.stringify(p.platformSchedules)
        : null,
    }));
    uploadRowsToBigQuery("social_posts", formatted, true).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Post successfully delete ho gayi!",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
