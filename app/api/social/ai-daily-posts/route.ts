import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { fetchUserSocialAccounts } from "@/lib/supabase";

const CONFIG_PATH = path.join(process.cwd(), "data", "gemini_config.json");
const POSTS_PATH = path.join(process.cwd(), "data", "ai_daily_posts.json");

// Helper to ensure data dir exists
function ensureDataDir() {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Get saved Gemini config
function getGeminiConfig() {
  ensureDataDir();
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    } catch {}
  }
  return {
    apiKey: process.env.GEMINI_API_KEY || "",
    brandName: "Anant Reach",
    businessNiche: "Social Media Growth, Digital Marketing & Business Automation",
    language: "hinglish",
  };
}

// Save Gemini config
function saveGeminiConfig(config: any) {
  ensureDataDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
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

// Backward-compatible helpers
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

// Default 5 starter posts if Gemini not yet run today
function getDefaultDailyPosts(brand: string, niche: string) {
  const today = new Date().toISOString().split("T")[0];
  return [
    {
      id: `ai_post_1_${Date.now()}`,
      postNum: 1,
      tag: "Viral Hook / Growth Tip",
      title: "5x Growth Strategy for Social Media",
      caption: `🔥 Kya aap jante hain ki 80% businesses social media consistency na hone ki wajah se reach loose karte hain?\n\n${brand} ke saath ab aap Facebook, Instagram aur sabhi channels par ek click me posts schedule aur publish kar sakte hain! Automated workflows se apna samay bachayein aur brand reach 300% grow karein! 🚀\n\nComment 'GROW' karein aur hum aapko free step-by-step strategy guide bhejenge! 👇`,
      hashtags: "#SocialMediaGrowth #DigitalMarketing #BusinessAutomation #InstagramTips #FacebookMarketing #AnantReach",
      mediaType: "video",
      videoDuration: 5,
      videoTheme: "gradient-pulse",
      videoText: "Stop Wasting Time on 5 Apps!\nPublish Everywhere in 1-Click 🚀",
      mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      platforms: ["instagram", "facebook"],
      isApproved: false,
      isPublished: false,
      createdAt: today,
    },
    {
      id: `ai_post_2_${Date.now()}`,
      postNum: 2,
      tag: "Festive / Special Offer",
      title: "Exclusive Business Automation Offer",
      caption: `🎉 Festive Special Offer! Apne business ko digitally transform karne ka sabse behtareen mauka!\n\n${brand} ke omni-channel publisher se ab Instagram Reels, Facebook Feeds aur broadcast ek jagah se manage karein. Aaj hi join karein aur paayein special introductory benefits! ✨\n\nLink in bio par click karein ya DM karein 'OFFER' for instant access! 📲`,
      hashtags: "#FestiveOffer #BusinessGrowth #AutomationTools #MarketingStrategy #InstagramBusiness #SpecialDiscount",
      mediaType: "image",
      videoDuration: 5,
      videoTheme: "luxury-gold",
      videoText: "Festive Season 40% OFF!\nTransform Your Business Today 🎁",
      mediaUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1000&auto=format&fit=crop&q=80",
      platforms: ["instagram", "facebook"],
      isApproved: false,
      isPublished: false,
      createdAt: today,
    },
    {
      id: `ai_post_3_${Date.now()}`,
      postNum: 3,
      tag: "5-Sec Motion Video Reel",
      title: "The Ultimate 1-Click Publishing Demo",
      caption: `⚡ Ek Post ➔ Sabhi Social Platforms Live! \n\nKitna aasan hoga agar aap ek post banayein aur wo ek sath Instagram aur Facebook dono par instantly publish ho jaye? ${brand} banata hai aapke content creation ko superfast aur hassle-free!\n\nCheck out the demo aur aaj hi start karein! 🎯`,
      hashtags: "#ReelsViral #ContentCreator #MarketingHacks #SocialPublisher #Productivity #DailyHustle",
      mediaType: "video",
      videoDuration: 5,
      videoTheme: "neon-cyber",
      videoText: "1 Post ➔ All Social Channels!\nSave 10+ Hours Every Week ⚡",
      mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      platforms: ["instagram", "facebook"],
      isApproved: false,
      isPublished: false,
      createdAt: today,
    },
    {
      id: `ai_post_4_${Date.now()}`,
      postNum: 4,
      tag: "Engagement & Community Poll",
      title: "Question of the Day for Founders",
      caption: `🤔 Founders & Business Owners, hume batayein:\n\nAapka sabse zyada time kahan lagta hai?\nA) Content create karne me\nB) Har platform par alag-alag post karne me\nC) Customer replies & analytics dekhne me\n\nDrop your answer (A, B, or C) in comments below! Hum aapko best solution batayenge! 👇✨`,
      hashtags: "#FounderLife #StartupIndia #EntrepreneurMindset #BusinessPoll #SmallBusinessOwner #AskAudience",
      mediaType: "image",
      videoDuration: 5,
      videoTheme: "minimal-dark",
      videoText: "Which Takes Most Time?\nA) Creating or B) Posting Everywhere? 🤔",
      mediaUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1000&auto=format&fit=crop&q=80",
      platforms: ["instagram", "facebook"],
      isApproved: false,
      isPublished: false,
      createdAt: today,
    },
    {
      id: `ai_post_5_${Date.now()}`,
      postNum: 5,
      tag: "Motivation & Behind-the-Scenes",
      title: "Consistency is the Only Secret",
      caption: `💡 Success ek raat me nahi aati, roz ke chhote-chhote consistent steps se aati hai.\n\nRoz naya content post karein, apni audience ke sath engage karein aur results khud dekhein. ${brand} aapke sath hai har step par! 🌟\n\nSave this post for daily motivation and share with a friend who is building their dream business! 🤝`,
      hashtags: "#DailyMotivation #ConsistencyMatters #BuildInPublic #SuccessMindset #InstagramInspiration #DreamBig",
      mediaType: "video",
      videoDuration: 5,
      videoTheme: "ambient-aurora",
      videoText: "Consistency Beats Talent Every Time!\nKeep Posting, Keep Growing 🌟",
      mediaUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1000&auto=format&fit=crop&q=80",
      platforms: ["instagram", "facebook"],
      isApproved: false,
      isPublished: false,
      createdAt: today,
    },
  ];
}

// Helper function to call Gemini API and parse 5 viral posts
async function generateGeminiPosts(
  apiKey: string,
  brand: string,
  niche: string,
  lang: string = "hinglish",
  customTopic?: string
): Promise<any[]> {
  const models = ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.8-flash"];
  const prompt = `You are a world-class viral social media manager for the brand "${brand}".
Niche/Industry: "${niche}".
Language Style: "${lang}" (engaging Hinglish with natural Hindi + English words, relatable and high-converting).
${customTopic ? `Today's specific focus topic: "${customTopic}"` : "Create 5 diverse daily content themes: 1. Actionable Viral Growth Hook, 2. Limited Festive / Promo Offer, 3. 5-Second Video Reel Demo, 4. Interactive Poll / Audience Question, 5. Motivational / Value Story."}

Generate EXACTLY 5 distinct, high-engagement social media posts tailored for Instagram and Facebook.
Return ONLY valid JSON matching this schema:
{
  "posts": [
    {
      "postNum": 1,
      "tag": "Viral Growth Hook",
      "title": "Short punchy title",
      "caption": "Full high-engagement caption with linebreaks, emojis, value proposition, and clear Call To Action (CTA)",
      "hashtags": "#Relevant #Trending #Hashtags (6-8 hashtags)",
      "mediaType": "image" or "video",
      "videoDuration": 5,
      "videoTheme": "gradient-pulse" or "luxury-gold" or "neon-cyber" or "ambient-aurora",
      "videoText": "Punchy 2-line animated hook text for the 5-second video reel (maximum 12 words)"
    }
  ]
}
Make sure posts have varied mediaType (at least two "video" reels and two "image" posts). Return pure JSON only.`;

  let parsedPosts: any[] = [];
  let lastErr = "";

  for (const model of models) {
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
          parsedPosts = parsed.posts;
          break;
        }
      } else if (data.error) {
        lastErr = data.error.message;
      }
    } catch (e: any) {
      lastErr = e.message;
    }
  }

  if (parsedPosts.length === 0) {
    throw new Error(lastErr || "Failed to generate posts from Gemini");
  }

  const stockVideos = [
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
  ];

  const stockImages = [
    "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1000&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1000&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1000&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1000&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1000&auto=format&fit=crop&q=80",
  ];

  const today = new Date().toISOString().split("T")[0];

  return parsedPosts.map((p: any, idx: number) => {
    const isVideo = p.mediaType === "video" || idx % 2 === 0;
    return {
      id: `ai_post_${idx + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      postNum: idx + 1,
      tag: p.tag || `Daily Post ${idx + 1}`,
      title: p.title || `Post Idea ${idx + 1}`,
      caption: p.caption || "",
      hashtags: p.hashtags || "#AnantReach #BusinessGrowth #MarketingHacks",
      mediaType: isVideo ? "video" : "image",
      videoDuration: 5,
      videoTheme: p.videoTheme || (idx % 2 === 0 ? "neon-cyber" : "luxury-gold"),
      videoText: p.videoText || `${brand}\n1-Click Automation 🚀`,
      mediaUrl: isVideo
        ? stockVideos[idx % stockVideos.length]
        : stockImages[idx % stockImages.length],
      platforms: ["instagram", "facebook"],
      isApproved: false,
      isPublished: false,
      createdAt: today,
    };
  });
}

export async function GET() {
  try {
    const config = getGeminiConfig();
    const today = new Date().toISOString().split("T")[0];
    const data = getDailyPostsData();
    let posts = data.posts;
    let isAutoRolledOver = false;

    // AUTOMATIC DAILY ROLLOVER:
    // If today is a new day (e.g. Kal waps naya din shuru hua) ya posts khali hain:
    const isNewDay = !data.lastDate || data.lastDate !== today || posts.length === 0;

    if (isNewDay) {
      // 1. Archive yesterday's approved or published posts so history is preserved
      const previousApproved = posts.filter((p: any) => p.isApproved || p.isPublished);
      const existingArchive = data.archive || [];
      const updatedArchive = [...existingArchive];
      for (const p of previousApproved) {
        if (!updatedArchive.some((a: any) => a.id === p.id)) {
          updatedArchive.push(p);
        }
      }

      // 2. Automatically generate fresh 5 posts for today using connected Gemini API!
      let freshPosts: any[] = [];
      if (config.apiKey && config.apiKey.length > 5) {
        try {
          freshPosts = await generateGeminiPosts(
            config.apiKey,
            config.brandName,
            config.businessNiche,
            config.language
          );
        } catch (e: any) {
          console.warn("Auto Gemini daily generation fallback notice:", e.message);
        }
      }

      if (!freshPosts || freshPosts.length === 0) {
        freshPosts = getDefaultDailyPosts(config.brandName, config.businessNiche);
      }

      posts = freshPosts;
      isAutoRolledOver = true;

      // 3. Save new daily posts with today's date
      saveDailyPostsData({
        posts,
        archive: updatedArchive,
        lastDate: today,
        lastUpdated: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      config: {
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
        isAutoRolledOver,
      },
      archive: data.archive || [],
      posts,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // 1. SAVE GEMINI CONFIG
    if (action === "save_config") {
      const { apiKey, brandName, businessNiche, language } = body;
      const current = getGeminiConfig();
      const updated = {
        apiKey: apiKey !== undefined ? apiKey.trim() : current.apiKey,
        brandName: brandName || current.brandName,
        businessNiche: businessNiche || current.businessNiche,
        language: language || current.language,
      };
      saveGeminiConfig(updated);

      return NextResponse.json({
        success: true,
        message: "Gemini API Configuration successfully save ho gayi!",
        config: {
          hasApiKey: Boolean(updated.apiKey),
          apiKeyMasked: updated.apiKey ? `${updated.apiKey.slice(0, 6)}...${updated.apiKey.slice(-4)}` : "",
          brandName: updated.brandName,
          businessNiche: updated.businessNiche,
        },
      });
    }

    // 2. GENERATE 5 DAILY POSTS WITH GEMINI API
    if (action === "generate_daily_5") {
      const config = getGeminiConfig();
      const userApiKey = body.apiKey ? body.apiKey.trim() : config.apiKey;

      if (!userApiKey) {
        return NextResponse.json(
          { success: false, error: "Kripya Gemini API Key enter karein taaki AI posts generate ho sakein!" },
          { status: 400 }
        );
      }

      const brand = body.brandName || config.brandName || "Anant Reach";
      const niche = body.businessNiche || config.businessNiche || "Social Media & Business Growth";
      const lang = body.language || config.language || "hinglish";
      const customTopic = body.customTopic || "";

      let generatedPosts: any[] = [];
      try {
        generatedPosts = await generateGeminiPosts(userApiKey, brand, niche, lang, customTopic);
      } catch (geminiError: any) {
        console.warn("Gemini fetch warning, generating fallback posts:", geminiError.message);
        generatedPosts = getDefaultDailyPosts(brand, niche);
      }

      if (generatedPosts.length === 0) {
        generatedPosts = getDefaultDailyPosts(brand, niche);
      }

      // Archive previous approved before overwriting
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

      return NextResponse.json({
        success: true,
        message: "🎉 Gemini ne aaj ke 5 viral social posts successfully create kar diye!",
        posts: generatedPosts,
      });
    }

    // 3. EDIT POST ("Mai khud bhi isma change kar saku")
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

    // 4. APPROVE SINGLE POST
    if (action === "approve_post") {
      const { postId } = body;
      const posts = getDailyPosts();
      posts.forEach((p: any) => {
        if (p.id === postId) {
          p.isApproved = true;
        } else {
          p.isApproved = false; // Only 1 approved at a time as requested by user
        }
      });
      saveDailyPosts(posts);

      return NextResponse.json({
        success: true,
        message: "Post approve ho gayi!",
        posts,
      });
    }

    // 5. APPROVE & INSTANTLY PUBLISH TO INSTAGRAM AND FACEBOOK
    if (action === "approve_and_publish") {
      const { postId, userId = "admin_1" } = body;
      const posts = getDailyPosts();
      const post = posts.find((p: any) => p.id === postId);

      if (!post) {
        return NextResponse.json({ success: false, error: "Post nahi mili!" }, { status: 404 });
      }

      post.isApproved = true;

      // Call our social publisher endpoint to publish to linked accounts
      const accounts = await fetchUserSocialAccounts(userId);
      const targetPlatforms = ["instagram", "facebook"].filter((pid) =>
        accounts.some((a: any) => a.id === pid && a.connected)
      );

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
        console.warn("Direct publish dispatch error:", e.message);
        return NextResponse.json({
          success: false,
          error: `Publish server error: ${e.message}`,
        }, { status: 500 });
      }

      if (!publishResult || !publishResult.success) {
        const errorMsg =
          publishResult?.error ||
          publishResult?.results?.find((r: any) => r.error)?.error ||
          "Meta API par post publish nahi ho saki. Kripya Facebook & Instagram account connection check karein.";
        return NextResponse.json({
          success: false,
          error: errorMsg,
          publishResult,
        }, { status: 400 });
      }

      post.isPublished = true;
      post.publishedAt = new Date().toISOString();
      post.publishResults = publishResult.results;
      saveDailyPosts(posts);

      return NextResponse.json({
        success: true,
        message: `🎉 Post approve hokar Facebook & Instagram par successfully live publish ho gayi!`,
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
