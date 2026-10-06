"use client";

import React, { useState, useEffect, useRef } from "react";

interface AIPost {
  id: string;
  postNum: number;
  tag: string;
  title: string;
  caption: string;
  hashtags: string;
  mediaType: "image" | "video";
  videoDuration?: number;
  videoTheme?: "gradient-pulse" | "luxury-gold" | "neon-cyber" | "ambient-aurora";
  videoText?: string;
  mediaUrl: string;
  platforms: string[];
  isApproved: boolean;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
}

interface Props {
  currentUserId: string;
  currentUserName: string;
  onNavigateToPostStudio?: (data?: any) => void;
}

export default function AIPostCreator({
  currentUserId,
  currentUserName,
  onNavigateToPostStudio,
}: Props) {
  const [posts, setPosts] = useState<AIPost[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [customTopic, setCustomTopic] = useState<string>("");
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);

  // Live Publish Feedback Modal State
  const [publishModalResult, setPublishModalResult] = useState<{
    isOpen: boolean;
    status: "publishing" | "success" | "partial" | "error";
    title: string;
    results?: any[];
    error?: string;
  }>({ isOpen: false, status: "publishing", title: "" });

  // Gemini API Key Config State
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [brandNameInput, setBrandNameInput] = useState<string>("Anant Reach");
  const [businessNicheInput, setBusinessNicheInput] = useState<string>(
    "Social Media Growth, Digital Marketing & Business Automation"
  );
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [apiKeyMasked, setApiKeyMasked] = useState<string>("");
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [configSuccessMsg, setConfigSuccessMsg] = useState<string>("");
  const [testResult, setTestResult] = useState<string>("");

  // Edit Post Modal State
  const [editingPost, setEditingPost] = useState<AIPost | null>(null);
  const [editCaption, setEditCaption] = useState<string>("");
  const [editHashtags, setEditHashtags] = useState<string>("");
  const [editTitle, setEditTitle] = useState<string>("");
  const [editTag, setEditTag] = useState<string>("");
  const [editMediaType, setEditMediaType] = useState<"image" | "video">("image");
  const [editVideoText, setEditVideoText] = useState<string>("");
  const [editVideoTheme, setEditVideoTheme] = useState<string>("gradient-pulse");
  const [editMediaUrl, setEditMediaUrl] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [isUploadingEditMedia, setIsUploadingEditMedia] = useState<boolean>(false);

  // Ready 5-Sec Video Reel Presets
  const reelVideoPresets = [
    {
      name: "🚀 Tech & Growth Loop",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      theme: "neon-cyber",
    },
    {
      name: "✨ Luxury Gold Motion",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      theme: "luxury-gold",
    },
    {
      name: "🔥 High-Impact Energy",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      theme: "gradient-pulse",
    },
    {
      name: "⚡ Dynamic Business Flow",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
      theme: "ambient-aurora",
    },
  ];

  // Upload video/image from computer inside Edit modal
  const handleEditMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v|avi|mkv)$/i.test(file.name);
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      alert("Kripya sirf Video / Reel (MP4, MOV, WEBM) ya Photo upload karein!");
      return;
    }

    if (isVideo) {
      setEditMediaType("video");
    } else {
      setEditMediaType("image");
    }

    // Instant local preview
    try {
      const localUrl = URL.createObjectURL(file);
      setEditMediaUrl(localUrl);
    } catch {}

    setIsUploadingEditMedia(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/social/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setEditMediaUrl(data.url);
      }
    } catch (err) {
      console.warn("Upload error:", err);
      // Fallback to FileReader data URL
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setEditMediaUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingEditMedia(false);
    }
  };

  // Quick card video upload directly on 5 daily cards
  const handleCardVideoUpload = async (postId: string, file: File) => {
    const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v|avi|mkv)$/i.test(file.name);
    if (!isVideo) {
      alert("Kripya video file (MP4, WEBM, MOV) select karein!");
      return;
    }

    let uploadedUrl = "";
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/social/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        uploadedUrl = data.url;
      }
    } catch (err) {
      console.warn("Card upload err:", err);
    }

    if (!uploadedUrl) {
      try {
        uploadedUrl = URL.createObjectURL(file);
      } catch {}
    }

    if (uploadedUrl) {
      try {
        const updateRes = await fetch("/api/social/ai-daily-posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_post",
            postId,
            updatedFields: {
              mediaType: "video",
              mediaUrl: uploadedUrl,
            },
          }),
        });
        const updateData = await updateRes.json();
        if (updateData.success && updateData.posts) {
          setPosts(updateData.posts);
          alert("✓ Video successfully add ho gayi!");
        }
      } catch (err) {
        console.warn("Update post err:", err);
      }
    }
  };

  // 5-Second Video Previewer State (Track active playing post)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState<{ [postId: string]: number }>({});
  const progressTimerRef = useRef<any>(null);

  // Active Tab: 'daily' (Today's 5 Posts) vs 'history' (Approved Posts Archive)
  const [activeTab, setActiveTab] = useState<"daily" | "approved">("daily");

  const [archivePosts, setArchivePosts] = useState<AIPost[]>([]);

  // Fetch initial posts & config
  const fetchPostsAndConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/social/ai-daily-posts");
      const data = await res.json();
      if (data.success) {
        if (data.posts && Array.isArray(data.posts)) {
          setPosts(data.posts);
        }
        if (data.archive && Array.isArray(data.archive)) {
          setArchivePosts(data.archive);
        }
        if (data.config) {
          setHasApiKey(data.config.hasApiKey);
          setApiKeyMasked(data.config.apiKeyMasked || "");
          setBrandNameInput(data.config.brandName || "Anant Reach");
          setBusinessNicheInput(
            data.config.businessNiche ||
              "Social Media Growth, Digital Marketing & Business Automation"
          );
        }
      }
    } catch (e) {
      console.warn("AI posts fetch notice:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPostsAndConfig();
  }, []);

  // 5-Second Video Player Timer Controller
  useEffect(() => {
    if (playingVideoId) {
      // 5-second animation countdown timer (50ms interval = 100 ticks)
      const startTime = Date.now();
      const durationMs = 5000;

      progressTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min(100, Math.floor((elapsed / durationMs) * 100));

        setVideoProgress((prev) => ({
          ...prev,
          [playingVideoId]: pct,
        }));

        if (pct >= 100) {
          // Loop or pause
          setTimeout(() => {
            setVideoProgress((prev) => ({ ...prev, [playingVideoId]: 0 }));
          }, 400);
        }
      }, 50);

      return () => {
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      };
    }
  }, [playingVideoId]);

  // Toggle Play/Pause for 5-sec video post
  const handleTogglePlay = (postId: string) => {
    if (playingVideoId === postId) {
      setPlayingVideoId(null);
    } else {
      setPlayingVideoId(postId);
      setVideoProgress((prev) => ({ ...prev, [postId]: 0 }));
    }
  };

  // Save Gemini API Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setConfigSuccessMsg("");
    setTestResult("");
    try {
      const res = await fetch("/api/social/ai-daily-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_config",
          apiKey: apiKeyInput,
          brandName: brandNameInput,
          businessNiche: businessNicheInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConfigSuccessMsg("🎉 Gemini API Key successfully connected & saved!");
        setHasApiKey(data.config.hasApiKey);
        setApiKeyMasked(data.config.apiKeyMasked || "");
        setTimeout(() => setShowConfigModal(false), 1500);
      } else {
        alert(data.error || "Failed to save configuration");
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Test Gemini Key Connection
  const handleTestGeminiKey = async () => {
    if (!apiKeyInput.trim() && !hasApiKey) {
      alert("Kripya pehle Gemini API Key enter karein!");
      return;
    }
    setTestResult("Testing connection with Google Gemini 1.5 Flash...");
    try {
      const keyToTest = apiKeyInput.trim();
      const testRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keyToTest}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Say 'Gemini Active' in 2 words." }] }],
          }),
        }
      );
      const testData = await testRes.json();
      if (testData.candidates?.[0]?.content?.parts?.[0]?.text) {
        setTestResult("✅ Google Gemini API Connection Verified! Model: Gemini 1.5 Flash");
      } else if (testData.error) {
        setTestResult(`❌ Error: ${testData.error.message}`);
      } else {
        setTestResult("❌ Could not verify API key");
      }
    } catch (e: any) {
      setTestResult(`❌ Connection Error: ${e.message}`);
    }
  };

  // Generate 5 Fresh Posts with Gemini
  const handleGenerate5Posts = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/social/ai-daily-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_daily_5",
          brandName: brandNameInput,
          businessNiche: businessNicheInput,
          customTopic: customTopic.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.posts) {
        setPosts(data.posts);
        alert("🎉 Google Gemini ne aaj ke 5 viral posts & reels successfully generate kar diye!");
      } else {
        alert(data.error || "Generation error");
      }
    } catch (e: any) {
      alert(`Generation failed: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Approve a single post for user's channel ("jismai se mai koi ek post approve karuna")
  const handleApprovePost = async (postId: string) => {
    try {
      const res = await fetch("/api/social/ai-daily-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_post",
          postId,
        }),
      });
      const data = await res.json();
      if (data.success && data.posts) {
        setPosts(data.posts);
        const approved = data.posts.find((p: any) => p.id === postId);
        alert(`⭐ '${approved?.title || "Post"}' ko aaj ke liye channel par APPROVE kar diya gaya hai! Ab aap ise Publish kar sakte hain.`);
      }
    } catch (e: any) {
      alert(`Approval error: ${e.message}`);
    }
  };

  // Direct Publish to Facebook & Instagram with Real-Time Meta Status
  const handleApproveAndPublish = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    setPublishingPostId(postId);
    setPublishModalResult({
      isOpen: true,
      status: "publishing",
      title: post.title,
    });

    try {
      const isVideoReel = post.mediaType === "video";
      const targetPlatforms = ["instagram", "facebook"];

      // 1. Direct call to /api/social/publish
      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          caption: `${post.caption}\n\n${post.hashtags}`,
          mediaUrl: post.mediaUrl,
          mediaType: post.mediaType,
          postFormat: isVideoReel ? "reel" : "feed",
          isReel: isVideoReel,
          platforms: targetPlatforms,
          author: currentUserName,
          scheduleMode: "now",
        }),
      });

      const pubData = await res.json();

      if (pubData.success && pubData.successCount > 0) {
        // 2. Mark post as approved & published in state and persistence
        await fetch("/api/social/ai-daily-posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_post",
            postId: post.id,
            updatedFields: {
              isApproved: true,
              isPublished: true,
              publishedAt: new Date().toISOString(),
              publishResults: pubData.results,
            },
          }),
        });

        setPublishModalResult({
          isOpen: true,
          status: "success",
          title: post.title,
          results: pubData.results,
        });

        fetchPostsAndConfig();
      } else {
        const errorDetail =
          pubData.error ||
          pubData.results?.find((r: any) => r.error)?.error ||
          "Meta Graph API se response nahi mila.";

        setPublishModalResult({
          isOpen: true,
          status: "error",
          title: post.title,
          error: errorDetail,
          results: pubData.results,
        });
      }
    } catch (e: any) {
      setPublishModalResult({
        isOpen: true,
        status: "error",
        title: post.title,
        error: `Connection error: ${e.message}`,
      });
    } finally {
      setPublishingPostId(null);
    }
  };

  // Open Edit Modal for a post ("Mai khud bhi isma change kar saku")
  const handleOpenEditModal = (post: AIPost) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditTag(post.tag);
    setEditCaption(post.caption);
    setEditHashtags(post.hashtags);
    setEditMediaType(post.mediaType);
    setEditVideoText(post.videoText || "");
    setEditVideoTheme(post.videoTheme || "gradient-pulse");
    setEditMediaUrl(post.mediaUrl);
  };

  // Save changes to post
  const handleSavePostEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch("/api/social/ai-daily-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_post",
          postId: editingPost.id,
          updatedFields: {
            title: editTitle,
            tag: editTag,
            caption: editCaption,
            hashtags: editHashtags,
            mediaType: editMediaType,
            videoText: editVideoText,
            videoTheme: editVideoTheme,
            mediaUrl: editMediaUrl,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.posts) {
        setPosts(data.posts);
        setEditingPost(null);
        alert("✓ Post me aapke changes successfully save ho gaye!");
      } else {
        alert(data.error || "Update failed");
      }
    } catch (e: any) {
      alert(`Edit error: ${e.message}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const approvedPost = posts.find((p) => p.isApproved);
  const currentApproved = posts.filter((p) => p.isApproved || p.isPublished);
  const approvedHistory = [
    ...currentApproved,
    ...archivePosts.filter((a) => !currentApproved.some((c) => c.id === a.id)),
  ];

  // Background gradient map for 5-sec video player themes
  const themeGradients: { [key: string]: string } = {
    "gradient-pulse": "from-purple-900 via-indigo-900 to-pink-900",
    "luxury-gold": "from-amber-950 via-yellow-900 to-stone-900",
    "neon-cyber": "from-cyan-950 via-blue-950 to-indigo-950",
    "ambient-aurora": "from-emerald-950 via-teal-900 to-indigo-950",
  };

  return (
    <div className="space-y-6 pb-12">
      {/* =========================================================================
          HERO BANNER: AI POST CREATOR & GEMINI STATUS
          ========================================================================= */}
      <div className="bg-[#111827] border-2 border-purple-500/50 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 flex items-center justify-center text-3xl shadow-xl shadow-purple-950/50 shrink-0">
              🤖
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  🟢 Daily Auto-Pilot Active • Kal Waps 5 Naye Posts Auto-Create Honge
                </span>
                {hasApiKey ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-[11px] font-mono font-bold flex items-center gap-1">
                    <span>⚡</span> Gemini Key Active ({apiKeyMasked || "Connected"})
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold flex items-center gap-1">
                    <span>⚠️</span> API Key Required
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>✨</span> AI Daily Auto Post & 5-Second Reel Studio
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl font-medium">
                Gemini AI se roz auto 5 posts & 5-second video reels banayein. Unme se koi ek post apne channel ke liye approve aur modify karein!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-4 py-2.5 bg-[#1a233a] hover:bg-slate-800 text-purple-200 hover:text-white border-2 border-purple-500/40 hover:border-purple-400 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
            >
              <span>⚙️</span>
              <span>{hasApiKey ? "Update Gemini Key" : "Connect Gemini API Key"}</span>
            </button>

            {onNavigateToPostStudio && (
              <button
                onClick={onNavigateToPostStudio}
                className="px-4 py-2.5 bg-[#0f172a] hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>✍️</span>
                <span>Manual Post Studio</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Topic & Refresh Control */}
        <div className="mt-5 pt-4 border-t border-slate-700/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm">🎯</span>
            <input
              type="text"
              placeholder="Custom topic ya offer daalein (optional: e.g. Festive Offer, Monday Motivation, New Feature)..."
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              className="w-full bg-[#070b14] border-2 border-slate-700 focus:border-purple-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none transition"
            />
          </div>

          <button
            onClick={handleGenerate5Posts}
            disabled={isGenerating}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-600 hover:from-purple-500 hover:to-pink-500 text-white font-black rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-950/60 active:scale-95 shrink-0"
          >
            <span className={isGenerating ? "animate-spin" : ""}>⚡</span>
            <span>{isGenerating ? "Gemini Generating 5 Posts..." : "Generate 5 Fresh Posts Now"}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          CHANNEL APPROVAL NOTICE (WHEN 1 POST IS APPROVED)
          ========================================================================= */}
      {approvedPost && (
        <div className="bg-gradient-to-r from-amber-950/90 via-[#18181b] to-emerald-950/90 border-2 border-amber-400/80 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-2xl shrink-0">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                  Approved For Today's Channel:
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold font-mono">
                  Post #{approvedPost.postNum}
                </span>
                {approvedPost.mediaType === "video" && (
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold">
                    🎬 5s Reel
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-white mt-0.5">{approvedPost.title}</h3>
              <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">{approvedPost.caption}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
            {onNavigateToPostStudio && (
              <button
                onClick={() =>
                  onNavigateToPostStudio({
                    caption: `${approvedPost.caption}\n\n${approvedPost.hashtags}`,
                    mediaUrl: approvedPost.mediaUrl,
                    mediaType: approvedPost.mediaType,
                    postFormat: approvedPost.mediaType === "video" ? "reel" : "feed",
                  })
                }
                className="px-3.5 py-2 bg-[#0c1322] hover:bg-slate-800 text-indigo-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>✍️</span>
                <span>Open in Post Studio</span>
              </button>
            )}
            <button
              onClick={() => handleOpenEditModal(approvedPost)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>✏️</span>
              <span>Edit Details</span>
            </button>
            <button
              onClick={() => handleApproveAndPublish(approvedPost.id)}
              disabled={publishingPostId === approvedPost.id || approvedPost.isPublished}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-lg ${
                approvedPost.isPublished
                  ? "bg-emerald-700 text-white cursor-default"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-950/60"
              }`}
            >
              <span>{publishingPostId === approvedPost.id ? "⏳" : approvedPost.isPublished ? "✓" : "🚀"}</span>
              <span>
                {publishingPostId === approvedPost.id
                  ? "Publishing to Meta..."
                  : approvedPost.isPublished
                  ? "Published to Meta Live!"
                  : "Publish to FB & Instagram"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW SWITCHER TABS: TODAY'S 5 POSTS vs APPROVED ARCHIVE
          ========================================================================= */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("daily")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeTab === "daily"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-950/60"
                : "text-slate-300 hover:text-white bg-slate-900 border border-slate-800"
            }`}
          >
            <span>📅 Today's 5 Daily AI Posts</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono">5</span>
          </button>

          <button
            onClick={() => setActiveTab("approved")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeTab === "approved"
                ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-950/60"
                : "text-slate-300 hover:text-white bg-slate-900 border border-slate-800"
            }`}
          >
            <span>⭐ Channel Approved & Published</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono">
              {approvedHistory.length}
            </span>
          </button>
        </div>

        <div className="text-xs font-mono font-bold text-slate-400 hidden sm:block">
          Select & Approve Any 1 Post For Today's Channel
        </div>
      </div>

      {/* =========================================================================
          CARDS GRID: 5 DAILY AI POSTS (WITH 5-SEC VIDEO REELS & IMAGES)
          ========================================================================= */}
      {isLoading ? (
        <div className="p-12 text-center bg-[#111827] rounded-3xl border-2 border-slate-800">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <div className="text-sm font-bold text-slate-200">Gemini AI Posts Load Ho Rahe Hain...</div>
        </div>
      ) : activeTab === "approved" ? (
        /* Approved Posts Tab */
        <div className="space-y-4">
          {approvedHistory.length === 0 ? (
            <div className="p-12 text-center bg-[#111827] rounded-3xl border-2 border-dashed border-slate-800">
              <div className="text-3xl mb-2">⭐</div>
              <div className="text-sm font-bold text-slate-200">Abhi tak koi post approve nahi hui hai.</div>
              <p className="text-xs text-slate-400 mt-1">
                "Today's 5 Daily AI Posts" tab me se kisi ek post par "Approve for My Channel" click karein!
              </p>
            </div>
          ) : (
            approvedHistory.map((post) => (
              <div
                key={post.id}
                className="bg-[#111827] border-2 border-amber-500/50 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0 relative">
                    {post.mediaType === "video" && (post.mediaUrl?.match(/\.(mp4|webm|mov)$/i) || post.mediaUrl?.startsWith("data:video/") || post.mediaUrl?.includes("reel_video") || post.mediaUrl?.includes("commondatastorage")) ? (
                      <video src={post.mediaUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                    ) : (
                      <img src={post.mediaUrl} alt={post.title} className="w-full h-full object-cover" />
                    )}
                    {post.mediaType === "video" && (
                      <span className="absolute bottom-1 right-1 text-[10px] bg-black/80 text-white px-1 rounded font-mono font-bold">
                        5s
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full uppercase">
                        {post.tag}
                      </span>
                      {post.isPublished ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                          ✓ Published to FB & Insta
                        </span>
                      ) : (
                        <span className="text-[10px] bg-yellow-500/20 text-yellow-300 font-bold px-2 py-0.5 rounded-full">
                          ⭐ Approved (Pending Publish)
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-black text-white mt-1">{post.title}</h4>
                    <p className="text-xs text-slate-300 mt-1 line-clamp-1">{post.caption}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenEditModal(post)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    ✏️ Edit
                  </button>
                  {!post.isPublished && (
                    <button
                      onClick={() => handleApproveAndPublish(post.id)}
                      disabled={publishingPostId === post.id}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md"
                    >
                      🚀 Publish Now
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Daily 5 Posts Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {posts.map((post) => {
            const isPlaying = playingVideoId === post.id;
            const progress = videoProgress[post.id] || 0;
            const isVideo = post.mediaType === "video";
            const themeGradient = themeGradients[post.videoTheme || "gradient-pulse"] || "from-purple-900 to-indigo-900";

            return (
              <div
                key={post.id}
                className={`bg-[#111827] rounded-3xl p-5 shadow-2xl transition-all border-2 relative flex flex-col justify-between ${
                  post.isApproved
                    ? "border-amber-400 bg-gradient-to-b from-[#18182b] to-[#121829] ring-2 ring-amber-400/30"
                    : "border-slate-700/80 hover:border-purple-500/50"
                }`}
              >
                {/* Header: Post Number & Tag */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-purple-600 text-white font-mono font-black text-xs flex items-center justify-center shadow-md">
                        #{post.postNum}
                      </span>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-950/80 border border-purple-500/40 px-2 py-0.5 rounded-full">
                          {post.tag}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isVideo ? (
                        <span className="text-[10px] font-black bg-gradient-to-r from-pink-600 to-purple-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span>🎬</span> 5s Reel Video
                        </span>
                      ) : (
                        <span className="text-[10px] font-black bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span>🖼️</span> Image Post
                        </span>
                      )}

                      {post.isApproved && (
                        <span className="text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span>👑</span> Approved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Post Title */}
                  <h3 className="text-base font-black text-white leading-snug mb-3">{post.title}</h3>

                  {/* =====================================================================
                      MEDIA DISPLAY: 5-SECOND VIDEO REEL SIMULATOR vs IMAGE PREVIEW
                      ===================================================================== */}
                  <div className="mb-4">
                    {isVideo ? (
                      /* 5-Second Short Video / Reel Simulator */
                      <div className="relative rounded-2xl overflow-hidden border-2 border-purple-500/40 bg-black aspect-[16/10] sm:aspect-[16/9] shadow-inner group">
                        {/* Background Media */}
                        {post.mediaUrl && (post.mediaUrl.match(/\.(mp4|webm|mov)$/i) || post.mediaUrl.startsWith("data:video/") || post.mediaUrl.includes("commondatastorage") || post.mediaUrl.includes("reel_video")) ? (
                          <video
                            src={post.mediaUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className={`w-full h-full object-cover transition-transform duration-700 ${
                              isPlaying ? "scale-105" : "scale-100"
                            } opacity-80`}
                          />
                        ) : (
                          <img
                            src={post.mediaUrl}
                            alt="Video Scene"
                            className={`w-full h-full object-cover transition-transform duration-700 ${
                              isPlaying ? "scale-105" : "scale-100"
                            } opacity-60`}
                          />
                        )}

                        {/* Animated Gradient Overlay */}
                        <div
                          className={`absolute inset-0 bg-gradient-to-t ${themeGradient} opacity-75 mix-blend-multiply`}
                        ></div>

                        {/* Reel Motion Graphics & Typography Overlay */}
                        <div className="absolute inset-0 flex flex-col justify-between p-4 z-10">
                          {/* Top bar: Reel Badge & Duration */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-black text-white bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md flex items-center gap-1.5 border border-white/20">
                              <span className={`w-2 h-2 rounded-full ${isPlaying ? "bg-red-500 animate-ping" : "bg-purple-400"}`}></span>
                              <span>00:{String(Math.floor((progress / 100) * 5)).padStart(2, "0")} / 00:05 REEL</span>
                            </span>

                            <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/20 flex items-center gap-1">
                              <span>🎵</span> Trending Audio
                            </span>
                          </div>

                          {/* Center: Punchy Video Hook Text */}
                          <div className="my-auto text-center px-4">
                            <div
                              className={`text-base sm:text-lg font-black text-white drop-shadow-lg tracking-tight whitespace-pre-line transition-all duration-300 ${
                                isPlaying ? "scale-105 text-amber-300" : "scale-100"
                              }`}
                            >
                              {post.videoText || "1-Click Multi-Channel Publisher 🚀"}
                            </div>
                            <div className="text-[11px] font-semibold text-purple-200/90 mt-1 drop-shadow">
                              @{brandNameInput.toLowerCase().replace(/\s+/g, "")} • 5-Sec Hook
                            </div>
                          </div>

                          {/* Bottom: Play Controller & Equalizer */}
                          <div>
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <button
                                type="button"
                                onClick={() => handleTogglePlay(post.id)}
                                className="px-3 py-1 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-white/30 active:scale-95"
                              >
                                <span>{isPlaying ? "⏸ Pause" : "▶ Play 5s Reel"}</span>
                              </button>

                              {/* Equalizer animation */}
                              <div className="flex items-center gap-1 h-3">
                                {[40, 75, 100, 60, 90, 45].map((h, i) => (
                                  <div
                                    key={i}
                                    style={{ height: isPlaying ? `${h}%` : "30%" }}
                                    className="w-1 bg-purple-400 rounded-full transition-all duration-150"
                                  ></div>
                                ))}
                              </div>
                            </div>

                            {/* 5-Second Progress Bar */}
                            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden backdrop-blur-sm">
                              <div
                                style={{ width: `${progress}%` }}
                                className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 h-full transition-all duration-75"
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Standard Image Post Preview */
                      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-950 aspect-[16/10] sm:aspect-[16/9] shadow-inner group">
                        <img src={post.mediaUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 p-3 flex flex-col justify-between">
                          <span className="self-end text-[10px] bg-black/70 backdrop-blur-md text-slate-200 px-2 py-0.5 rounded-md font-mono font-bold border border-white/10">
                            Square / 1:1 Feed Ready
                          </span>
                          <div className="text-xs font-bold text-white drop-shadow-md truncate">
                            {post.title}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Caption & Hashtags Preview */}
                  <div className="bg-[#070b14] border border-slate-800 rounded-2xl p-3.5 mb-4 space-y-2">
                    <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed max-h-28 overflow-y-auto font-normal">
                      {post.caption}
                    </div>
                    <div className="text-[11px] font-mono text-purple-300 font-bold break-words pt-2 border-t border-slate-800">
                      {post.hashtags}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Controls: Edit, Approve & Publish */}
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    {/* User Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(post)}
                      className="px-3 py-2 bg-[#1a233a] hover:bg-slate-800 text-slate-200 border border-slate-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span>✏️</span>
                      <span>Edit</span>
                    </button>

                    {/* Direct Add Video Button */}
                    <label
                      htmlFor={`card-video-upload-${post.id}`}
                      className="px-2.5 py-2 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                      title="Direct video upload from computer"
                    >
                      <span>🎬</span>
                      <span className="hidden sm:inline">Add Video</span>
                    </label>
                    <input
                      id={`card-video-upload-${post.id}`}
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCardVideoUpload(post.id, file);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />

                    {onNavigateToPostStudio && (
                      <button
                        type="button"
                        onClick={() =>
                          onNavigateToPostStudio({
                            caption: `${post.caption}\n\n${post.hashtags}`,
                            mediaUrl: post.mediaUrl,
                            mediaType: post.mediaType,
                            postFormat: post.mediaType === "video" ? "reel" : "feed",
                          })
                        }
                        className="px-2.5 py-2 bg-[#0c1322] hover:bg-slate-800 text-indigo-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Open in Multi-Channel Post Studio"
                      >
                        <span>✍️</span>
                        <span className="hidden sm:inline">Post Studio</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Approve For Channel Button */}
                    {!post.isApproved ? (
                      <button
                        type="button"
                        onClick={() => handleApprovePost(post.id)}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-950/40 active:scale-95"
                      >
                        <span>⭐</span>
                        <span>Approve for Channel</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApproveAndPublish(post.id)}
                        disabled={publishingPostId === post.id || post.isPublished}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md ${
                          post.isPublished
                            ? "bg-emerald-600 text-white cursor-default"
                            : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-950/40"
                        }`}
                      >
                        <span>{publishingPostId === post.id ? "⏳" : post.isPublished ? "✓" : "🚀"}</span>
                        <span>
                          {publishingPostId === post.id
                            ? "Publishing..."
                            : post.isPublished
                            ? "Published Live!"
                            : "Publish to FB & Insta"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL 1: GEMINI API KEY & BRAND SETTINGS MODAL
          ========================================================================= */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-[#111827] border-2 border-purple-500/60 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/50 flex items-center justify-center text-xl">
                  🔑
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Google Gemini API Configuration</h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Enter your Gemini API key to power daily auto 5 posts and 5s video reels:
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white p-1 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {configSuccessMsg && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs rounded-xl font-bold">
                {configSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-white block mb-1">
                  Gemini API Key: <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  placeholder={hasApiKey ? `Current: ${apiKeyMasked}` : "AIzaSy..."}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full bg-[#070b14] border-2 border-slate-700 focus:border-purple-400 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 font-mono focus:outline-none"
                />
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                  <span>Get free key from Google AI Studio</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-400 hover:underline font-bold"
                  >
                    Open AI Studio ↗
                  </a>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">Brand / Channel Name:</label>
                <input
                  type="text"
                  value={brandNameInput}
                  onChange={(e) => setBrandNameInput(e.target.value)}
                  placeholder="e.g. Anant Reach"
                  className="w-full bg-[#070b14] border-2 border-slate-700 focus:border-purple-400 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">Business Niche / Focus:</label>
                <input
                  type="text"
                  value={businessNicheInput}
                  onChange={(e) => setBusinessNicheInput(e.target.value)}
                  placeholder="e.g. Fashion, Electronics, Real Estate, Consulting"
                  className="w-full bg-[#070b14] border-2 border-slate-700 focus:border-purple-400 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              {testResult && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-700 text-xs font-mono">
                  {testResult}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTestGeminiKey}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  ⚡ Test Key
                </button>
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black rounded-xl text-xs transition cursor-pointer shadow-lg shadow-purple-950/60"
                >
                  {isSavingConfig ? "Saving..." : "Save Gemini Key & Config"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: USER EDIT & CUSTOMIZATION MODAL ("Mai khud bhi isma change kar saku")
          ========================================================================= */}
      {editingPost && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-[#111827] border-2 border-indigo-500/60 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/50 flex items-center justify-center text-xl">
                  ✏️
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Customize Post #{editingPost.postNum}</h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Apne hisaab se caption, hashtags, media type aur hook text change karein:
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingPost(null)}
                className="text-slate-400 hover:text-white p-1 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePostEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Post Title:</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-[#070b14] border-2 border-slate-700 focus:border-indigo-400 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white block mb-1">Content Category / Tag:</label>
                  <input
                    type="text"
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value)}
                    className="w-full bg-[#070b14] border-2 border-slate-700 focus:border-indigo-400 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Format Switcher: Image Post vs 5s Video Reel */}
              <div>
                <label className="text-xs font-bold text-white block mb-1.5">Post Format:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditMediaType("image")}
                    className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex items-center gap-2.5 ${
                      editMediaType === "image"
                        ? "bg-purple-950/80 border-purple-400 text-white font-black"
                        : "bg-slate-900 border-slate-700 text-slate-300"
                    }`}
                  >
                    <span className="text-xl">🖼️</span>
                    <div>
                      <div className="text-xs font-bold">Square Image Post</div>
                      <div className="text-[10px] text-slate-400">Standard Meta feed</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditMediaType("video")}
                    className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex items-center gap-2.5 ${
                      editMediaType === "video"
                        ? "bg-purple-950/80 border-purple-400 text-white font-black"
                        : "bg-slate-900 border-slate-700 text-slate-300"
                    }`}
                  >
                    <span className="text-xl">🎬</span>
                    <div>
                      <div className="text-xs font-bold">5-Second Video Reel</div>
                      <div className="text-[10px] text-purple-300">Instagram & FB Reel</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 5-Sec Video Reel Specific Controls */}
              {editMediaType === "video" && (
                <div className="p-4 bg-slate-950 border border-purple-500/40 rounded-2xl space-y-3">
                  <div>
                    <label className="text-xs font-bold text-purple-300 block mb-1">
                      🎬 5-Second Reel On-Screen Text (Hook):
                    </label>
                    <textarea
                      rows={2}
                      value={editVideoText}
                      onChange={(e) => setEditVideoText(e.target.value)}
                      placeholder="e.g. Stop Scrolling! 🚀\nGrow Your Business 3x Today"
                      className="w-full bg-[#070b14] border-2 border-slate-700 focus:border-purple-400 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    ></textarea>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Reel Motion Theme:</label>
                    <select
                      value={editVideoTheme}
                      onChange={(e) => setEditVideoTheme(e.target.value)}
                      className="w-full bg-[#070b14] border-2 border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="gradient-pulse">Gradient Pulse (Purple / Neon)</option>
                      <option value="luxury-gold">Luxury Gold (Warm Amber / Gold)</option>
                      <option value="neon-cyber">Neon Cyber (Cyan / Blue)</option>
                      <option value="ambient-aurora">Ambient Aurora (Emerald / Teal)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Caption */}
              <div>
                <label className="text-xs font-bold text-white block mb-1">Caption / Message:</label>
                <textarea
                  rows={5}
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full bg-[#070b14] border-2 border-slate-700 focus:border-indigo-400 rounded-xl p-3 text-xs text-white leading-relaxed focus:outline-none"
                  required
                ></textarea>
              </div>

              {/* Hashtags */}
              <div>
                <label className="text-xs font-bold text-white block mb-1">Hashtags:</label>
                <input
                  type="text"
                  value={editHashtags}
                  onChange={(e) => setEditHashtags(e.target.value)}
                  className="w-full bg-[#070b14] border-2 border-slate-700 focus:border-indigo-400 rounded-xl p-2.5 text-xs text-purple-300 font-mono focus:outline-none"
                />
              </div>

              {/* Media File Upload & Preview Section */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>🎬</span>
                    <span>{editMediaType === "video" ? "Attach Reel Video (MP4 / MOV)" : "Attach Photo (JPG / PNG)"}:</span>
                  </label>
                  {isUploadingEditMedia && (
                    <span className="text-[11px] font-bold text-pink-400 flex items-center gap-1 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                      Uploading video...
                    </span>
                  )}
                </div>

                {/* Upload File From Computer Button */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <label
                    htmlFor="edit-media-file-input"
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800/80 hover:to-indigo-800/80 border-2 border-dashed border-purple-500/60 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition text-xs font-bold text-white shadow-inner group"
                  >
                    <span className="text-lg group-hover:scale-110 transition">📁</span>
                    <span>Upload {editMediaType === "video" ? "Video (MP4 / MOV)" : "Photo"} From Computer</span>
                  </label>
                  <input
                    id="edit-media-file-input"
                    type="file"
                    accept="video/*,image/*"
                    onChange={handleEditMediaUpload}
                    onClick={(e: any) => {
                      e.target.value = null;
                    }}
                    className="hidden"
                  />
                </div>

                {/* 1-Click 5-Sec Video Reel Presets (If video mode) */}
                {editMediaType === "video" && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-purple-300">Ya 1-Click Ready 5-Sec Reel Video Select Karein:</div>
                    <div className="grid grid-cols-2 gap-2">
                      {reelVideoPresets.map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => {
                            setEditMediaUrl(preset.url);
                            setEditVideoTheme(preset.theme);
                          }}
                          className={`p-2 rounded-xl text-[11px] font-bold text-left border transition cursor-pointer flex items-center justify-between ${
                            editMediaUrl === preset.url
                              ? "bg-purple-900/80 border-purple-400 text-white shadow-md"
                              : "bg-slate-900/70 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500"
                          }`}
                        >
                          <span className="truncate">{preset.name}</span>
                          {editMediaUrl === preset.url && <span className="text-emerald-400 font-black">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Live Video / Image Playable Preview */}
                {editMediaUrl && (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-purple-500/50 bg-black aspect-video max-h-44 shadow-lg group">
                    {editMediaType === "video" || editMediaUrl.match(/\.(mp4|webm|mov)$/i) || editMediaUrl.startsWith("data:video/") || editMediaUrl.includes("commondatastorage") || editMediaUrl.includes("reel_video") ? (
                      <video
                        src={editMediaUrl}
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={editMediaUrl}
                        alt="Media Preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <span className="absolute top-2 left-2 bg-black/80 backdrop-blur-md text-[9px] font-mono font-bold text-purple-300 px-2 py-0.5 rounded pointer-events-none">
                      {editMediaType === "video" ? "🎬 LIVE REEL PREVIEW" : "🖼️ IMAGE PREVIEW"}
                    </span>
                  </div>
                )}

                {/* Secondary URL Input */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Direct Media URL (Optional):</label>
                  <input
                    type="text"
                    value={editMediaUrl}
                    onChange={(e) => setEditMediaUrl(e.target.value)}
                    placeholder="https://... ya /uploads/..."
                    className="w-full bg-[#070b14] border border-slate-700 focus:border-indigo-400 rounded-xl p-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-xl text-xs transition cursor-pointer shadow-lg"
                >
                  {isSavingEdit ? "Saving Changes..." : "✓ Save & Update Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: LIVE META GRAPH API PUBLISH STATUS MODAL
          ========================================================================= */}
      {publishModalResult.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-[#111827] border-2 border-emerald-500/60 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                    publishModalResult.status === "publishing"
                      ? "bg-amber-500/20 text-amber-300"
                      : publishModalResult.status === "success"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  {publishModalResult.status === "publishing" ? "⏳" : publishModalResult.status === "success" ? "✓" : "⚠️"}
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {publishModalResult.status === "publishing"
                      ? "Meta Graph API Dispatching..."
                      : publishModalResult.status === "success"
                      ? "Post Successfully Published Live!"
                      : "Publishing Status Notice"}
                  </h3>
                  <p className="text-xs text-slate-300 truncate max-w-xs">{publishModalResult.title}</p>
                </div>
              </div>
              {publishModalResult.status !== "publishing" && (
                <button
                  onClick={() => setPublishModalResult({ isOpen: false, status: "publishing", title: "" })}
                  className="text-slate-400 hover:text-white p-1 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {publishModalResult.status === "publishing" && (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="text-sm font-bold text-white">Direct Meta Graph API Connect Ho Raha Hai...</div>
                <div className="text-xs text-slate-300">
                  Instagram Reels & Facebook Feed par direct media container dispatch ho raha hai.
                </div>
              </div>
            )}

            {publishModalResult.status === "success" && (
              <div className="space-y-3 py-2">
                <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/60 rounded-2xl text-xs text-emerald-200">
                  🎉 <strong>Mubarak!</strong> Post seedhe aapke Facebook Page aur Instagram Account par LIVE publish ho gayi hai!
                </div>

                {publishModalResult.results && (
                  <div className="space-y-2">
                    {publishModalResult.results.map((res: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          res.status === "SUCCESS"
                            ? "bg-[#062419] border-emerald-500/50 text-emerald-200"
                            : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{res.platform === "instagram" ? "📸" : "👥"}</span>
                          <div>
                            <div className="font-bold capitalize">{res.platformName || res.platform}</div>
                            <div className="text-[10px] text-slate-400">{res.handle || "Connected Channel"}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full font-mono font-bold text-[10px] ${
                              res.status === "SUCCESS"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-rose-500/20 text-rose-300"
                            }`}
                          >
                            {res.status === "SUCCESS" ? "✓ LIVE" : "FAILED"}
                          </span>
                          {res.postId && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              ID: {res.postId.slice(-8)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {publishModalResult.status === "error" && (
              <div className="space-y-3 py-2">
                <div className="p-3.5 bg-rose-950/80 border border-rose-500/60 rounded-2xl text-xs text-rose-200">
                  <strong>Notice:</strong> {publishModalResult.error || "Meta Graph API publishing glitch"}
                </div>
                <p className="text-[11px] text-slate-400">
                  Aap "Post Studio" me jakar Facebook ya Instagram ko reconnect kar sakte hain ya direct post kar sakte hain.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setPublishModalResult({ isOpen: false, status: "publishing", title: "" })}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Samajh Gaya (Done)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
