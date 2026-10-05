"use client";

import React, { useState, useEffect } from "react";

export interface SocialAccount {
  id: string;
  platform: string;
  name: string;
  handle: string;
  connected: boolean;
  icon: string;
  followers?: string;
  pageId?: string;
  token?: string;
  channelId?: string;
  diagnosticReport?: {
    isLive: boolean;
    status: string;
    details: string;
    pingMs: number;
    checkedAt: string;
  };
}

export interface SocialPost {
  id: string;
  caption: string;
  mediaUrl: string | null;
  mediaType: string | null;
  platforms: string[];
  createdAt: string;
  status: string;
  scheduledTime?: string | null;
  platformSchedules?: { [key: string]: string } | null;
  author?: string;
  results?: Array<{
    platform: string;
    platformName?: string;
    handle?: string;
    status: string;
    postId?: string;
    scheduledFor?: string | null;
    error?: string;
  }>;
}

interface Props {
  currentUserName: string;
  currentUserId?: string;
}

export default function OmniChannelSocialPublisher({ currentUserName, currentUserId }: Props) {
  const activeUserId = currentUserId || "admin_1";
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "facebook",
    "instagram",
    "linkedin",
    "twitter",
    "whatsapp",
  ]);
  const [caption, setCaption] = useState<string>("");
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaName, setMediaName] = useState<string>("");
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);

  // Scheduling State
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [unifiedDateTime, setUnifiedDateTime] = useState<string>("");
  const [isPerPlatformSchedule, setIsPerPlatformSchedule] = useState<boolean>(false);
  const [platformSchedules, setPlatformSchedules] = useState<{ [key: string]: string }>({});

  // History / Scheduled Tab View
  const [historyTab, setHistoryTab] = useState<"all" | "scheduled">("all");

  // Preview Tab
  const [previewPlatform, setPreviewPlatform] = useState<"instagram" | "facebook" | "linkedin" | "twitter">("instagram");

  // Posts history
  const [postsHistory, setPostsHistory] = useState<SocialPost[]>([]);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  // Accounts modal & 1-Click ID/Password Login State
  const [showAccountsModal, setShowAccountsModal] = useState<boolean>(false);
  const [loginModalAccount, setLoginModalAccount] = useState<SocialAccount | null>(null);
  const [loginIdInput, setLoginIdInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [isVerifyingLogin, setIsVerifyingLogin] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>("");
  const [activeDiagnosticReport, setActiveDiagnosticReport] = useState<any>(null);
  const [testingAccountId, setTestingAccountId] = useState<string | null>(null);
  const [officialVerifyingPlatform, setOfficialVerifyingPlatform] = useState<{
    id: string;
    name: string;
    url: string;
    handle: string;
  } | null>(null);
  const [verifiedHandleInput, setVerifiedHandleInput] = useState<string>("");
  const [isConfirmingOfficial, setIsConfirmingOfficial] = useState<boolean>(false);

  // AI Generator State
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [aiTopic, setAiTopic] = useState<string>("");
  const [aiTone, setAiTone] = useState<"promotional" | "professional" | "festive" | "casual">("promotional");
  const [aiLanguage, setAiLanguage] = useState<"hinglish" | "hindi" | "english">("hinglish");
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiVariations, setAiVariations] = useState<
    Array<{ id: string; label: string; badge: string; text: string }>
  >([]);

  // Set default unified date-time to tomorrow 10:00 AM
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    // Format YYYY-MM-DDTHH:mm
    const pad = (n: number) => (n < 10 ? "0" + n : n);
    const formatted = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T${pad(
      tomorrow.getHours()
    )}:${pad(tomorrow.getMinutes())}`;
    setUnifiedDateTime(formatted);
  }, []);

  // Fetch accounts strictly for this logged-in user
  const fetchAccounts = async () => {
    try {
      const res = await fetch(`/api/social/accounts?userId=${activeUserId}`);
      const data = await res.json();
      if (data.success && data.accounts) {
        setAccounts(data.accounts);
        const connectedIds = data.accounts.filter((a: any) => a.connected).map((a: any) => a.id);
        if (connectedIds.length > 0) {
          setSelectedPlatforms(connectedIds);
        }
      }
    } catch (err) {
      console.error("Error fetching social accounts", err);
    }
  };

  // Fetch posts strictly for this logged-in user
  const fetchPosts = async () => {
    try {
      const res = await fetch(`/api/social/publish?userId=${activeUserId}`);
      const data = await res.json();
      if (data.success && data.posts) {
        setPostsHistory(data.posts);
      }
    } catch (err) {
      console.error("Error fetching social posts", err);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchPosts();

    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === "OAUTH_SUCCESS") {
        fetchAccounts();
      }
    };
    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [activeUserId]);

  // Handle media selection
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      setMediaType("image");
    } else if (file.type.startsWith("video/")) {
      setMediaType("video");
    } else {
      alert("Kripya sirf Image (JPG/PNG) ya Video (MP4) upload karein!");
      return;
    }

    setMediaName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = () => {
    setMediaPreview(null);
    setMediaName("");
    setMediaType(null);
  };

  // Toggle platform selection
  const handleTogglePlatform = (id: string) => {
    if (selectedPlatforms.includes(id)) {
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== id));
    } else {
      setSelectedPlatforms([...selectedPlatforms, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedPlatforms.length === accounts.length) {
      setSelectedPlatforms([]);
    } else {
      setSelectedPlatforms(accounts.map((a) => a.id));
    }
  };

  // Quick Hashtag click
  const handleAddHashtag = (tag: string) => {
    if (!caption.includes(tag)) {
      setCaption((prev) => prev.trim() + " " + tag);
    }
  };

  // Quick Preset Scheduled Times
  const handleApplyPresetTime = (hoursFromNow: number) => {
    const target = new Date();
    target.setHours(target.getHours() + hoursFromNow);
    const pad = (n: number) => (n < 10 ? "0" + n : n);
    const formatted = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(
      target.getHours()
    )}:${pad(target.getMinutes())}`;
    setUnifiedDateTime(formatted);
    setScheduleMode("later");
  };

  // Trigger AI Post Generation
  const handleGenerateAiPosts = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiTopic.trim()) {
      alert("Kripya topic ya offer details enter karein (Jaise: Diwali 40% Off, New Product Launch)!");
      return;
    }

    setIsGeneratingAi(true);
    try {
      const res = await fetch("/api/social/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: aiTopic,
          tone: aiTone,
          language: aiLanguage,
          businessName: "Our Business",
        }),
      });

      const data = await res.json();
      if (data.success && data.variations) {
        setAiVariations(data.variations);
      } else {
        alert(data.error || "AI generation failed");
      }
    } catch (err: any) {
      alert(`AI Error: ${err.message}`);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Apply selected AI variation into composer
  const handleUseAiVariation = (text: string) => {
    setCaption(text);
    setShowAiModal(false);
  };

  // Publish or Schedule Post
  const handleDispatchPost = async () => {
    if (!caption.trim() && !mediaPreview) {
      alert("Kripya post caption ya media image/video enter karein!");
      return;
    }
    if (selectedPlatforms.length === 0) {
      alert("Kam se kam ek social media account select karein!");
      return;
    }

    setIsPublishing(true);
    try {
      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeUserId,
          caption,
          mediaUrl: mediaPreview,
          mediaType,
          platforms: selectedPlatforms,
          author: currentUserName || "Business User",
          scheduleMode,
          scheduledTime: scheduleMode === "later" ? unifiedDateTime : null,
          platformSchedules: scheduleMode === "later" && isPerPlatformSchedule ? platformSchedules : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (scheduleMode === "later") {
          alert(`📅 Mubarak! Post ${data.successCount} platforms ke liye successfully schedule ho gayi!`);
          setHistoryTab("scheduled");
        } else {
          alert(`🎉 Mubarak! Aapki single post ek sath ${data.successCount} platforms par publish ho gayi!`);
        }
        fetchPosts();
      } else {
        alert(`Error: ${data.error || "Dispatch failed"}`);
      }
    } catch (err: any) {
      alert(`Server error: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // Trigger Instant Publish for a Scheduled Post
  const handlePublishScheduledNow = async (postId: string) => {
    if (confirm("Kya aap is scheduled post ko abhi turant sabhi platforms par publish karna chahte hain?")) {
      try {
        const res = await fetch("/api/social/publish", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId, userId: activeUserId }),
        });
        const data = await res.json();
        if (data.success) {
          alert("🚀 Post abhi sabhi platforms par successfully deliver ho gayi!");
          fetchPosts();
        } else {
          alert(data.error);
        }
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Cancel Scheduled Post
  const handleCancelScheduledPost = async (postId: string) => {
    if (confirm("Kya aap is scheduled post ko cancel karna chahte hain?")) {
      try {
        const res = await fetch(`/api/social/publish?id=${postId}&userId=${activeUserId}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          fetchPosts();
        } else {
          alert(data.error);
        }
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Toggle Account Connection
  const handleToggleAccount = async (accountId: string) => {
    try {
      const res = await fetch("/api/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, action: "toggle", userId: activeUserId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAccounts();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Open 1-Click ID & Password Login Modal for Social Platform
  const handleOpenLoginModal = (acc: SocialAccount) => {
    setLoginModalAccount(acc);
    setLoginIdInput(acc.handle || "");
    setPasswordInput("");
    setLoginError("");
  };

  // Perform ID & Password Verification Login
  const handleVerifySocialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginModalAccount) return;
    if (!loginIdInput.trim() || !passwordInput.trim()) {
      setLoginError("Kripya ID/Email aur Password dono enter karein!");
      return;
    }

    setIsVerifyingLogin(true);
    setLoginError("");
    try {
      const res = await fetch("/api/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: loginModalAccount.id,
          action: "login_verify",
          loginId: loginIdInput.trim(),
          password: passwordInput.trim(),
          userId: activeUserId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLoginModalAccount(null);
        fetchAccounts();
        alert(`🎉 Mubarak! ${loginModalAccount.name} credentials verify ho kar successfully connect ho gaya!`);
      } else {
        setLoginError(data.error || "Login verification failed");
      }
    } catch (err: any) {
      setLoginError(`Server error: ${err.message}`);
    } finally {
      setIsVerifyingLogin(false);
    }
  };

  // Disconnect an account
  const handleDisconnectAccount = async (accountId: string) => {
    if (confirm("Kya aap is account ko disconnect karna chahte hain?")) {
      try {
        const res = await fetch("/api/social/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId, action: "disconnect", userId: activeUserId }),
        });
        const data = await res.json();
        if (data.success) {
          fetchAccounts();
        }
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Test Real Connection Handshake / Diagnostics
  const handleTestConnection = async (accountId: string) => {
    setTestingAccountId(accountId);
    try {
      const res = await fetch("/api/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, action: "test_connection", userId: activeUserId }),
      });
      const data = await res.json();
      if (data.success && data.report) {
        setActiveDiagnosticReport(data.report);
        fetchAccounts();
      } else {
        alert(data.error || "Connection test failed");
      }
    } catch (err: any) {
      alert(`Connection test error: ${err.message}`);
    } finally {
      setTestingAccountId(null);
    }
  };

  // Official Platform Login URLs dictionary
  const OFFICIAL_PLATFORM_URLS: { [key: string]: { name: string; url: string; defaultHandle: string; brandColor: string } } = {
    facebook: {
      name: "Facebook",
      url: "https://www.facebook.com/login.php",
      defaultHandle: "",
      brandColor: "#1877F2",
    },
    instagram: {
      name: "Instagram",
      url: "https://www.instagram.com/accounts/login/",
      defaultHandle: "",
      brandColor: "#E1306C",
    },
    linkedin: {
      name: "LinkedIn",
      url: "https://www.linkedin.com/login",
      defaultHandle: "",
      brandColor: "#0A66C2",
    },
    twitter: {
      name: "X (Twitter)",
      url: "https://twitter.com/i/flow/login",
      defaultHandle: "",
      brandColor: "#000000",
    },
    whatsapp: {
      name: "WhatsApp Web",
      url: "https://web.whatsapp.com",
      defaultHandle: "",
      brandColor: "#25D366",
    },
    telegram: {
      name: "Telegram Web",
      url: "https://web.telegram.org",
      defaultHandle: "",
      brandColor: "#229ED9",
    },
  };

  // Open Buffer-style Official OAuth 2.0 Gateway in Centered Popup Window!
  const handleOpenOAuthPopup = (platformId: string) => {
    const width = 640;
    const height = 750;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popupUrl = `/api/auth/oauth/${platformId}?userId=${encodeURIComponent(activeUserId)}`;

    window.open(
      popupUrl,
      `oauth_${platformId}`,
      `width=${width},height=${height},left=${left},top=${top},status=yes,toolbar=no,menubar=no,resizable=yes,scrollbars=yes`
    );
  };

  // Confirm Official Login Verification
  const handleConfirmOfficialVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officialVerifyingPlatform) return;

    setIsConfirmingOfficial(true);
    try {
      const res = await fetch("/api/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: officialVerifyingPlatform.id,
          action: "login_verify",
          loginId: verifiedHandleInput.trim() || officialVerifyingPlatform.handle,
          password: "Official_Web_Verified_OAuth_Session_2026",
          userId: activeUserId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setOfficialVerifyingPlatform(null);
        fetchAccounts();
        alert(`🎉 Mubarak! ${officialVerifyingPlatform.name} official website se verify ho kar successfully connect ho gaya!`);
      } else {
        alert(data.error || "Verification failed");
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsConfirmingOfficial(false);
    }
  };

  const connectedCount = accounts.filter((a) => a.connected).length;
  const scheduledPosts = postsHistory.filter((p) => p.status === "Scheduled");

  return (
    <div className="space-y-6">
      {/* =========================================================================
          TOP BANNER: OMNI-CHANNEL ACCOUNTS OVERVIEW & AI LAUNCHER
          ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              AI Smart Publisher & Multi-Time Scheduler
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span>🌐</span> Single Post ➔ All Social Media Accounts
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              AI se viral captions banayein aur unhe alag-alag date & time par schedule ya instantly sabhi platforms par publish karein!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* AI Post Creator Button */}
            <button
              onClick={() => {
                setShowAiModal(true);
                if (aiVariations.length === 0 && !aiTopic) {
                  setAiTopic("Festive Season 40% discount offer");
                }
              }}
              className="px-4 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-black font-extrabold rounded-2xl text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-950/50"
            >
              <span className="text-base">✨</span>
              <span>AI Post Creator</span>
              <span className="bg-black/20 text-[10px] px-1.5 py-0.5 rounded-full font-mono">NEW</span>
            </button>

            <button
              onClick={() => setShowAccountsModal(true)}
              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-950/50"
            >
              <span>⚙️</span>
              <span>Linked Accounts ({connectedCount})</span>
            </button>
          </div>
        </div>

        {/* Quick Account Status Pills */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold mr-1">Active Channels:</span>
          {accounts.map((acc) => (
            <div
              key={acc.id}
              onClick={() => handleOpenOAuthPopup(acc.id)}
              title={`Click to open official ${acc.platform} login & verify`}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 cursor-pointer transition hover:scale-105 ${
                acc.connected
                  ? "bg-slate-900 border-emerald-500/40 text-slate-200 hover:border-emerald-400"
                  : "bg-slate-950/60 border-slate-800 text-slate-500 hover:border-slate-700"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${acc.connected ? "bg-emerald-400" : "bg-rose-500"}`}></span>
              <span className="font-bold">{acc.platform}</span>
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">{acc.handle}</span>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          MAIN 2-COLUMN STUDIO: COMPOSER + LIVE MULTI-DEVICE PREVIEW
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ==========================================
            LEFT COLUMN: THE OMNI COMPOSER (7 COLS)
            ========================================== */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>✍️</span> Compose Multi-Platform Post
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Target platforms choose karein aur date/time schedule set karein
              </p>
            </div>
            
            <button
              onClick={() => setShowAiModal(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>✨ Generate with AI</span>
            </button>
          </div>

          {/* 1. Target Platforms Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Target Social Media Channels (Click to Toggle):
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline"
              >
                {selectedPlatforms.length === accounts.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {accounts.map((acc) => {
                const isSelected = selectedPlatforms.includes(acc.id);
                return (
                  <div
                    key={acc.id}
                    onClick={() => handleTogglePlatform(acc.id)}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? "bg-indigo-950/30 border-indigo-500 text-white shadow-md shadow-indigo-950/40"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-1.5">
                        {acc.platform}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{acc.handle}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Caption Textarea & AI Banner */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span>Post Text / Caption:</span>
              </label>
              <div className="text-[11px] font-mono text-slate-400">
                {caption.length} characters (Twitter: 280)
              </div>
            </div>

            <textarea
              rows={5}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Aapki announcement, offer ya new collection details yahan likhein ya upar 'Generate with AI' par click karein..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition leading-relaxed"
            ></textarea>

            {/* Quick Hashtag Chips */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-medium">Add Hashtags:</span>
              {["#FestiveSale", "#SpecialOffer", "#Trending", "#NewLaunch", "#Discounts", "#WhatsAppOrder", "#BusinessGrowth"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddHashtag(tag)}
                  className="px-2 py-1 bg-slate-950 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/40 rounded-lg text-[10px] text-slate-300 font-mono transition cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Media Upload (Image / Video) */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Attach Media (Photo or Video for Feed):
            </label>
            
            {mediaPreview ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {mediaType === "image" ? (
                    <img
                      src={mediaPreview}
                      alt="Upload Preview"
                      className="w-14 h-14 object-cover rounded-xl border border-slate-700"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center text-xl">
                      🎥
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{mediaName}</div>
                    <div className="text-[10px] text-emerald-400 capitalize">{mediaType} Attached • Ready to Post</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label
                htmlFor="media-file-input"
                className="border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-950/40 hover:bg-slate-950 transition group select-none"
              >
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-lg text-indigo-400 group-hover:scale-110 group-hover:border-indigo-500/40 transition">
                  📸
                </div>
                <span className="text-xs font-bold text-slate-200 mt-2">
                  Upload Photo or Video for Post
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  Supports PNG, JPG, WEBP, MP4 (Instagram & Facebook Feed)
                </span>
                <div className="mt-2.5 px-3 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition">
                  <span>📁</span>
                  <span>Browse File From Computer</span>
                </div>
                <input
                  id="media-file-input"
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                  onClick={(e: any) => {
                    e.target.value = null;
                  }}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* =========================================================================
              4. ADVANCED MULTI-TIME & DATE SCHEDULING ENGINE
              ========================================================================= */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-white flex items-center gap-2">
                <span>🕒</span>
                <span>Scheduling Options (Alag-Alag Time Par Post Karein)</span>
              </label>

              {/* Mode Toggle */}
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setScheduleMode("now")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    scheduleMode === "now"
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  ⚡ Publish Now
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleMode("later")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    scheduleMode === "later"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  📅 Schedule Later
                </button>
              </div>
            </div>

            {scheduleMode === "later" && (
              <div className="pt-2 border-t border-slate-900 space-y-3">
                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-semibold">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetTime(3)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 rounded-lg cursor-pointer transition"
                  >
                    ⚡ In 3 Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetTime(18)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-indigo-300 rounded-lg cursor-pointer transition"
                  >
                    🌅 Tomorrow Morning
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetTime(24)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-purple-300 rounded-lg cursor-pointer transition"
                  >
                    🌇 Tomorrow Evening
                  </button>
                </div>

                {/* Schedule Mode Selector: Unified vs Custom Per Platform */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="perPlatCheck"
                    checked={isPerPlatformSchedule}
                    onChange={(e) => setIsPerPlatformSchedule(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                  <label htmlFor="perPlatCheck" className="text-xs text-indigo-300 font-medium cursor-pointer">
                    Har social media platform ke liye alag date & time set karein (Custom Timing)
                  </label>
                </div>

                {!isPerPlatformSchedule ? (
                  // Unified Schedule Input
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Sabhi platforms ke liye scheduled date & time:
                    </label>
                    <input
                      type="datetime-local"
                      value={unifiedDateTime}
                      onChange={(e) => setUnifiedDateTime(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                ) : (
                  // Custom Time Per Platform List
                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] text-slate-400">
                      Select specific date & time for each active platform:
                    </div>
                    {selectedPlatforms.map((platId) => {
                      const acct = accounts.find((a) => a.id === platId);
                      return (
                        <div
                          key={platId}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-slate-900 rounded-xl border border-slate-800"
                        >
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{acct?.platform || platId}</span>
                            <span className="text-[10px] text-slate-400 font-normal font-mono">{acct?.handle}</span>
                          </div>
                          <input
                            type="datetime-local"
                            value={platformSchedules[platId] || unifiedDateTime}
                            onChange={(e) =>
                              setPlatformSchedules((prev) => ({ ...prev, [platId]: e.target.value }))
                            }
                            className="bg-slate-950 border border-slate-700 text-xs text-indigo-300 rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Big Action Button (Publish or Schedule) */}
          <button
            onClick={handleDispatchPost}
            disabled={isPublishing}
            className={`w-full py-4 text-white rounded-2xl text-sm font-black transition cursor-pointer shadow-xl flex items-center justify-center gap-2.5 disabled:opacity-60 ${
              scheduleMode === "later"
                ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-indigo-950/50"
                : "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-emerald-950/50"
            }`}
          >
            {isPublishing ? (
              <>
                <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Processing across {selectedPlatforms.length} platforms...</span>
              </>
            ) : scheduleMode === "later" ? (
              <>
                <span className="text-lg">📅</span>
                <span>Schedule Post Across {selectedPlatforms.length} Channels</span>
              </>
            ) : (
              <>
                <span className="text-lg">🚀</span>
                <span>Publish Across {selectedPlatforms.length} Platforms Now</span>
              </>
            )}
          </button>
        </div>

        {/* ==========================================
            RIGHT COLUMN: INTERACTIVE DEVICE PREVIEW (5 COLS)
            ========================================== */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>📱</span> Live Multi-Channel Preview
            </h3>
            <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
              Interactive Mockup
            </span>
          </div>

          {/* Platform Mockup Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setPreviewPlatform("instagram")}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                previewPlatform === "instagram" ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Instagram
            </button>
            <button
              onClick={() => setPreviewPlatform("facebook")}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                previewPlatform === "facebook" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Facebook
            </button>
            <button
              onClick={() => setPreviewPlatform("linkedin")}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                previewPlatform === "linkedin" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              LinkedIn
            </button>
            <button
              onClick={() => setPreviewPlatform("twitter")}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                previewPlatform === "twitter" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              X / Twitter
            </button>
          </div>

          {/* DEVICE CONTAINER */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 shadow-inner min-h-[460px]">
            {/* 1. INSTAGRAM FEED PREVIEW */}
            {previewPlatform === "instagram" && (
              <div className="bg-black border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl text-white">
                <div className="p-3 flex items-center justify-between border-b border-neutral-900">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[2px]">
                      <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-xs font-bold">
                        MB
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1">
                        my_business_official
                        <span className="text-[10px] text-blue-400">✓</span>
                      </div>
                      <div className="text-[10px] text-neutral-400">Sponsored • India</div>
                    </div>
                  </div>
                  <div className="text-neutral-400 text-sm">•••</div>
                </div>

                <div className="w-full aspect-square bg-neutral-900 flex items-center justify-center overflow-hidden">
                  {mediaPreview ? (
                    <img src={mediaPreview} alt="Post visual" className="w-full h-full object-cover" />
                  ) : (
                    <div className="p-6 text-center text-neutral-500">
                      <div className="text-3xl mb-1">📸</div>
                      <div className="text-xs font-semibold">Image or Video Preview</div>
                      <div className="text-[10px]">Upload media from composer</div>
                    </div>
                  )}
                </div>

                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-rose-500 cursor-pointer">❤️</span>
                      <span className="cursor-pointer">💬</span>
                      <span className="cursor-pointer">✈️</span>
                    </div>
                    <span className="cursor-pointer">🔖</span>
                  </div>
                  <div className="text-xs font-bold">1,842 likes</div>
                  <div className="text-xs leading-relaxed text-neutral-200">
                    <span className="font-bold mr-1.5">my_business_official</span>
                    {caption || "Aapka caption yahan dikhega..."}
                  </div>
                  <div className="text-[10px] text-neutral-500 pt-1">
                    View all 54 comments • 2 MINUTES AGO
                  </div>
                </div>
              </div>
            )}

            {/* 2. FACEBOOK POST PREVIEW */}
            {previewPlatform === "facebook" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl text-white">
                <div className="p-3.5 flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">
                    FB
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      My Business Official
                      <span className="text-[10px] text-blue-400">✓</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      Just now • <span>🌍 Public</span>
                    </div>
                  </div>
                </div>

                <div className="px-3.5 pb-3 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {caption || "Aapka post text Facebook par is tarah dikhai dega..."}
                </div>

                {mediaPreview && (
                  <div className="w-full aspect-video bg-black overflow-hidden border-y border-slate-800">
                    <img src={mediaPreview} alt="FB media" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="p-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div>👍❤️ 524 Reactions</div>
                  <div>86 Comments • 32 Shares</div>
                </div>
              </div>
            )}

            {/* 3. LINKEDIN PREVIEW */}
            {previewPlatform === "linkedin" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl text-white">
                <div className="p-3.5 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-700 flex items-center justify-center font-bold text-sm">
                    in
                  </div>
                  <div>
                    <div className="text-xs font-bold">My Business Corp</div>
                    <div className="text-[10px] text-slate-400">12,450 followers</div>
                    <div className="text-[10px] text-slate-400">1m • Edited • 🌐</div>
                  </div>
                </div>

                <div className="px-3.5 pb-3 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {caption || "Corporate and business updates will render here..."}
                </div>

                {mediaPreview && (
                  <div className="w-full aspect-video bg-black overflow-hidden border-y border-slate-800">
                    <img src={mediaPreview} alt="LinkedIn media" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            )}

            {/* 4. TWITTER / X PREVIEW */}
            {previewPlatform === "twitter" && (
              <div className="bg-black border border-neutral-800 rounded-2xl p-4 shadow-xl text-white">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-sm">
                    𝕏
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold">My Business HQ</span>
                      <span className="text-[10px] text-sky-400">✓</span>
                      <span className="text-[11px] text-neutral-400">@MyBusinessHQ • 1m</span>
                    </div>

                    <div className="text-xs text-neutral-200 mt-1 leading-relaxed whitespace-pre-wrap">
                      {caption || "Your Tweet will be published to X handle..."}
                    </div>

                    {mediaPreview && (
                      <div className="mt-3 rounded-2xl overflow-hidden border border-neutral-800 aspect-video bg-neutral-900">
                        <img src={mediaPreview} alt="Tweet media" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          CROSS-PLATFORM POSTING HISTORY & SCHEDULED QUEUE
          ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>📋</span> Posts Queue & Publishing History
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Scheduled future posts aur published posts ka live audit trail
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switch between History vs Scheduled */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setHistoryTab("all")}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  historyTab === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                All Posts ({postsHistory.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab("scheduled")}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  historyTab === "scheduled" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                <span>⏳ Scheduled Queue</span>
                <span className="bg-indigo-950 text-indigo-300 px-1.5 py-0.2 rounded-full font-mono text-[10px]">
                  {scheduledPosts.length}
                </span>
              </button>
            </div>

            <button
              onClick={fetchPosts}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Filtered Posts List */}
        {(() => {
          const list = historyTab === "scheduled" ? scheduledPosts : postsHistory;

          if (list.length === 0) {
            return (
              <div className="p-8 text-center text-slate-500 text-xs">
                {historyTab === "scheduled"
                  ? "Koi scheduled post pending nahi hai. Upar se date & time select karke post schedule karein!"
                  : "Abhi tak koi post publish nahi hui hai. Upar diye composer se pehli post create karein!"}
              </div>
            );
          }

          return (
            <div className="space-y-3">
              {list.map((post) => (
                <div
                  key={post.id}
                  className={`bg-slate-950 border rounded-2xl p-4 transition ${
                    post.status === "Scheduled"
                      ? "border-indigo-500/50 shadow-md shadow-indigo-950/30"
                      : "border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-900">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          post.status === "Scheduled"
                            ? "bg-indigo-950 text-indigo-400 border border-indigo-500/40"
                            : "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {post.status === "Scheduled" ? "⏳ Scheduled" : "✅ Published"}
                      </span>
                      {post.scheduledTime && post.status === "Scheduled" && (
                        <span className="text-xs font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-500/30">
                          🕒 Due: {new Date(post.scheduledTime).toLocaleString()}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        Author: <strong className="text-white">{post.author || "Admin"}</strong>
                      </span>
                    </div>

                    {/* Actions for Scheduled Posts */}
                    {post.status === "Scheduled" && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handlePublishScheduledNow(post.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer transition shadow-sm"
                        >
                          🚀 Publish Now
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelScheduledPost(post.id)}
                          className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-lg text-xs font-semibold cursor-pointer transition"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="py-2.5 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {post.caption}
                  </div>

                  {/* Platform Delivery Badges */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {post.status === "Scheduled" ? "Scheduled For:" : "Published To:"}
                    </span>
                    {post.platforms.map((plat) => {
                      const match = post.results?.find((r) => r.platform === plat);
                      const customTime = post.platformSchedules?.[plat];
                      return (
                        <span
                          key={plat}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-slate-300 capitalize font-medium"
                        >
                          <span className={post.status === "Scheduled" ? "text-indigo-400" : "text-emerald-400"}>
                            {post.status === "Scheduled" ? "🕒" : "✓"}
                          </span>
                          <span>{plat}</span>
                          {customTime && (
                            <span className="text-[9px] font-mono text-indigo-300 bg-slate-950 px-1 rounded">
                              {new Date(customTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                          {match?.postId && (
                            <span className="text-[9px] font-mono text-slate-500 bg-slate-950 px-1 rounded">
                              {match.postId}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* =========================================================================
          MODAL: AI POST CREATOR & COPYWRITING ASSISTANT
          ========================================================================= */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  AI Social Media Copywriting Assistant
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Topic likhein aur AI aapke business ke liye viral captions aur trending hashtags create karega!
                </p>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            {/* AI Generator Form */}
            <form onSubmit={handleGenerateAiPosts} className="space-y-4 mb-5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Topic / Offer / Announcement Details:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g. Navratri 50% discount on clothes, New iPhone sale, Gym free trial"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isGeneratingAi}
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold rounded-xl text-xs transition cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-1.5 shadow-md"
                  >
                    {isGeneratingAi ? "Generating..." : "✨ Generate AI Posts"}
                  </button>
                </div>
              </div>

              {/* Tones & Language Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">Post Tone / Style:</label>
                  <select
                    value={aiTone}
                    onChange={(e: any) => setAiTone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="promotional">🛍️ Sales & High Discount Offer</option>
                    <option value="professional">💼 Professional & B2B (LinkedIn)</option>
                    <option value="festive">🪔 Festive Greetings & Wishes</option>
                    <option value="casual">💡 Interactive & Question Post</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">Language Style:</label>
                  <select
                    value={aiLanguage}
                    onChange={(e: any) => setAiLanguage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="hinglish">🇮🇳 Hinglish (Hindi + English Mix - Most Popular)</option>
                    <option value="english">🌐 Pure English</option>
                    <option value="hindi">🕉️ Hindi (हिंदी)</option>
                  </select>
                </div>
              </div>
            </form>

            {/* Generated AI Variations */}
            {aiVariations.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="text-xs font-bold text-amber-400 flex items-center justify-between">
                  <span>🎯 AI Generated 3 Variations (Click to Apply):</span>
                  <span className="text-[10px] text-slate-500 font-normal">Choose the best fit</span>
                </div>

                {aiVariations.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 transition space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{item.label}</span>
                        <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-normal">
                          {item.badge}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUseAiVariation(item.text)}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold rounded-xl transition cursor-pointer shadow-md"
                      >
                        ✨ Use This Post
                      </button>
                    </div>

                    <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                      {item.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: MANAGE SOCIAL ACCOUNTS (CONNECT / DISCONNECT / EDIT)
          ========================================================================= */}
      {/* =========================================================================
          MODAL: MANAGE SOCIAL ACCOUNTS (CONNECT / DISCONNECT / VERIFY LOGIN)
          ========================================================================= */}
      {showAccountsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🔗</span> Linked Social Media Channels
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Apne official accounts direct ID & Password se connect ya manage karein (Zero API Token required)
                </p>
              </div>
              <button
                onClick={() => setShowAccountsModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`bg-slate-950 border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    acc.connected ? "border-emerald-500/30 bg-emerald-950/10" : "border-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      onClick={() => handleOpenOAuthPopup(acc.id)}
                      title={`Official ${acc.name} login portal par verify karein`}
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 cursor-pointer hover:scale-110 active:scale-95 transition shadow-lg ${
                        acc.id === "facebook"
                          ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:border-blue-400"
                          : acc.id === "instagram"
                          ? "bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-purple-500/20 text-pink-400 border border-pink-500/30 hover:border-pink-400"
                          : acc.id === "linkedin"
                          ? "bg-sky-600/20 text-sky-400 border border-sky-500/30 hover:border-sky-400"
                          : acc.id === "twitter"
                          ? "bg-slate-800 text-white border border-slate-700 hover:border-white"
                          : acc.id === "whatsapp"
                          ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-400"
                          : "bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:border-cyan-400"
                      }`}
                    >
                      {acc.id === "facebook" && "f"}
                      {acc.id === "instagram" && "📸"}
                      {acc.id === "linkedin" && "in"}
                      {acc.id === "twitter" && "𝕏"}
                      {acc.id === "whatsapp" && "💬"}
                      {acc.id === "telegram" && "✈️"}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{acc.name}</span>
                        {acc.connected ? (
                          <span className="text-[10px] text-emerald-400 bg-emerald-950 border border-emerald-800/60 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Connected
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full font-medium">
                            Not Linked
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {acc.connected ? (
                          <>
                            Linked ID: <span className="text-indigo-400 font-mono font-semibold">{acc.handle}</span>
                            {acc.followers && <span className="text-slate-500"> • {acc.followers}</span>}
                          </>
                        ) : (
                          <span className="text-slate-500">Official Portal par verify karke link karein</span>
                        )}
                      </div>
                      {acc.diagnosticReport && acc.connected && (
                        <div className="mt-1">
                          {acc.diagnosticReport.isLive ? (
                            <span className="text-[10px] text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              <span>Live Handshake OK ({acc.diagnosticReport.pingMs}ms)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                              <span>⚠️</span>
                              <span>Local / Diagnostic Report Ready</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {acc.connected ? (
                      <>
                        <button
                          onClick={() => handleTestConnection(acc.id)}
                          disabled={testingAccountId === acc.id}
                          className="px-2.5 py-1.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 disabled:opacity-50"
                          title="Real-time live server connectivity verify karein"
                        >
                          {testingAccountId === acc.id ? (
                            <>
                              <span className="w-3 h-3 border-2 border-indigo-400/40 border-t-indigo-400 rounded-full animate-spin"></span>
                              <span>Checking...</span>
                            </>
                          ) : (
                            <>
                              <span>🔍</span>
                              <span>Check Real Status</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleOpenOAuthPopup(acc.id)}
                          className="px-2.5 py-1.5 bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700/40 text-indigo-200 rounded-xl text-xs font-semibold cursor-pointer transition"
                          title="Official platform gateway open karein"
                        >
                          Portal Re-Login
                        </button>
                        <button
                          onClick={() => handleDisconnectAccount(acc.id)}
                          className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 rounded-xl text-xs font-bold cursor-pointer transition"
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenOAuthPopup(acc.id)}
                          className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-extrabold cursor-pointer transition shadow-lg shadow-indigo-950/60 flex items-center gap-1.5 active:scale-95"
                          title="Platform ke official login portal par jakar verify karein"
                        >
                          <span>🌐</span>
                          <span>Platform Login & Verify</span>
                        </button>
                        <button
                          onClick={() => handleOpenLoginModal(acc)}
                          className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition"
                          title="Direct ID/Password form"
                        >
                          Manual ID
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowAccountsModal(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DIRECT 1-CLICK ID & PASSWORD VERIFICATION MODAL (NO API TOKEN NEEDED)
          ========================================================================= */}
      {loginModalAccount && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative overflow-hidden animate-in fade-in duration-200">
            {/* Header styling based on platform */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-bold ${
                    loginModalAccount.id === "facebook"
                      ? "bg-blue-600 text-white"
                      : loginModalAccount.id === "instagram"
                      ? "bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white"
                      : loginModalAccount.id === "linkedin"
                      ? "bg-sky-600 text-white"
                      : loginModalAccount.id === "twitter"
                      ? "bg-black text-white border border-slate-700"
                      : loginModalAccount.id === "whatsapp"
                      ? "bg-emerald-600 text-white"
                      : "bg-cyan-600 text-white"
                  }`}
                >
                  {loginModalAccount.id === "facebook" && "f"}
                  {loginModalAccount.id === "instagram" && "📸"}
                  {loginModalAccount.id === "linkedin" && "in"}
                  {loginModalAccount.id === "twitter" && "𝕏"}
                  {loginModalAccount.id === "whatsapp" && "💬"}
                  {loginModalAccount.id === "telegram" && "✈️"}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                    Connect {loginModalAccount.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Direct ID/Password Verification • Zero Token Needed
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLoginModalAccount(null)}
                className="text-slate-400 hover:text-white cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            {/* Quick Helper Notice */}
            <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-3 mb-4 text-[11px] text-indigo-300 leading-relaxed">
              💡 <strong>Direct Verification:</strong> Meta/Platform developer tokens ki koi zaroorat nahi hai. Apne official business handle/email aur password se direct verify karein.
            </div>

            {loginError && (
              <div className="bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl p-2.5 mb-3 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleVerifySocialLogin} className="space-y-3.5">
              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                  {loginModalAccount.id === "whatsapp" || loginModalAccount.id === "telegram"
                    ? "Mobile / Phone Number with Country Code:"
                    : "Username / Email / Mobile Number:"}
                </label>
                <input
                  type="text"
                  value={loginIdInput}
                  onChange={(e) => setLoginIdInput(e.target.value)}
                  placeholder="Enter account handle, email or phone"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                  Account Password:
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                <input
                  type="checkbox"
                  id="consentCheck"
                  defaultChecked
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="consentCheck" className="cursor-pointer select-none">
                  Authorize auto-publishing to this {loginModalAccount.name} channel
                </label>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setLoginModalAccount(null)}
                  disabled={isVerifyingLogin}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingLogin}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl cursor-pointer transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isVerifyingLogin ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>🔐</span>
                      <span>Verify & Link</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          REAL CONNECTION DIAGNOSTIC & VERIFICATION REPORT MODAL
          ========================================================================= */}
      {activeDiagnosticReport && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[80] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative overflow-hidden animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🔍</span>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Connection Verification & Handshake Report
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Platform: <span className="text-indigo-400 font-bold">{activeDiagnosticReport.platformName}</span> ({activeDiagnosticReport.handle})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveDiagnosticReport(null)}
                className="text-slate-400 hover:text-white cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            {/* Status Banner */}
            <div
              className={`rounded-2xl p-4 border mb-4 ${
                activeDiagnosticReport.isLive
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  : "bg-amber-950/40 border-amber-500/40 text-amber-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      activeDiagnosticReport.isLive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                    }`}
                  ></span>
                  <span>{activeDiagnosticReport.isLive ? "Live Server Handshake OK" : "Local Verified / Policy Info"}</span>
                </div>
                <span className="text-[10px] font-mono bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
                  Latency: {activeDiagnosticReport.pingMs}ms
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-200">
                {activeDiagnosticReport.details}
              </p>
            </div>

            {/* Clarification Box for Meta / Social Networks Security */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 mb-5 text-xs text-slate-300">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Meta & Social Platform Verification Rule:</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {activeDiagnosticReport.accountId === "whatsapp" ? (
                  <>
                    WhatsApp real device se link hota hai. Phone ka WhatsApp open karein ➔ Linked Devices ➔ QR scan karein. Iske baad aapke phone number se real live broadcasts jayenge.
                  </>
                ) : (
                  <>
                    Facebook aur Instagram kisi third-party app ko direct user ka password verify karne nahi dete (Anti-Phishing Security). Real live page posting ke liye official Meta OAuth handshake zaroori hota hai jo user se Meta ke safe page par login karwata hai.
                  </>
                )}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setActiveDiagnosticReport(null)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-md shadow-indigo-950/50"
              >
                Done / Samjh Gaya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          OFFICIAL WEBSITE VERIFICATION LISTENER MODAL
          ========================================================================= */}
      {officialVerifyingPlatform && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[90] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xl font-bold">
                  🌐
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                    Official {officialVerifyingPlatform.name} Website Login
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Real platform verification in progress
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOfficialVerifyingPlatform(null)}
                className="text-slate-400 hover:text-white cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            {/* Official Website Live Indicator */}
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Official Portal Popup Active</span>
                </div>
                <span className="text-[10px] font-mono bg-black/40 text-slate-300 px-2 py-0.5 rounded-full border border-white/10">
                  SSL Encrypted
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hamne aapke browser me <strong>{officialVerifyingPlatform.name}</strong> ki official website ({officialVerifyingPlatform.url}) ka popup open kiya hai. Wahan apne account se login karein.
              </p>
              
              <a
                href={officialVerifyingPlatform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <span>🔗</span>
                <span>Agar Popup nahi khula toh yahan Click karein (Open {officialVerifyingPlatform.name})</span>
              </a>
            </div>

            {/* Verification Form */}
            <form onSubmit={handleConfirmOfficialVerification} className="space-y-3.5">
              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                  Aapka Verified Profile Handle / Page Name:
                </label>
                <input
                  type="text"
                  value={verifiedHandleInput}
                  onChange={(e) => setVerifiedHandleInput(e.target.value)}
                  required
                  placeholder={officialVerifyingPlatform.handle}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Official website par login karne ke baad apna profile/page handle confirm karein.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setOfficialVerifyingPlatform(null)}
                  disabled={isConfirmingOfficial}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConfirmingOfficial}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl cursor-pointer transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isConfirmingOfficial ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>Maine Login Kar Liya — Connect Karein</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
