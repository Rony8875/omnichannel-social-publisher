import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const POSTS_FILE = path.join(process.cwd(), "data", "social_posts.json");
const ACCOUNTS_FILE = path.join(process.cwd(), "data", "social_accounts.json");

function getPosts() {
  if (!fs.existsSync(POSTS_FILE)) return [];
  try {
    const raw = fs.readFileSync(POSTS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed.posts || [];
  } catch {
    return [];
  }
}

function savePosts(posts: any[]) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify({ posts }, null, 2), "utf-8");
}

function getAccounts() {
  if (!fs.existsSync(ACCOUNTS_FILE)) return [];
  try {
    const raw = fs.readFileSync(ACCOUNTS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed.accounts || [];
  } catch {
    return [];
  }
}

export async function GET() {
  const posts = getPosts();
  return NextResponse.json({ success: true, posts });
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

    const allAccounts = getAccounts();

    // Check if scheduling for later
    const isScheduled = scheduleMode === "later";

    const results: any[] = [];

    // Dispatch or schedule for each selected platform
    for (const platId of platforms) {
      const acct = allAccounts.find((a: any) => a.id === platId);
      const isConnected = acct ? acct.connected : true;

      if (!isConnected) {
        results.push({
          platform: platId,
          status: "FAILED",
          error: `Platform ${acct?.name || platId} is not connected. Kripya pehle account link karein.`,
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

      // Custom platform time if specified
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

    const successCount = results.filter((r) => r.status === "SUCCESS" || r.status === "SCHEDULED").length;

    const newPost = {
      id: `post_${Date.now()}`,
      caption,
      mediaUrl: mediaUrl ? "[Uploaded Media]" : null,
      mediaType: mediaType || null,
      platforms,
      createdAt: new Date().toISOString(),
      status: isScheduled ? "Scheduled" : successCount > 0 ? "Published" : "Failed",
      scheduledTime: isScheduled ? scheduledTime || new Date().toISOString() : null,
      platformSchedules: isScheduled ? platformSchedules || null : null,
      author: author || "Admin",
      results,
    };

    const currentPosts = getPosts();
    currentPosts.unshift(newPost);
    savePosts(currentPosts);

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

// PUT: Trigger Instant Publish for a Scheduled Post
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { postId } = body;

    const posts = getPosts();
    const index = posts.findIndex((p: any) => p.id === postId);

    if (index === -1) {
      return NextResponse.json({ success: false, error: "Post nahi mili!" }, { status: 404 });
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
    savePosts(posts);

    return NextResponse.json({
      success: true,
      message: "Scheduled post abhi turant publish ho gayi!",
      post,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Cancel / Remove a post from history or scheduled queue
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("id");

    if (!postId) {
      return NextResponse.json({ success: false, error: "Post ID zaroori hai!" }, { status: 400 });
    }

    let posts = getPosts();
    posts = posts.filter((p: any) => p.id !== postId);
    savePosts(posts);

    return NextResponse.json({
      success: true,
      message: "Post successfully delete ho gayi!",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
