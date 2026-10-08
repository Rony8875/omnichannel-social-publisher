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
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);

  // Form States (Requested by User: Title, Description, Attachment Type, Post Count)
  const [formTitle, setFormTitle] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formAttachmentType, setFormAttachmentType] = useState<"image" | "video" | "mix">("mix");
  const [formPostCount, setFormPostCount] = useState<number>(5);
  const [formTone, setFormTone] = useState<string>("viral");
  const [formLanguage, setFormLanguage] = useState<string>("hinglish");

  // Live Publish Feedback Modal State
  const [publishModalResult, setPublishModalResult] = useState<{
    isOpen: boolean;
    status: "publishing" | "success" | "partial" | "error";
    title: string;
    results?: any[];
    error?: string;
  }>({ isOpen: false, status: "publishing", title: "" });

  // AI API Key & Provider Config State (Supabase Integrated)
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [aiProvider, setAiProvider] = useState<"gemini" | "openai">("gemini");
  const [aiModel, setAiModel] = useState<string>("gemini-1.5-flash");
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [brandNameInput, setBrandNameInput] = useState<string>("Anant Reach");
  const [businessNicheInput, setBusinessNicheInput] = useState<string>(
    "Social Media Growth, Digital Marketing & Business Automation"
  );
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [apiKeyMasked, setApiKeyMasked] = useState<string>("");
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
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
      url: "https://filesamples.com/samples/video/mp4/sample_640x360.mp4",
      theme: "neon-cyber",
    },
    {
      name: "✨ Motion Visual Flow",
      url: "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/person-bicycle-car-detection.mp4",
      theme: "luxury-gold",
    },
    {
      name: "🔥 High-Impact Energy",
      url: "https://filesamples.com/samples/video/mp4/sample_960x400_ocean_with_audio.mp4",
      theme: "gradient-pulse",
    },
    {
      name: "⚡ Dynamic Business Reel",
      url: "https://filesamples.com/samples/video/mp4/sample_960x540.mp4",
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

  // 5-Second Video Previewer State (Track active playing post)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState<{ [postId: string]: number }>({});
  const progressTimerRef = useRef<any>(null);

  // Active Tab: 'daily' (Today's Posts) vs 'history' (Approved Posts Archive)
  const [activeTab, setActiveTab] = useState<"daily" | "approved">("daily");
  const [archivePosts, setArchivePosts] = useState<AIPost[]>([]);

  // Fetch initial posts & config from Supabase backend
  const fetchPostsAndConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/social/ai-daily-posts?userId=${encodeURIComponent(currentUserId || "admin_1")}`);
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
          setAiProvider(data.config.provider || "gemini");
          setAiModel(data.config.model || "gemini-1.5-flash");
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
  }, [currentUserId]);

  // 5-Second Video Player Timer Controller
  useEffect(() => {
    if (playingVideoId) {
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

  // Save AI Config to Supabase Database
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
          userId: currentUserId || "admin_1",
          provider: aiProvider,
          model: aiModel,
          apiKey: apiKeyInput,
          brandName: brandNameInput,
          businessNiche: businessNicheInput,
          language: formLanguage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConfigSuccessMsg(`🎉 ${aiProvider.toUpperCase()} API Key Supabase Database me save ho gayi!`);
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

  // Test AI Key Connection Live
  const handleTestKey = async () => {
    if (!apiKeyInput.trim() && !hasApiKey) {
      alert("Kripya pehle AI API Key enter karein!");
      return;
    }
    setIsTestingKey(true);
    setTestResult(`Testing connection with ${aiProvider.toUpperCase()} (${aiModel})...`);
    try {
      const res = await fetch("/api/social/ai-daily-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_key",
          provider: aiProvider,
          apiKey: apiKeyInput.trim(),
          model: aiModel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(data.message || "✅ API Connection Verified!");
      } else {
        setTestResult(`❌ Error: ${data.error || "API verification failed"}`);
      }
    } catch (e: any) {
      setTestResult(`❌ Connection Error: ${e.message}`);
    } finally {
      setIsTestingKey(false);
    }
  };

  // Generate Custom Posts Batch (User's Form Handler)
  const handleGenerateCustomBatch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await fetch("/api/social/ai-daily-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_custom_batch",
          userId: currentUserId || "admin_1",
          title: formTitle.trim(),
          description: formDescription.trim(),
          attachmentType: formAttachmentType,
          postCount: formPostCount,
          tone: formTone,
          language: formLanguage,
          brandName: brandNameInput,
          businessNiche: businessNicheInput,
          provider: aiProvider,
          model: aiModel,
        }),
      });
      const data = await res.json();
      if (data.success && data.posts) {
        setPosts(data.posts);
        alert(data.message || `🎉 AI ne ${data.posts.length} posts successfully create kar diye!`);
      } else {
        alert(data.error || "Generation error");
      }
    } catch (e: any) {
      alert(`Generation failed: ${e.message}`);
    } finally {
      setIsGenerating(false);
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

  // Open Edit Modal for a post
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

  // Delete a single post
  const handleDeletePost = async (postId: string) => {
    if (!confirm("Kya aap is post ko delete karna chahte hain?")) return;
    try {
      const res = await fetch("/api/social/ai-daily-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_post", postId }),
      });
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts || []);
      }
    } catch (e: any) {
      console.warn("Delete post error:", e);
    }
  };

  // Clear all posts (delete all dummy or generated posts)
  const handleClearAllPosts = async () => {
    if (!confirm("Kya aap sach me sabhi posts ko delete karna chahte hain?")) return;
    try {
      const res = await fetch("/api/social/ai-daily-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_all_posts" }),
      });
      const data = await res.json();
      if (data.success) {
        setPosts([]);
        setArchivePosts([]);
        alert("✓ Sabhi posts successfully delete ho gaye!");
      }
    } catch (e: any) {
      console.warn("Clear all posts error:", e);
    }
  };

  const approvedPost = posts.find((p) => p.isApproved);
  const currentApproved = posts.filter((p) => p.isApproved || p.isPublished);
  const approvedHistory = [
    ...currentApproved,
    ...archivePosts.filter((a) => !currentApproved.some((c) => c.id === a.id)),
  ];

  const themeGradients: { [key: string]: string } = {
    "gradient-pulse": "from-purple-900 via-indigo-900 to-pink-900",
    "luxury-gold": "from-amber-950 via-yellow-900 to-stone-900",
    "neon-cyber": "from-cyan-950 via-blue-950 to-indigo-950",
    "ambient-aurora": "from-emerald-950 via-teal-900 to-indigo-950",
  };

  return (
    <div className="space-y-6 pb-16">
      {/* =========================================================================
          HERO BANNER: AI POST CREATOR & SUPABASE DATABASE KEY STATUS
          ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-900/90 via-[#13132e]/80 to-slate-900/90 border border-purple-500/25 rounded-3xl p-5 sm:p-7 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-pink-600/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 flex items-center justify-center text-3xl shadow-xl shadow-purple-950/50 shrink-0">
              🤖
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  AI Post Studio Active
                </span>
                {hasApiKey ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-300 text-[11px] font-mono font-medium flex items-center gap-1">
                    <span>⚡</span> {aiProvider.toUpperCase()} Key Active ({apiKeyMasked || "Saved in DB"})
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[11px] font-medium flex items-center gap-1">
                    <span>⚠️</span> AI Key Optional (Fallback Ready)
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 text-[11px] font-medium flex items-center gap-1">
                  <span>💾</span> Supabase DB Sync
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 tracking-tight">
                <span>✨</span> AI Multi-Post & 5-Second Reel Creator
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl font-normal leading-relaxed">
                Apna Post Title, Description, Attachment Type (Image ya Video) aur Count select karein — AI turant high-converting posts aur 5-sec reels create karega!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white border border-purple-400/40 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
            >
              <span>🔑</span>
              <span>{hasApiKey ? "Manage AI API Key (DB)" : "Connect AI Key (Supabase)"}</span>
            </button>

            {onNavigateToPostStudio && (
              <button
                onClick={onNavigateToPostStudio}
                className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white border border-slate-700/80 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <span>✍️</span>
                <span>Manual Post Studio</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          POST CREATION FORM (TITLE, DESCRIPTION, ATTACHMENT, COUNT)
          ========================================================================= */}
      <div className="bg-[#0e1424]/90 border-2 border-indigo-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/50 flex items-center justify-center text-xl">
              ✍️
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Create Posts with AI Form
                <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full uppercase">
                  Custom Batch
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Kripya details bharein: Title, Description, Attachment Type aur kitne posts chahiye:
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>Powered by:</span>
            <span className="text-white font-bold bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 font-mono">
              {aiProvider === "gemini" ? "Google Gemini 1.5 Flash" : "OpenAI GPT-4o"}
            </span>
          </div>
        </div>

        <form onSubmit={handleGenerateCustomBatch} className="space-y-5">
          {/* 1. Post Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>📌</span>
                <span>Post Title kya hona chahiye? (Topic / Headline):</span>
              </label>
              <span className="text-[10px] text-slate-400">Required</span>
            </div>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Diwali Mega Sale 50% Off, Top 5 Real Estate Tips, New Gym Membership Offer..."
              className="w-full bg-[#070b14] border-2 border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none transition"
              required
            />

            {/* Quick Topic Suggestion Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] font-bold text-slate-400 mr-1">Quick Ideas:</span>
              {[
                "🎁 50% Flat Mega Sale",
                "🚀 New Product Launch",
                "💡 5 Growth Hacks for Businesses",
                "🔥 Monday Motivation Hustle",
                "⭐ Customer Success Story",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setFormTitle(chip)}
                  className="text-[10px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700 transition cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Post Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>📝</span>
                <span>Description / Details (Kya details ya offer include karni hai?):</span>
              </label>
              <span className="text-[10px] text-slate-400">Context / Prompt</span>
            </div>
            <textarea
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="e.g. Limited period offer till Sunday, free home delivery across India, use code SAVE50, comment 'OFFER' for VIP link, target young entrepreneurs..."
              className="w-full bg-[#070b14] border-2 border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl p-3.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none transition leading-relaxed"
            ></textarea>
          </div>

          {/* 3. Attachment Selection & Post Count Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            {/* Attachment Type: Image ya Video */}
            <div>
              <label className="text-xs font-bold text-white block mb-2 flex items-center gap-1.5">
                <span>📎</span>
                <span>Attachment kya chahiye? (Image ya Video):</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormAttachmentType("image")}
                  className={`p-3 rounded-2xl border-2 text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    formAttachmentType === "image"
                      ? "bg-purple-950/80 border-purple-400 text-white font-black shadow-lg shadow-purple-950/50"
                      : "bg-[#070b14] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  <span className="text-2xl">🖼️</span>
                  <div className="text-xs font-bold">Image</div>
                  <div className="text-[10px] text-slate-400">Photo Post</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormAttachmentType("video")}
                  className={`p-3 rounded-2xl border-2 text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    formAttachmentType === "video"
                      ? "bg-purple-950/80 border-purple-400 text-white font-black shadow-lg shadow-purple-950/50"
                      : "bg-[#070b14] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  <span className="text-2xl">🎬</span>
                  <div className="text-xs font-bold">Video</div>
                  <div className="text-[10px] text-purple-300">5-Sec Reel</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormAttachmentType("mix")}
                  className={`p-3 rounded-2xl border-2 text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    formAttachmentType === "mix"
                      ? "bg-indigo-950/80 border-indigo-400 text-white font-black shadow-lg shadow-indigo-950/50"
                      : "bg-[#070b14] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  <span className="text-2xl">🔀</span>
                  <div className="text-xs font-bold">Mix</div>
                  <div className="text-[10px] text-slate-400">Image + Reel</div>
                </button>
              </div>
            </div>

            {/* Post Count Selection: kitne post create karne hai */}
            <div>
              <label className="text-xs font-bold text-white block mb-2 flex items-center gap-1.5">
                <span>🔢</span>
                <span>Kitne post create karne hai? (Select Count):</span>
              </label>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {[1, 2, 3, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setFormPostCount(num)}
                    className={`py-3 px-1 rounded-2xl border-2 text-center transition cursor-pointer flex flex-col items-center justify-center ${
                      formPostCount === num
                        ? "bg-gradient-to-b from-indigo-600 to-purple-700 border-indigo-300 text-white font-black shadow-lg shadow-indigo-950/60 scale-105"
                        : "bg-[#070b14] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    <span className="text-base font-black font-mono">{num}</span>
                    <span className="text-[9px] uppercase tracking-wider">{num === 1 ? "Post" : "Posts"}</span>
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-slate-400 mt-1.5 text-right font-medium">
                {formPostCount === 5 ? "⭐ 5 Posts: Best for weekly social planning" : `${formPostCount} unique posts will be generated`}
              </div>
            </div>
          </div>

          {/* 4. Tone & Language Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Content Tone / Mood:</label>
              <select
                value={formTone}
                onChange={(e) => setFormTone(e.target.value)}
                className="w-full bg-[#070b14] border-2 border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
              >
                <option value="viral">🔥 Viral Hook & High Engagement</option>
                <option value="promotional">🛍️ Sales & Limited Period Offer</option>
                <option value="professional">💼 Professional & Corporate Growth</option>
                <option value="festive">🎉 Festive Celebration & Wishes</option>
                <option value="educational">💡 Educational Tips & Value Guide</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Language Style:</label>
              <select
                value={formLanguage}
                onChange={(e) => setFormLanguage(e.target.value)}
                className="w-full bg-[#070b14] border-2 border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
              >
                <option value="hinglish">Hinglish (Hindi + English - Most Engaging for India)</option>
                <option value="hindi">Pure Hindi (हिंदी भाषा)</option>
                <option value="english">Professional English</option>
              </select>
            </div>
          </div>

          {/* 5. Big Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-black rounded-2xl text-xs sm:text-sm transition flex items-center justify-center gap-2.5 cursor-pointer shadow-xl shadow-purple-950/60 active:scale-98 disabled:opacity-50"
            >
              <span className={`text-base ${isGenerating ? "animate-spin" : ""}`}>
                {isGenerating ? "⏳" : "✨"}
              </span>
              <span>
                {isGenerating
                  ? `AI is Generating ${formPostCount} Posts & Reels with Captions...`
                  : `Generate ${formPostCount} Posts with AI Now 🚀`}
              </span>
            </button>
          </div>
        </form>
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
                  Approved For Channel:
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
          VIEW SWITCHER TABS: GENERATED POSTS vs APPROVED ARCHIVE
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
          <button
            onClick={() => setActiveTab("daily")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "daily"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-950/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>📅 Generated Posts</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono font-bold">
              {posts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("approved")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "approved"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md shadow-amber-950/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>⭐ Approved & Published Archive</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono font-bold">
              {approvedHistory.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {posts.length > 0 && activeTab === "daily" && (
            <button
              type="button"
              onClick={handleClearAllPosts}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-300 hover:text-white bg-rose-950/50 hover:bg-rose-900/80 border border-rose-500/40 transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
            >
              <span>🗑️</span>
              <span>Delete All Posts</span>
            </button>
          )}
          <div className="text-xs font-medium text-slate-400 hidden sm:flex items-center gap-1.5">
            <span>💡</span>
            <span>1-Click Publish direct Meta Graph API se Instagram & Facebook par live bhejta hai</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CARDS GRID: GENERATED AI POSTS (WITH 5-SEC VIDEO REELS & IMAGES)
          ========================================================================= */}
      {isLoading ? (
        <div className="p-12 text-center bg-[#111827] rounded-3xl border-2 border-slate-800">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <div className="text-sm font-bold text-slate-200">AI Posts Load Ho Rahe Hain...</div>
        </div>
      ) : activeTab === "approved" ? (
        /* Approved Posts Tab */
        <div className="space-y-4">
          {approvedHistory.length === 0 ? (
            <div className="p-12 text-center bg-[#111827] rounded-3xl border-2 border-dashed border-slate-800">
              <div className="text-3xl mb-2">⭐</div>
              <div className="text-sm font-bold text-slate-200">Abhi tak koi post approve nahi hui hai.</div>
              <p className="text-xs text-slate-400 mt-1">
                "Generated Posts" tab me se kisi ek post par "Publish to FB & Instagram" click karein!
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
                          ⭐ Approved
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
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="px-3 py-2 bg-rose-950/50 hover:bg-rose-900/80 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-bold transition cursor-pointer"
                    title="Delete post"
                  >
                    🗑️
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
      ) : posts.length === 0 ? (
        /* Clean Empty State when no posts created yet or all dummy posts deleted */
        <div className="p-12 sm:p-16 text-center bg-[#0e1424]/80 rounded-3xl border-2 border-dashed border-slate-800 backdrop-blur-md space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-3xl mx-auto shadow-inner">
            📭
          </div>
          <h3 className="text-base font-bold text-white">Abhi koi post create nahi hui hai</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Upar diye gaye form me <strong>Post Title</strong>, <strong>Description</strong>, <strong>Attachment (Image ya Video)</strong> aur <strong>Count</strong> select karein aur <strong>"Generate Posts with AI Now"</strong> par click karein!
          </p>
        </div>
      ) : (
        /* Generated Posts Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {posts.map((post) => {
            const isPlaying = playingVideoId === post.id;
            const progress = videoProgress[post.id] || 0;
            const isVideo = post.mediaType === "video";
            const themeGradient = themeGradients[post.videoTheme || "gradient-pulse"] || "from-purple-900 to-indigo-900";

            return (
              <div
                key={post.id}
                className={`bg-slate-900/60 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-xl transition-all duration-300 border relative flex flex-col justify-between ${
                  post.isApproved
                    ? "border-amber-400/80 bg-gradient-to-b from-[#18182b]/80 to-[#121829]/80 shadow-amber-950/20 ring-1 ring-amber-400/30"
                    : "border-slate-800/80 hover:border-purple-500/40 hover:shadow-2xl hover:shadow-purple-950/20"
                }`}
              >
                <div>
                  {/* Header: Post Number & Tag */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-purple-600/90 text-white font-mono font-bold text-xs flex items-center justify-center shadow-md shadow-purple-900/30">
                        #{post.postNum}
                      </span>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                          {post.tag}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isVideo ? (
                        <span className="text-[10px] font-bold bg-gradient-to-r from-pink-600 to-purple-600 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <span>🎬</span> 5s Reel Video
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-slate-800/80 text-slate-300 border border-slate-700/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <span>🖼️</span> Image Post
                        </span>
                      )}

                      {post.isApproved && (
                        <span className="text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-400/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <span>👑</span> Approved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Post Title */}
                  <h3 className="text-base font-bold text-white leading-snug mb-3 tracking-tight">{post.title}</h3>

                  {/* Media Display: 5-Second Video Reel Simulator vs Image Preview */}
                  <div className="mb-4">
                    {isVideo ? (
                      /* 5-Second Video Reel Simulator */
                      <div className="relative rounded-2xl overflow-hidden border border-purple-500/30 bg-black aspect-[16/10] sm:aspect-[16/9] shadow-inner group">
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

                        <div
                          className={`absolute inset-0 bg-gradient-to-t ${themeGradient} opacity-75 mix-blend-multiply`}
                        ></div>

                        {/* Reel Motion Graphics & Typography Overlay */}
                        <div className="absolute inset-0 flex flex-col justify-between p-4 z-10">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-white bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-white/20">
                              <span className={`w-2 h-2 rounded-full ${isPlaying ? "bg-red-500 animate-ping" : "bg-purple-400"}`}></span>
                              <span>00:{String(Math.floor((progress / 100) * 5)).padStart(2, "0")} / 00:05 REEL</span>
                            </span>

                            <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1">
                              <span>🎵</span> Audio Sync
                            </span>
                          </div>

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

                          <div>
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <button
                                type="button"
                                onClick={() => handleTogglePlay(post.id)}
                                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-white/30 active:scale-95"
                              >
                                <span>{isPlaying ? "⏸ Pause" : "▶ Play 5s Reel"}</span>
                              </button>

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
                      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[16/10] sm:aspect-[16/9] shadow-inner group">
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
                  <div className="space-y-2 mb-4">
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-[#070b14]/60 p-3.5 rounded-2xl border border-slate-800/80 max-h-36 overflow-y-auto">
                      {post.caption}
                    </p>
                    <div className="text-[11px] text-purple-300/90 font-mono break-words leading-tight bg-purple-950/30 p-2.5 rounded-xl border border-purple-500/20">
                      {post.hashtags}
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(post)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer border border-slate-700 active:scale-95 flex items-center gap-1"
                    >
                      <span>✏️</span>
                      <span>Edit</span>
                    </button>

                    {onNavigateToPostStudio && (
                      <button
                        type="button"
                        onClick={() =>
                          onNavigateToPostStudio({
                            caption: `${post.caption}\n\n${post.hashtags}`,
                            mediaUrl: post.mediaUrl,
                            mediaType: post.mediaType,
                            postFormat: isVideo ? "reel" : "feed",
                          })
                        }
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer border border-slate-700 active:scale-95 flex items-center gap-1"
                      >
                        <span>✍️</span>
                        <span>Post Studio</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeletePost(post.id)}
                      className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/70 text-rose-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer border border-rose-500/30 active:scale-95 flex items-center gap-1"
                      title="Delete this post"
                    >
                      <span>🗑️</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApproveAndPublish(post.id)}
                      disabled={publishingPostId === post.id || post.isPublished}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 ${
                        post.isPublished
                          ? "bg-emerald-800 text-white cursor-default"
                          : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/40"
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL 1: AI API KEY & PROVIDER SETTINGS (SUPABASE INTEGRATED)
          ========================================================================= */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-[#111827] border-2 border-purple-500/60 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-start justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/50 flex items-center justify-center text-xl">
                  🔑
                </div>
                <div>
                  <h3 className="text-base font-black text-white">AI API Key Configuration</h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Per-user API key save karein (Supabase Database me store hogi):
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
              {/* Provider Selector: Google Gemini vs OpenAI */}
              <div>
                <label className="text-xs font-bold text-white block mb-1.5">Choose AI Provider:</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAiProvider("gemini");
                      setAiModel("gemini-1.5-flash");
                    }}
                    className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex items-center gap-2.5 ${
                      aiProvider === "gemini"
                        ? "bg-purple-950/80 border-purple-400 text-white font-bold"
                        : "bg-[#070b14] border-slate-800 text-slate-400"
                    }`}
                  >
                    <span className="text-xl">✨</span>
                    <div>
                      <div className="text-xs font-bold text-white">Google Gemini</div>
                      <div className="text-[10px] text-purple-300">Free & Fast Key</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAiProvider("openai");
                      setAiModel("gpt-4o-mini");
                    }}
                    className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex items-center gap-2.5 ${
                      aiProvider === "openai"
                        ? "bg-purple-950/80 border-purple-400 text-white font-bold"
                        : "bg-[#070b14] border-slate-800 text-slate-400"
                    }`}
                  >
                    <span className="text-xl">🧠</span>
                    <div>
                      <div className="text-xs font-bold text-white">OpenAI ChatGPT</div>
                      <div className="text-[10px] text-slate-400">GPT-4o Mini / GPT-4o</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* API Key Input */}
              <div>
                <label className="text-xs font-bold text-white block mb-1">
                  {aiProvider === "gemini" ? "Google Gemini API Key:" : "OpenAI API Key:"}
                </label>
                <input
                  type="password"
                  placeholder={hasApiKey ? `Current: ${apiKeyMasked}` : aiProvider === "gemini" ? "AIzaSy..." : "sk-proj-..."}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full bg-[#070b14] border-2 border-slate-700 focus:border-purple-400 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 font-mono focus:outline-none"
                />
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                  {aiProvider === "gemini" ? (
                    <>
                      <span>Google AI Studio se Free API key lein</span>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-400 hover:underline font-bold"
                      >
                        Open AI Studio ↗
                      </a>
                    </>
                  ) : (
                    <>
                      <span>OpenAI platform developer key</span>
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-400 hover:underline font-bold"
                      >
                        OpenAI Platform ↗
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Model Choice */}
              <div>
                <label className="text-xs font-bold text-white block mb-1">AI Model:</label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full bg-[#070b14] border-2 border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none font-mono"
                >
                  {aiProvider === "gemini" ? (
                    <>
                      <option value="gemini-1.5-flash">gemini-1.5-flash (Fast & Recommended)</option>
                      <option value="gemini-2.0-flash">gemini-2.0-flash (Next-Gen)</option>
                      <option value="gemini-1.5-pro">gemini-1.5-pro (High Accuracy)</option>
                    </>
                  ) : (
                    <>
                      <option value="gpt-4o-mini">gpt-4o-mini (Fast & Affordable)</option>
                      <option value="gpt-4o">gpt-4o (Flagship Model)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Brand Name:</label>
                  <input
                    type="text"
                    value={brandNameInput}
                    onChange={(e) => setBrandNameInput(e.target.value)}
                    className="w-full bg-[#070b14] border-2 border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Business Niche:</label>
                  <input
                    type="text"
                    value={businessNicheInput}
                    onChange={(e) => setBusinessNicheInput(e.target.value)}
                    className="w-full bg-[#070b14] border-2 border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {testResult && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-700 text-xs font-mono">
                  {testResult}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTestKey}
                  disabled={isTestingKey}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {isTestingKey ? "Testing..." : "⚡ Test Key Live"}
                </button>
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black rounded-xl text-xs transition cursor-pointer shadow-lg shadow-purple-950/60"
                >
                  {isSavingConfig ? "Saving to Database..." : "💾 Save to Supabase Database"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: USER EDIT & CUSTOMIZATION MODAL
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
                  <label className="text-xs font-bold text-white block mb-1">Category / Tag:</label>
                  <input
                    type="text"
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value)}
                    className="w-full bg-[#070b14] border-2 border-slate-700 focus:border-indigo-400 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

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
                      onChange={(e) => setEditVideoTheme(e.target.value as any)}
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
                      Uploading...
                    </span>
                  )}
                </div>

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
                            setEditVideoTheme(preset.theme as any);
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
