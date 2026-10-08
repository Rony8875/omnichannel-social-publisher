import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { fetchUserSocialAccounts, fetchUserAiConfig, saveUserAiConfig, recordActivityLog } from "@/lib/supabase";

const POSTS_PATH = path.join(process.cwd(), "data", "ai_daily_posts.json");

// Helper to ensure data dir exists
function ensureDataDir() {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

interface DailyDataStore {
  posts: any[];
  archive: any[];
  lastDate?: string;
  lastUpdated?: string;
}

// Get saved daily posts and archive history
function getDailyPostsData(): DailyDataStore {
  ensureDataDir();
  if (fs.existsSync(POSTS_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(POSTS_PATH, "utf-8"));
      return {
        posts: Array.isArray(data.posts) ? data.posts : [],
        archive: Array.isArray(data.archive) ? data.archive : [],
        lastDate: data.lastDate || (data.posts?.[0]?.createdAt?.split("T")[0]) || "",
        lastUpdated: data.lastUpdated || "",
      };
    } catch {}
  }
  return { posts: [], archive: [], lastDate: "", lastUpdated: "" };
}

// Save daily posts and archive history
function saveDailyPostsData(data: DailyDataStore) {
  ensureDataDir();
  fs.writeFileSync(
    POSTS_PATH,
    JSON.stringify(
      {
        posts: data.posts,
        archive: data.archive || [],
        lastDate: data.lastDate || new Date().toISOString().split("T")[0],
        lastUpdated: new Date().toISOString(),
      },
      null,
      2
    ),
    "utf-8"
  );
}

function getDailyPosts(): any[] {
  return getDailyPostsData().posts;
}

function saveDailyPosts(posts: any[]) {
  const current = getDailyPostsData();
  saveDailyPostsData({
    ...current,
    posts,
    lastDate: new Date().toISOString().split("T")[0],
  });
}

const STOCK_VIDEOS = [
  "https://filesamples.com/samples/video/mp4/sample_640x360.mp4",
  "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/person-bicycle-car-detection.mp4",
  "https://filesamples.com/samples/video/mp4/sample_960x400_ocean_with_audio.mp4",
  "https://filesamples.com/samples/video/mp4/sample_960x540.mp4",
];

const STOCK_IMAGES = [
  "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1080&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1080&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1080&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1080&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1080&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1080&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1080&auto=format&fit=crop&q=80",
];

// Fallback generator when AI key is missing or calls fail
function getFallbackPosts({
  brand,
  niche,
  title,
  description,
  attachmentType = "mix",
  count = 5,
  tone = "viral",
  language = "hinglish",
}: {
  brand: string;
  niche: string;
  title?: string;
  description?: string;
  attachmentType?: "image" | "video" | "mix";
  count?: number;
  tone?: string;
  language?: string;
}) {
  const today = new Date().toISOString().split("T")[0];
  const results = [];
  const safeCount = Math.min(Math.max(count || 5, 1), 10);

  const baseThemes = [
    {
      tag: "🔥 Viral Growth Hook",
      heading: title || "5x Growth Strategy for Social Media",
      caption: `🔥 Kya aap jante hain ki 80% businesses consistency na hone ki wajah se reach loose karte hain?\n\n${description || `${brand} ke saath ab aap Facebook aur Instagram par automated posts publish aur schedule kar sakte hain! Samay bachayein aur brand reach 300% grow karein! 🚀`}\n\nComment 'GROW' karein aur hum aapko free step-by-step strategy guide bhejenge! 👇`,
      hook: "Stop Wasting 5 Hours Daily!\nAutomate Your Socials in 1-Click 🚀",
      theme: "gradient-pulse",
    },
    {
      tag: "🎁 Special Offer / Promo",
      heading: title ? `${title} • Exclusive Offer` : "Exclusive Business Growth Offer",
      caption: `🎉 Special Offer Alert!\n\n${description || `Apne business ko digitally scale karne ka sabse behtareen mauka! ${brand} se ek saath sabhi social channels par post karein aur customer engagement maximize karein.`} ✨\n\nAbhi contact karein ya link in bio par click karein for instant VIP access! 📲`,
      hook: "Special Limited Offer!\nScale Your Business Today 🎁",
      theme: "luxury-gold",
    },
    {
      tag: "⚡ 5-Sec Motion Reel Demo",
      heading: title ? `${title} • Quick Demo` : "The Ultimate 1-Click Publishing Demo",
      caption: `⚡ Ek Post ➔ Sabhi Social Platforms Live! \n\n${description || `${brand} banata hai aapke content creation ko superfast aur hassle-free. Video Reels aur Photo Feeds ek hi jagah se publish karein!`}\n\nCheck out the demo aur aaj hi grow karna start karein! 🎯`,
      hook: "1 Post ➔ All Social Channels!\nSave 10+ Hours Every Week ⚡",
      theme: "neon-cyber",
    },
    {
      tag: "🤔 Community Poll & Question",
      heading: title ? `Question about ${title}` : "Question of the Day for Founders",
      caption: `🤔 Dosto, hume batayein:\n\n${description || `Aapke business me sabse bada challenge kya hai?\nA) Content create karna\nB) Har platform par manually post karna\nC) Consistency maintain rakhna`}\n\nDrop your vote (A, B, or C) in comments below! 👇✨`,
      hook: "Which Takes Most Time?\nA) Creating or B) Posting Everywhere? 🤔",
      theme: "ambient-aurora",
    },
    {
      tag: "🌟 Motivation & Behind-The-Scenes",
      heading: title ? `${title} • The Winning Secret` : "Consistency is the Only Secret",
      caption: `💡 Success ek raat me nahi aati, roz ke chhote-chhote consistent steps se aati hai.\n\n${description || `Roz naya content post karein, apni audience ke sath engage karein aur results khud dekhein. ${brand} aapke sath hai har step par!`}\n\nSave this post for daily motivation and share with a friend! 🤝`,
      hook: "Consistency Beats Talent!\nKeep Posting, Keep Growing 🌟",
      theme: "luxury-gold",
    },
  ];

  for (let i = 0; i < safeCount; i++) {
    const t = baseThemes[i % baseThemes.length];
    let isVideo = false;
    if (attachmentType === "video") isVideo = true;
    else if (attachmentType === "image") isVideo = false;
    else isVideo = i % 2 === 0;

    results.push({
      id: `ai_post_${i + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      postNum: i + 1,
      tag: t.tag,
      title: i === 0 && title ? title : `${t.heading} #${i + 1}`,
      caption: t.caption,
      hashtags: `#${brand.replace(/\s+/g, "")} #BusinessGrowth #MarketingTips #SocialMediaStrategy #ViralPost #Entrepreneur`,
      mediaType: isVideo ? "video" : "image",
      videoDuration: 5,
      videoTheme: t.theme,
      videoText: t.hook,
      mediaUrl: isVideo
        ? STOCK_VIDEOS[i % STOCK_VIDEOS.length]
        : STOCK_IMAGES[i % STOCK_IMAGES.length],
      platforms: ["instagram", "facebook"],
      isApproved: false,
      isPublished: false,
      createdAt: today,
    });
  }

  return results;
}

// Call Google Gemini API
async function callGeminiApi({
  apiKey,
  prompt,
  preferredModel,
}: {
  apiKey: string;
  prompt: string;
  preferredModel?: string;
}) {
  const models = preferredModel
    ? [preferredModel, "gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]
    : ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];

  let lastErr = "";

  for (const model of Array.from(new Set(models))) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.8,
              responseMimeType: "application/json",
            },
          }),
        }
      );
      const data = await res.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const text = data.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed.posts) && parsed.posts.length > 0) {
          return parsed.posts;
        }
      } else if (data.error) {
        lastErr = data.error.message;
      }
    } catch (e: any) {
      lastErr = e.message;
    }
  }

  throw new Error(lastErr || "Failed to generate posts from Google Gemini");
}

// Call OpenAI API
async function callOpenAiApi({
  apiKey,
  prompt,
  model = "gpt-4o-mini",
}: {
  apiKey: string;
  prompt: string;
  model?: string;
}) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert social media manager. You output only valid JSON matching the requested schema.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    }),
  });

  const data = await res.json();
  if (data.choices?.[0]?.message?.content) {
    const parsed = JSON.parse(data.choices[0].message.content);
    if (Array.isArray(parsed.posts) && parsed.posts.length > 0) {
      return parsed.posts;
    }
  }

  throw new Error(data.error?.message || "Failed to generate posts from OpenAI");
}

// Master AI generator
async function generateAiPostsBatch({
  provider = "gemini",
  apiKey,
  model,
  brand,
  niche,
  title,
  description,
  attachmentType = "mix",
  count = 5,
  tone = "viral",
  language = "hinglish",
}: {
  provider?: string;
  apiKey: string;
  model?: string;
  brand: string;
  niche: string;
  title?: string;
  description?: string;
  attachmentType?: "image" | "video" | "mix";
  count?: number;
  tone?: string;
  language?: string;
}) {
  const safeCount = Math.min(Math.max(count || 5, 1), 10);

  const prompt = `You are a world-class viral social media manager for the brand "${brand}".
Industry / Niche: "${niche}".
Language: "${language}" (engaging Hinglish with natural conversational Hindi + English words, highly relatable for Indian audience).
Content Tone: "${tone}".

User Input Requirements:
${title ? `- Target Post Title / Subject: "${title}"` : "- Topic: Trending industry value and engagement"}
${description ? `- Specific Details & Description: "${description}"` : "- Context: Maximize customer reach and sales conversion"}
- Attachment Requirement: "${attachmentType.toUpperCase()}" (${
    attachmentType === "video"
      ? "ALL posts must be video reels with punchy 5-sec hooks"
      : attachmentType === "image"
      ? "ALL posts must be image feed posts"
      : "Balanced mix of video reels and image posts"
  })
- Total Number of Distinct Posts to Create: EXACTLY ${safeCount}.

Return ONLY valid JSON matching this schema:
{
  "posts": [
    {
      "postNum": 1,
      "tag": "Category Tag (e.g. Viral Hook, Special Offer, 5s Reel)",
      "title": "Punchy headline related to the topic",
      "caption": "Full rich engaging caption with emojis, value proposition, body paragraphs, and strong Call To Action (CTA)",
      "hashtags": "#Trending #Hashtags (6 to 8 hashtags)",
      "mediaType": "${attachmentType === "video" ? "video" : attachmentType === "image" ? "image" : "image or video"}",
      "videoDuration": 5,
      "videoTheme": "gradient-pulse" or "luxury-gold" or "neon-cyber" or "ambient-aurora",
      "videoText": "Punchy 2-line animated hook text for 5-second video reel (under 12 words)"
    }
  ]
}
Generate EXACTLY ${safeCount} posts. Return pure JSON only.`;

  let rawPosts: any[] = [];

  if (provider === "openai") {
    rawPosts = await callOpenAiApi({ apiKey, prompt, model });
  } else {
    rawPosts = await callGeminiApi({ apiKey, prompt, preferredModel: model });
  }

  const today = new Date().toISOString().split("T")[0];

  return rawPosts.slice(0, safeCount).map((p: any, idx: number) => {
    let isVideo = false;
    if (attachmentType === "video") isVideo = true;
    else if (attachmentType === "image") isVideo = false;
    else isVideo = p.mediaType === "video" || idx % 2 === 0;

    return {
      id: `ai_post_${idx + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      postNum: idx + 1,
      tag: p.tag || `Post #${idx + 1}`,
      title: p.title || (title ? `${title} #${idx + 1}` : `Post Idea #${idx + 1}`),
      caption: p.caption || "",
      hashtags: p.hashtags || `#${brand.replace(/\s+/g, "")} #BusinessGrowth #MarketingHacks`,
      mediaType: isVideo ? "video" : "image",
      videoDuration: 5,
      videoTheme: p.videoTheme || (idx % 2 === 0 ? "neon-cyber" : "luxury-gold"),
      videoText: p.videoText || `${title || brand}\n1-Click Automation 🚀`,
      mediaUrl: isVideo
        ? STOCK_VIDEOS[idx % STOCK_VIDEOS.length]
        : STOCK_IMAGES[idx % STOCK_IMAGES.length],
      platforms: ["instagram", "facebook"],
      isApproved: false,
      isPublished: false,
      createdAt: today,
    };
  });
}

// GET: Fetch config, daily posts and history
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "admin_1";

    const config = await fetchUserAiConfig(userId);
    const today = new Date().toISOString().split("T")[0];
    const data = getDailyPostsData();
    const posts = data.posts || [];

    return NextResponse.json({
      success: true,
      config: {
        provider: config.provider || "gemini",
        model: config.model || "gemini-1.5-flash",
        hasApiKey: Boolean(config.apiKey && config.apiKey.length > 5),
        apiKeyMasked: config.apiKey ? `${config.apiKey.slice(0, 6)}...${config.apiKey.slice(-4)}` : "",
        brandName: config.brandName,
        businessNiche: config.businessNiche,
        language: config.language,
      },
      autoPilot: {
        enabled: true,
        today,
        lastDate: data.lastDate || today,
        isAutoRolledOver: false,
      },
      archive: data.archive || [],
      posts,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Actions handler
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userId = "admin_1" } = body;

    // 1. SAVE AI CONFIG TO SUPABASE DATABASE PER-USER
    if (action === "save_config") {
      const { provider = "gemini", apiKey, model, brandName, businessNiche, language } = body;

      const saved = await saveUserAiConfig(userId, {
        provider,
        apiKey,
        model,
        brandName,
        businessNiche,
        language,
      });

      return NextResponse.json({
        success: true,
        message: `✅ AI API Configuration (${provider.toUpperCase()}) Supabase database me successfully save ho gayi!`,
        config: {
          provider: saved.provider,
          model: saved.model,
          hasApiKey: saved.hasApiKey,
          apiKeyMasked: apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` : "",
          brandName: saved.brandName,
          businessNiche: saved.businessNiche,
          language: saved.language,
        },
      });
    }

    // 2. TEST AI API KEY LIVE
    if (action === "test_key") {
      const { provider = "gemini", apiKey, model } = body;
      const cleanKey = apiKey ? apiKey.trim() : "";

      if (!cleanKey) {
        return NextResponse.json(
          { success: false, error: "Kripya testing ke liye API key enter karein!" },
          { status: 400 }
        );
      }

      if (provider === "openai") {
        try {
          const res = await fetch("https://api.openai.com/v1/models", {
            headers: { Authorization: `Bearer ${cleanKey}` },
          });
          const data = await res.json();
          if (res.ok && data.data) {
            return NextResponse.json({
              success: true,
              message: "✅ OpenAI API Key Verified Successfully! (Model access active)",
            });
          } else {
            return NextResponse.json({
              success: false,
              error: data.error?.message || "OpenAI API Key validation failed",
            });
          }
        } catch (e: any) {
          return NextResponse.json({ success: false, error: e.message });
        }
      } else {
        // Google Gemini
        const testModel = model || "gemini-1.5-flash";
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${cleanKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: "Say 'Gemini Active' in 2 words." }] }],
              }),
            }
          );
          const data = await res.json();
          if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return NextResponse.json({
              success: true,
              message: `✅ Google Gemini API Key Verified! Model: ${testModel}`,
            });
          } else {
            return NextResponse.json({
              success: false,
              error: data.error?.message || "Google Gemini Key validation failed",
            });
          }
        } catch (e: any) {
          return NextResponse.json({ success: false, error: e.message });
        }
      }
    }

    // 3. GENERATE CUSTOM POSTS BATCH (USER'S FORM WITH TITLE, DESCRIPTION, ATTACHMENT & COUNT)
    if (action === "generate_custom_batch" || action === "generate_daily_5") {
      const userConfig = await fetchUserAiConfig(userId);

      const activeApiKey = body.apiKey ? body.apiKey.trim() : userConfig.apiKey;
      const provider = body.provider || userConfig.provider || "gemini";
      const model = body.model || userConfig.model || "gemini-1.5-flash";
      const brand = body.brandName || userConfig.brandName || "Anant Reach";
      const niche = body.businessNiche || userConfig.businessNiche || "Social Media & Business Growth";
      const language = body.language || userConfig.language || "hinglish";
      const tone = body.tone || "viral";

      // Form specific fields
      const title = body.title || body.customTopic || "";
      const description = body.description || "";
      const attachmentType: "image" | "video" | "mix" = body.attachmentType || "mix";
      const count = Number(body.postCount || body.count || 5);

      let generatedPosts: any[] = [];
      let usedAi = false;
      let errorNotice = "";

      if (activeApiKey && activeApiKey.length > 5) {
        try {
          generatedPosts = await generateAiPostsBatch({
            provider,
            apiKey: activeApiKey,
            model,
            brand,
            niche,
            title,
            description,
            attachmentType,
            count,
            tone,
            language,
          });
          usedAi = true;
        } catch (err: any) {
          console.warn("AI generation error, falling back to smart template:", err.message);
          errorNotice = err.message;
        }
      }

      if (!generatedPosts || generatedPosts.length === 0) {
        generatedPosts = getFallbackPosts({
          brand,
          niche,
          title,
          description,
          attachmentType,
          count,
          tone,
          language,
        });
      }

      // Archive previous approved before updating active list
      const currentData = getDailyPostsData();
      const previousApproved = currentData.posts.filter((p: any) => p.isApproved || p.isPublished);
      const updatedArchive = [...(currentData.archive || [])];
      for (const p of previousApproved) {
        if (!updatedArchive.some((a: any) => a.id === p.id)) {
          updatedArchive.push(p);
        }
      }

      const today = new Date().toISOString().split("T")[0];
      saveDailyPostsData({
        posts: generatedPosts,
        archive: updatedArchive,
        lastDate: today,
        lastUpdated: new Date().toISOString(),
      });

      // Record activity log to Supabase
      recordActivityLog(
        userId,
        "AI_POSTS_GENERATED",
        `Generated ${generatedPosts.length} posts (Used AI: ${usedAi}, Model: ${model}, Topic: "${title || brand}")`
      ).catch(() => {});

      return NextResponse.json({
        success: true,
        usedAi,
        errorNotice: errorNotice || undefined,
        message: usedAi
          ? `🎉 AI ne aapke form ke anusaar ${generatedPosts.length} posts & reels successfully generate kar diye!`
          : `⚡ ${generatedPosts.length} custom posts & reels generate ho gaye (Fallback Template Engine)!`,
        posts: generatedPosts,
      });
    }

    // 4. UPDATE POST (USER EDITS POST IN MODAL)
    if (action === "update_post") {
      const { postId, updatedFields } = body;
      const posts = getDailyPosts();
      const index = posts.findIndex((p: any) => p.id === postId);

      if (index === -1) {
        return NextResponse.json({ success: false, error: "Post nahi mili!" }, { status: 404 });
      }

      posts[index] = {
        ...posts[index],
        ...updatedFields,
        updatedAt: new Date().toISOString(),
      };
      saveDailyPosts(posts);

      return NextResponse.json({
        success: true,
        message: "Post successfully update ho gayi!",
        post: posts[index],
        posts,
      });
    }

    // 4b. DELETE SINGLE POST
    if (action === "delete_post") {
      const { postId } = body;
      const current = getDailyPostsData();
      const updatedPosts = (current.posts || []).filter((p: any) => p.id !== postId);
      const updatedArchive = (current.archive || []).filter((p: any) => p.id !== postId);
      saveDailyPostsData({
        ...current,
        posts: updatedPosts,
        archive: updatedArchive,
      });

      return NextResponse.json({
        success: true,
        message: "Post successfully delete ho gayi!",
        posts: updatedPosts,
      });
    }

    // 4c. CLEAR ALL POSTS (DELETE ALL DUMMY / CREATED POSTS)
    if (action === "clear_all_posts") {
      saveDailyPostsData({
        posts: [],
        archive: [],
        lastDate: new Date().toISOString().split("T")[0],
        lastUpdated: new Date().toISOString(),
      });

      recordActivityLog(userId, "POSTS_CLEARED", "User cleared all dummy/daily posts").catch(() => {});

      return NextResponse.json({
        success: true,
        message: "Sabhi posts successfully delete ho gaye!",
        posts: [],
        archive: [],
      });
    }

    // 5. APPROVE SINGLE POST
    if (action === "approve_post") {
      const { postId } = body;
      const posts = getDailyPosts();
      posts.forEach((p: any) => {
        if (p.id === postId) {
          p.isApproved = true;
        } else {
          p.isApproved = false;
        }
      });
      saveDailyPosts(posts);

      return NextResponse.json({
        success: true,
        message: "Post approve ho gayi!",
        posts,
      });
    }

    // 6. APPROVE & LIVE PUBLISH TO META (FACEBOOK & INSTAGRAM)
    if (action === "approve_and_publish") {
      const { postId } = body;
      const posts = getDailyPosts();
      const post = posts.find((p: any) => p.id === postId);

      if (!post) {
        return NextResponse.json({ success: false, error: "Post nahi mili!" }, { status: 404 });
      }

      post.isApproved = true;

      const publishPayload = {
        caption: `${post.caption}\n\n${post.hashtags}`,
        platforms: ["instagram", "facebook"],
        mediaUrl: post.mediaUrl,
        mediaType: post.mediaType,
        postFormat: post.mediaType === "video" ? "reel" : "feed",
        isReel: post.mediaType === "video",
        scheduleMode: "now",
        userId,
      };

      let publishResult: any = null;
      try {
        const urlObj = new URL(request.url);
        const origin = `${urlObj.protocol}//${urlObj.host}`;
        const pubRes = await fetch(`${origin}/api/social/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(publishPayload),
        });
        publishResult = await pubRes.json();
      } catch (e: any) {
        return NextResponse.json(
          { success: false, error: `Publish server error: ${e.message}` },
          { status: 500 }
        );
      }

      if (!publishResult || !publishResult.success) {
        const errorMsg =
          publishResult?.error ||
          publishResult?.results?.find((r: any) => r.error)?.error ||
          "Meta API par post publish nahi ho saki.";
        return NextResponse.json(
          { success: false, error: errorMsg, publishResult },
          { status: 400 }
        );
      }

      post.isPublished = true;
      post.publishedAt = new Date().toISOString();
      post.publishResults = publishResult.results;
      saveDailyPosts(posts);

      return NextResponse.json({
        success: true,
        message: "🎉 Post approve hokar Facebook & Instagram par successfully live publish ho gayi!",
        post,
        posts,
        publishResult,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
