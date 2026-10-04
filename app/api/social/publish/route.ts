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
      if (platId === "facebook") postId = `fb_page_${timestamp.toString().slice(-8)}`;
      else if (platId === "instagram") postId = `ig_media_${timestamp.toString().slice(-8)}`;
      else if (platId === "linkedin") postId = `li_share_${timestamp.toString().slice(-8)}`;
      else if (platId === "twitter") postId = `tweet_${timestamp.toString().slice(-8)}`;
      else if (platId === "whatsapp") postId = `wa_status_${timestamp.toString().slice(-8)}`;
      else if (platId === "telegram") postId = `tg_msg_${timestamp.toString().slice(-8)}`;
      else postId = `pub_${platId}_${timestamp.toString().slice(-8)}`;

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
      mediaUrl: mediaUrl ? "[Uploaded Media]" : null,
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
