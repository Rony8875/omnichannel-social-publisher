import { createClient, SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import crypto from "crypto";

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
 * Helper to validate UUID format
 */
export function isValidUUID(str: any): boolean {
  if (!str || typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Smart Upsert for `social_accounts`
 * Avoids Postgres error 42P10 (missing composite constraint)
 * and PGRST204 (non-existent columns)
 */
export async function smartUpsertSocialAccount(supabase: SupabaseClient, row: any) {
  const { data: existing } = await supabase
    .from("social_accounts")
    .select("id")
    .eq("user_id", row.user_id)
    .eq("platform", row.platform)
    .maybeSingle();

  // Strict column schema alignment for public.social_accounts
  const payload: any = {
    user_id: row.user_id,
    platform: row.platform,
    name: row.name || row.platform,
    handle: row.handle || "",
    token: row.token || null,
    account_id: row.account_id || null,
    page_id: row.page_id || null,
    connected: Boolean(row.connected),
    updated_at: new Date().toISOString(),
  };

  if (existing && existing.id) {
    const { data, error } = await supabase
      .from("social_accounts")
      .update(payload)
      .eq("id", existing.id)
      .select();
    if (error) {
      console.warn("Supabase account update warning:", error.message);
      throw error;
    }
    return data?.[0];
  } else {
    const { data, error } = await supabase
      .from("social_accounts")
      .insert(payload)
      .select();
    if (error) {
      console.warn("Supabase account insert warning:", error.message);
      throw error;
    }
    return data?.[0];
  }
}

/**
 * Record an activity audit log in the Supabase table
 */
export async function recordActivityLog(
  userId: string,
  activityTitle: string,
  details: string
) {
  const cleanUserId = userId || "admin_1";
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const logId = crypto.randomUUID();
    await supabase.from("social_posts").insert({
      id: logId,
      user_id: cleanUserId,
      caption: `[ACTIVITY: ${activityTitle}] ${details}`,
      media_url: null,
      media_type: "activity_log",
      platforms: ["system_audit"],
      status: "LOGGED",
      created_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn("Supabase recordActivityLog notice:", err?.message);
  }
}

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
          botToken: "",
          channelId: "",
          updated_at: r.updated_at,
          verifiedAt: r.updated_at,
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
      for (const a of accounts) {
        await smartUpsertSocialAccount(supabase, {
          user_id: cleanUserId,
          platform: a.id || a.platform,
          name: a.name || a.platform,
          handle: a.handle || "",
          token: a.token || null,
          account_id: a.accountId || null,
          page_id: a.pageId || null,
          connected: Boolean(a.connected),
        });
      }

      // Record activity log for sync
      recordActivityLog(
        cleanUserId,
        "ACCOUNTS_SYNCED",
        `Updated ${accounts.length} social media accounts/tokens in Supabase`
      ).catch(() => {});
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
          scheduledTime: null,
          author: "User",
          results: [],
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
      const postId = isValidUUID(latestPost.id) ? latestPost.id : crypto.randomUUID();

      const payload: any = {
        id: postId,
        user_id: cleanUserId,
        caption: latestPost.caption || "",
        media_url: latestPost.mediaUrl || latestPost.media_url || null,
        media_type: latestPost.mediaType || latestPost.media_type || "image",
        platforms: Array.isArray(latestPost.platforms)
          ? latestPost.platforms
          : [latestPost.platforms || "facebook"],
        status: latestPost.status || "Published",
        created_at: latestPost.createdAt || latestPost.created_at || new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from("social_posts")
        .select("id")
        .eq("id", postId)
        .maybeSingle();

      if (existing && existing.id) {
        await supabase.from("social_posts").update(payload).eq("id", postId);
      } else {
        await supabase.from("social_posts").insert(payload);
      }

      // Record activity
      recordActivityLog(
        cleanUserId,
        "POST_SAVED",
        `Post [${postId}] saved with status ${payload.status}`
      ).catch(() => {});
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

      recordActivityLog(
        cleanUserId,
        "POST_DELETED",
        `Deleted post ID: ${postId}`
      ).catch(() => {});
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

/**
 * Fetch Meta Cloud API Credentials for a SPECIFIC USER
 * Reads from Supabase social_accounts (platform: 'whatsapp_meta') with fallback to local JSON
 */
export async function fetchUserMetaConfig(userId: string) {
  const cleanUserId = userId || "admin_1";
  const supabase = getSupabaseClient();

  // 1. Check Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("user_id", cleanUserId)
        .eq("platform", "whatsapp_meta")
        .maybeSingle();

      if (!error && data && data.token) {
        return {
          accessToken: data.token,
          phoneNumberId: data.account_id || "",
          wabaId: data.page_id || "",
          freeTierTotal: 1000,
          freeTierUsed: 0,
          currentTierLimit: 250,
          ratePerMessageINR: 0.85,
          verifiedAt: data.updated_at,
          handle: data.handle || "",
        };
      }
    } catch (e: any) {
      console.warn("Supabase fetchUserMetaConfig notice:", e.message);
    }
  }

  // 2. Check local user meta config or global meta_config.json
  const userConfigFile = path.join(process.cwd(), "data", `meta_config_${cleanUserId}.json`);
  if (fs.existsSync(userConfigFile)) {
    try {
      return JSON.parse(fs.readFileSync(userConfigFile, "utf-8"));
    } catch {}
  }

  const globalConfigFile = path.join(process.cwd(), "data", "meta_config.json");
  if (fs.existsSync(globalConfigFile)) {
    try {
      return JSON.parse(fs.readFileSync(globalConfigFile, "utf-8"));
    } catch {}
  }

  return {
    accessToken: "",
    phoneNumberId: "",
    wabaId: "",
    freeTierTotal: 1000,
    freeTierUsed: 0,
    currentTierLimit: 250,
    ratePerMessageINR: 0.85,
  };
}

/**
 * Save Meta Cloud API Credentials for a SPECIFIC USER
 * Persists to Supabase social_accounts (platform: 'whatsapp_meta') and local JSON backup
 */
export async function saveUserMetaConfig(userId: string, cfg: any) {
  const cleanUserId = userId || "admin_1";
  const supabase = getSupabaseClient();

  // 1. Save to Supabase
  if (supabase) {
    try {
      await smartUpsertSocialAccount(supabase, {
        user_id: cleanUserId,
        platform: "whatsapp_meta",
        name: "Meta Official WhatsApp Cloud API",
        handle: cfg.phoneNumber || cfg.phoneNumberId || "",
        token: cfg.accessToken || null,
        account_id: cfg.phoneNumberId || null,
        page_id: cfg.wabaId || null,
        connected: Boolean(cfg.accessToken && cfg.phoneNumberId),
      });

      recordActivityLog(
        cleanUserId,
        "META_CONFIG_SAVED",
        `Meta Cloud API credentials saved for WABA ID: ${cfg.wabaId || "N/A"}`
      ).catch(() => {});
    } catch (e: any) {
      console.warn("Supabase saveUserMetaConfig notice:", e.message);
    }
  }

  // 2. Local JSON backup
  try {
    const userConfigFile = path.join(process.cwd(), "data", `meta_config_${cleanUserId}.json`);
    fs.writeFileSync(userConfigFile, JSON.stringify(cfg, null, 2), "utf-8");

    // Also update global file if admin_1
    if (cleanUserId === "admin_1") {
      const globalConfigFile = path.join(process.cwd(), "data", "meta_config.json");
      fs.writeFileSync(globalConfigFile, JSON.stringify(cfg, null, 2), "utf-8");
    }
  } catch {}
}

/**
 * Fetch AI API Configuration (Gemini / OpenAI) for a SPECIFIC USER from Supabase
 */
export async function fetchUserAiConfig(userId: string) {
  const cleanUserId = userId || "admin_1";
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("user_id", cleanUserId)
        .eq("platform", "ai_config")
        .maybeSingle();

      if (!error && data) {
        let meta: any = {};
        try {
          if (data.account_id && data.account_id.startsWith("{")) {
            meta = JSON.parse(data.account_id);
          }
        } catch {}

        return {
          provider: data.name || "gemini",
          apiKey: data.token || "",
          model: data.handle || "gemini-1.5-flash",
          brandName: meta.brandName || "Anant Reach",
          businessNiche: meta.businessNiche || "Social Media Growth, Digital Marketing & Business Automation",
          language: meta.language || "hinglish",
          hasApiKey: Boolean(data.token && data.token.length > 5),
          updatedAt: data.updated_at,
        };
      }
    } catch (e: any) {
      console.warn("Supabase fetchUserAiConfig notice:", e.message);
    }
  }

  // Fallback to user local JSON or global gemini_config.json
  const userConfigFile = path.join(process.cwd(), "data", `ai_config_${cleanUserId}.json`);
  if (fs.existsSync(userConfigFile)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(userConfigFile, "utf-8"));
      return {
        provider: cfg.provider || "gemini",
        model: cfg.model || "gemini-1.5-flash",
        apiKey: cfg.apiKey || "",
        brandName: cfg.brandName || "Anant Reach",
        businessNiche: cfg.businessNiche || "Social Media Growth, Digital Marketing & Business Automation",
        language: cfg.language || "hinglish",
        hasApiKey: Boolean(cfg.apiKey && cfg.apiKey.length > 5),
      };
    } catch {}
  }

  const globalConfigFile = path.join(process.cwd(), "data", "gemini_config.json");
  if (fs.existsSync(globalConfigFile)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(globalConfigFile, "utf-8"));
      return {
        provider: cfg.provider || "gemini",
        model: cfg.model || "gemini-1.5-flash",
        apiKey: cfg.apiKey || process.env.GEMINI_API_KEY || "",
        brandName: cfg.brandName || "Anant Reach",
        businessNiche: cfg.businessNiche || "Social Media Growth, Digital Marketing & Business Automation",
        language: cfg.language || "hinglish",
        hasApiKey: Boolean((cfg.apiKey || process.env.GEMINI_API_KEY) && (cfg.apiKey || process.env.GEMINI_API_KEY).length > 5),
      };
    } catch {}
  }

  return {
    provider: "gemini",
    apiKey: process.env.GEMINI_API_KEY || "",
    model: "gemini-1.5-flash",
    brandName: "Anant Reach",
    businessNiche: "Social Media Growth, Digital Marketing & Business Automation",
    language: "hinglish",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5),
  };
}

/**
 * Save AI API Configuration (Gemini / OpenAI) for a SPECIFIC USER to Supabase
 */
export async function saveUserAiConfig(userId: string, cfg: any) {
  const cleanUserId = userId || "admin_1";
  const supabase = getSupabaseClient();

  const provider = cfg.provider || "gemini";
  const model = cfg.model || (provider === "openai" ? "gpt-4o-mini" : "gemini-1.5-flash");
  const apiKey = cfg.apiKey !== undefined ? cfg.apiKey.trim() : "";
  const brandName = cfg.brandName || "Anant Reach";
  const businessNiche = cfg.businessNiche || "Social Media Growth, Digital Marketing & Business Automation";
  const language = cfg.language || "hinglish";

  if (supabase) {
    try {
      await smartUpsertSocialAccount(supabase, {
        user_id: cleanUserId,
        platform: "ai_config",
        name: provider,
        handle: model,
        token: apiKey || null,
        account_id: JSON.stringify({ brandName, businessNiche, language }),
        connected: Boolean(apiKey && apiKey.length > 5),
      });

      recordActivityLog(
        cleanUserId,
        "AI_CONFIG_SAVED",
        `Saved ${provider.toUpperCase()} AI API Key (model: ${model})`
      ).catch(() => {});
    } catch (e: any) {
      console.warn("Supabase saveUserAiConfig notice:", e.message);
    }
  }

  // Local JSON backup per user & global
  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const userCfg = {
      provider,
      model,
      apiKey,
      brandName,
      businessNiche,
      language,
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(dataDir, `ai_config_${cleanUserId}.json`),
      JSON.stringify(userCfg, null, 2),
      "utf-8"
    );

    // Global backup for backwards compatibility
    fs.writeFileSync(
      path.join(dataDir, "gemini_config.json"),
      JSON.stringify(userCfg, null, 2),
      "utf-8"
    );
  } catch {}

  return {
    provider,
    model,
    hasApiKey: Boolean(apiKey && apiKey.length > 5),
    brandName,
    businessNiche,
    language,
  };
}
