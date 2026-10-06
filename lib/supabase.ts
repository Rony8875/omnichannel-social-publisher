import { createClient, SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Supabase client instance (Singleton)
let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("your-project-id")) {
    return null;
  }

  try {
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    return supabaseInstance;
  } catch (err) {
    console.warn("Supabase initialization notice:", err);
    return null;
  }
}

export const DEFAULT_PLATFORMS = [
  {
    id: "facebook",
    platform: "Facebook",
    name: "Facebook Business Page",
    handle: "",
    connected: false,
    icon: "facebook",
    pageId: "",
    token: "",
  },
  {
    id: "instagram",
    platform: "Instagram",
    name: "Instagram Business",
    handle: "",
    connected: false,
    icon: "instagram",
    accountId: "",
    token: "",
  },
  {
    id: "linkedin",
    platform: "LinkedIn",
    name: "LinkedIn Company Page",
    handle: "",
    connected: false,
    icon: "linkedin",
    orgId: "",
    token: "",
  },
  {
    id: "twitter",
    platform: "X / Twitter",
    name: "X (Twitter) Profile",
    handle: "",
    connected: false,
    icon: "twitter",
    apiKey: "",
  },
  {
    id: "whatsapp",
    platform: "WhatsApp",
    name: "WhatsApp Status & Broadcast",
    handle: "",
    connected: false,
    icon: "whatsapp",
  },
  {
    id: "telegram",
    platform: "Telegram",
    name: "Telegram Announcement Channel",
    handle: "",
    connected: false,
    icon: "telegram",
    channelId: "",
    botToken: "",
  },
];

/**
 * Fetch Social Accounts for a SPECIFIC USER from Supabase (with fallback to local JSON)
 */
export async function fetchUserSocialAccounts(userId: string) {
  const cleanUserId = userId || "admin_1";
  const supabase = getSupabaseClient();

  // 1. Fetch from Supabase if configured
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("user_id", cleanUserId);

      if (!error && data && data.length > 0) {
        // Map database columns to app schema
        return data.map((r) => ({
          userId: r.user_id,
          id: r.platform,
          platform: r.name || r.platform,
          name: r.name || r.platform,
          handle: r.handle || "",
          connected: Boolean(r.connected),
          icon: r.platform,
          token: r.token || "",
          accountId: r.account_id || "",
          pageId: r.page_id || "",
          botToken: r.bot_token || "",
          channelId: r.channel_id || "",
          updated_at: r.updated_at,
          verifiedAt: r.verified_at,
        }));
      }
    } catch (e: any) {
      console.warn("Supabase fetch notice:", e.message);
    }
  }

  // 2. Fallback to local JSON file
  const localFile = path.join(process.cwd(), "data", "social_accounts.json");
  if (fs.existsSync(localFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(localFile, "utf-8"));
      const userLocal = (raw.accounts || []).filter(
        (a: any) => (a.userId || "admin_1") === cleanUserId
      );
      if (userLocal.length > 0) {
        if (process.env.INSTAGRAM_ACCESS_TOKEN) {
          const ig = userLocal.find((a: any) => a.id === "instagram");
          if (ig) {
            ig.connected = true;
            ig.token = process.env.INSTAGRAM_ACCESS_TOKEN;
            if (process.env.INSTAGRAM_ACCOUNT_ID) ig.accountId = process.env.INSTAGRAM_ACCOUNT_ID;
            if (process.env.INSTAGRAM_HANDLE) ig.handle = process.env.INSTAGRAM_HANDLE;
          }
        }
        return userLocal;
      }
    } catch {}
  }

  // 3. Defaults
  const initialAccounts = DEFAULT_PLATFORMS.map((p) => ({
    ...p,
    userId: cleanUserId,
  }));
  await saveUserSocialAccounts(cleanUserId, initialAccounts);
  return initialAccounts;
}

/**
 * Save Social Accounts for a SPECIFIC USER to Supabase (and local JSON backup)
 */
export async function saveUserSocialAccounts(userId: string, accounts: any[]) {
  const cleanUserId = userId || "admin_1";
  const supabase = getSupabaseClient();

  // 1. Save to Supabase if configured
  if (supabase) {
    try {
      const upsertRows = accounts.map((a) => ({
        user_id: cleanUserId,
        platform: a.id || a.platform,
        name: a.name || a.platform,
        handle: a.handle || "",
        token: a.token || null,
        account_id: a.accountId || null,
        page_id: a.pageId || null,
        bot_token: a.botToken || null,
        channel_id: a.channelId || null,
        connected: Boolean(a.connected),
        updated_at: new Date().toISOString(),
        verified_at: a.verifiedAt || (a.connected ? new Date().toISOString() : null),
      }));

      await supabase.from("social_accounts").upsert(upsertRows, {
        onConflict: "user_id,platform",
      });
    } catch (e: any) {
      console.warn("Supabase save notice:", e.message);
    }
  }

  // 2. Always persist local JSON backup
  try {
    const localFile = path.join(process.cwd(), "data", "social_accounts.json");
    let allAccounts: any[] = [];
    if (fs.existsSync(localFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(localFile, "utf-8"));
        allAccounts = raw.accounts || [];
      } catch {}
    }
    const otherUsers = allAccounts.filter(
      (a: any) => (a.userId || "admin_1") !== cleanUserId
    );
    const updated = [
      ...otherUsers,
      ...accounts.map((a) => ({ ...a, userId: cleanUserId, updated_at: new Date().toISOString() })),
    ];
    fs.writeFileSync(localFile, JSON.stringify({ accounts: updated }, null, 2), "utf-8");
  } catch {}
}

/**
 * Fetch Social Posts from Supabase (with fallback to local JSON)
 */
export async function fetchUserSocialPosts(userId: string) {
  const cleanUserId = userId || "admin_1";
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("social_posts")
        .select("*")
        .eq("user_id", cleanUserId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((p) => ({
          id: p.id,
          userId: p.user_id,
          caption: p.caption,
          mediaUrl: p.media_url,
          mediaType: p.media_type || "image",
          platforms: p.platforms || [],
          status: p.status || "Published",
          createdAt: p.created_at,
          scheduledTime: p.scheduled_time || null,
          author: p.author || "User",
          results: p.results || [],
        }));
      }
    } catch (e: any) {
      console.warn("Supabase posts fetch notice:", e.message);
    }
  }

  // Fallback to local posts JSON
  const postsFile = path.join(process.cwd(), "data", "social_posts.json");
  if (fs.existsSync(postsFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(postsFile, "utf-8"));
      return (raw.posts || []).filter((p: any) => (p.userId || "admin_1") === cleanUserId);
    } catch {}
  }
  return [];
}

/**
 * Save / Insert Social Post to Supabase (and local backup)
 */
export async function saveUserSocialPosts(userId: string, posts: any[]) {
  const cleanUserId = userId || "admin_1";
  const supabase = getSupabaseClient();

  if (supabase && posts.length > 0) {
    try {
      const latestPost = posts[0];
      await supabase.from("social_posts").upsert({
        id: latestPost.id,
        user_id: cleanUserId,
        caption: latestPost.caption,
        media_url: latestPost.mediaUrl,
        media_type: latestPost.mediaType || "image",
        platforms: latestPost.platforms,
        status: latestPost.status || "Published",
        scheduled_time: latestPost.scheduledTime,
        author: latestPost.author || "User",
        results: latestPost.results || [],
        created_at: latestPost.createdAt || new Date().toISOString(),
      });
    } catch (e: any) {
      console.warn("Supabase post save notice:", e.message);
    }
  }

  // Save local JSON backup
  try {
    const postsFile = path.join(process.cwd(), "data", "social_posts.json");
    fs.writeFileSync(postsFile, JSON.stringify({ posts }, null, 2), "utf-8");
  } catch {}
}

/**
 * Delete a specific post or all posts from Supabase and local JSON
 */
export async function deleteUserSocialPost(userId: string, postId: string) {
  const cleanUserId = userId || "admin_1";
  const supabase = getSupabaseClient();

  // 1. Delete from Supabase
  if (supabase) {
    try {
      if (postId === "all") {
        await supabase.from("social_posts").delete().eq("user_id", cleanUserId);
      } else {
        await supabase
          .from("social_posts")
          .delete()
          .eq("user_id", cleanUserId)
          .eq("id", postId);
      }
    } catch (e: any) {
      console.warn("Supabase post delete notice:", e.message);
    }
  }

  // 2. Delete from local JSON file
  try {
    const postsFile = path.join(process.cwd(), "data", "social_posts.json");
    if (fs.existsSync(postsFile)) {
      const raw = JSON.parse(fs.readFileSync(postsFile, "utf-8"));
      let posts = raw.posts || [];
      if (postId === "all") {
        posts = posts.filter((p: any) => (p.userId || "admin_1") !== cleanUserId);
      } else {
        posts = posts.filter(
          (p: any) => !(p.id === postId && (p.userId || "admin_1") === cleanUserId)
        );
      }
      fs.writeFileSync(postsFile, JSON.stringify({ posts }, null, 2), "utf-8");
    }
  } catch {}
}

