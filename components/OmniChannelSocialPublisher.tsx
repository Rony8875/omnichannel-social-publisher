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
  initialPostFormat?: "feed" | "reel" | "story";
  prefillData?: {
    caption?: string;
    mediaUrl?: string;
    mediaType?: "image" | "video";
    postFormat?: "feed" | "reel" | "story";
  } | null;
}

export default function OmniChannelSocialPublisher({
  currentUserName,
  currentUserId,
  initialPostFormat = "feed",
  prefillData,
}: Props) {
  const activeUserId = currentUserId || "admin_1";
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    initialPostFormat === "reel" ? ["instagram", "facebook"] : [
      "facebook",
      "instagram",
      "linkedin",
      "twitter",
      "whatsapp",
    ]
  );
  const [caption, setCaption] = useState<string>(prefillData?.caption || "");
  const [mediaPreview, setMediaPreview] = useState<string | null>(prefillData?.mediaUrl || null);
  const [mediaName, setMediaName] = useState<string>(prefillData?.mediaUrl ? "AI Media Asset" : "");
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(
    prefillData?.mediaType || (initialPostFormat === "reel" ? "video" : null)
  );
  const [postFormat, setPostFormat] = useState<"feed" | "reel" | "story">(
    prefillData?.postFormat || initialPostFormat
  );
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);

  useEffect(() => {
    if (prefillData) {
      if (prefillData.caption) setCaption(prefillData.caption);
      if (prefillData.mediaUrl) {
        setMediaPreview(prefillData.mediaUrl);
        setMediaName("AI Media Asset");
      }
      if (prefillData.mediaType) setMediaType(prefillData.mediaType);
      if (prefillData.postFormat) setPostFormat(prefillData.postFormat);
    }
  }, [prefillData]);

  // Scheduling State
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [unifiedDateTime, setUnifiedDateTime] = useState<string>("");
  const [isPerPlatformSchedule, setIsPerPlatformSchedule] = useState<boolean>(false);
  const [platformSchedules, setPlatformSchedules] = useState<{ [key: string]: string }>({});

  // Post Studio: Posts Queue & Content Calendar Tabs
  const [activeHubTab, setActiveHubTab] = useState<"calendar" | "posts">("posts");
  const [historyTab, setHistoryTab] = useState<"all" | "scheduled">("all");
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedCalDateStr, setSelectedCalDateStr] = useState<string>("");

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

  // Dedicated Direct Link Modals for WhatsApp & Telegram
  const [showWaDirectModal, setShowWaDirectModal] = useState<boolean>(false);
  const [waSessions, setWaSessions] = useState<any[]>([]);
  const [waQrCode, setWaQrCode] = useState<string | null>(null);
  const [waPairingPhone, setWaPairingPhone] = useState<string>("");
  const [waPairingCode, setWaPairingCode] = useState<string | null>(null);
  const [isWaLoading, setIsWaLoading] = useState<boolean>(false);
  const [isGeneratingWaPairing, setIsGeneratingWaPairing] = useState<boolean>(false);

  const [showTgDirectModal, setShowTgDirectModal] = useState<boolean>(false);
  const [tgBotToken, setTgBotToken] = useState<string>("");
  const [tgChannelId, setTgChannelId] = useState<string>("");
  const [isTgVerifying, setIsTgVerifying] = useState<boolean>(false);
  const [tgError, setTgError] = useState<string>("");

  // Fetch WhatsApp Engine Sessions
  const fetchWaSessions = async () => {
    setIsWaLoading(true);
    try {
      const res = await fetch("/api/wa/sessions");
      const data = await res.json();
      if (data.sessions) {
        setWaSessions(data.sessions);
        const qrSession = data.sessions.find((s: any) => s.qrCode);
        if (qrSession) setWaQrCode(qrSession.qrCode);
      }
    } catch (e) {
      console.warn("WA Engine fetch notice:", e);
    } finally {
      setIsWaLoading(false);
    }
  };

  // WhatsApp modal auto polling
  useEffect(() => {
    if (showWaDirectModal) {
      fetchWaSessions();
      const interval = setInterval(fetchWaSessions, 4000);
      return () => clearInterval(interval);
    }
  }, [showWaDirectModal]);

  // Link WhatsApp SIM directly to account
  const handleLinkWaDirect = async (phoneOrHandle: string) => {
    setIsWaLoading(true);
    try {
      const cleanPhone = phoneOrHandle.startsWith("+") ? phoneOrHandle : `+${phoneOrHandle}`;
      const res = await fetch("/api/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "whatsapp",
          action: "token_direct",
          directHandle: cleanPhone,
          directToken: `wa_session_${Date.now()}`,
          userId: activeUserId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowWaDirectModal(false);
        fetchAccounts();
        alert(`🎉 Mubarak! WhatsApp (${cleanPhone}) successfully link ho gaya!`);
      } else {
        alert(data.error || "WhatsApp linking failed");
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setIsWaLoading(false);
    }
  };

  // Generate WhatsApp 8-Digit Pairing Code
  const handleGenerateWaPairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waPairingPhone.trim()) {
      alert("Kripya mobile number enter karein (e.g. 918875216646)");
      return;
    }
    setIsGeneratingWaPairing(true);
    try {
      const res = await fetch("/api/wa/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: `sim_${activeUserId}_${Date.now()}`,
          phoneNumber: waPairingPhone.trim(),
          label: `WhatsApp ${waPairingPhone.trim()}`,
          owner: activeUserId,
        }),
      });
      const data = await res.json();
      if (data.pairingCode) {
        setWaPairingCode(data.pairingCode);
      } else if (data.session?.pairingCode) {
        setWaPairingCode(data.session.pairingCode);
      } else if (data.session?.qrCode) {
        setWaQrCode(data.session.qrCode);
      } else {
        fetchWaSessions();
        alert("Pairing code request sent. Check QR Code if code not generated.");
      }
    } catch (e: any) {
      alert(`Error generating pairing code: ${e.message}`);
    } finally {
      setIsGeneratingWaPairing(false);
    }
  };

  // Verify & Link Telegram Bot & Channel
  const handleVerifyTelegramDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tgBotToken.trim()) {
      setTgError("Kripya Telegram Bot Token enter karein (@BotFather se)!");
      return;
    }
    setIsTgVerifying(true);
    setTgError("");
    try {
      const res = await fetch("/api/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "telegram",
          action: "telegram_verify",
          botToken: tgBotToken.trim(),
          channelId: tgChannelId.trim(),
          userId: activeUserId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowTgDirectModal(false);
        fetchAccounts();
        alert(data.message || "🎉 Telegram Channel successfully link ho gaya!");
      } else {
        setTgError(data.error || "Telegram verification failed");
      }
    } catch (e: any) {
      setTgError(`Error: ${e.message}`);
    } finally {
      setIsTgVerifying(false);
    }
  };

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

  // Handle media selection (Images, Videos & Reels)
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v|avi|mkv)$/i.test(file.name);
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      alert("Kripya sirf Image (JPG/PNG) ya Video / Reel (MP4/WEBM/MOV) upload karein!");
      return;
    }

    const detectedType: "image" | "video" = isVideo ? "video" : "image";
    setMediaType(detectedType);
    setMediaName(file.name);

    // Instant local preview for zero-delay visual playback
    try {
      const localUrl = URL.createObjectURL(file);
      setMediaPreview(localUrl);
    } catch {}

    // Stream upload to backend /api/social/upload
    setIsUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/social/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setMediaPreview(data.url);
      }
    } catch (err) {
      console.warn("Server upload failed, using local fallback:", err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setMediaPreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingMedia(false);
    }
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
          postFormat,
          isReel: postFormat === "reel",
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
          setActiveHubTab("calendar");
          if (unifiedDateTime) {
            setSelectedCalDateStr(unifiedDateTime.slice(0, 10));
          }
        } else {
          alert(`🎉 Mubarak! Aapki single post ek sath ${data.successCount} platforms par publish ho gayi!`);
          setActiveHubTab("posts");
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

  // Delete Any Post (Published or Scheduled)
  const handleDeletePost = async (postId: string) => {
    if (confirm("Kya aap sach me is post ko permanently delete karna chahte hain?")) {
      try {
        const res = await fetch(`/api/social/publish?postId=${postId}&userId=${activeUserId}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          fetchPosts();
        } else {
          alert(data.error || "Post delete karne me samasya aayi.");
        }
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Clear All History (Permanent Bulk Delete)
  const handleClearAllHistory = async () => {
    if (confirm("⚠️ Kya aap SAARI post history permanently delete karna chahte hain? Ye action wapas nahi liya ja sakta.")) {
      try {
        const res = await fetch(`/api/social/publish?postId=all&userId=${activeUserId}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          fetchPosts();
        } else {
          alert(data.error || "History delete karne me samasya aayi.");
        }
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Alias for backward compatibility
  const handleCancelScheduledPost = handleDeletePost;

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

  // 1-Click Instant Connect (Zero Token / Zero Password)
  const handleQuickConnect = async (acc: SocialAccount, customHandle?: string) => {
    try {
      const handleToUse =
        customHandle ||
        acc.handle ||
        `@${acc.name.replace(/\s+/g, "")}`;

      const res = await fetch("/api/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: acc.id,
          action: "login_verify",
          loginId: handleToUse,
          userId: activeUserId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLoginModalAccount(null);
        fetchAccounts();
        alert(`🎉 Mubarak! ${acc.name} (${handleToUse}) 1-Click me successfully verify & connect ho gaya!`);
      } else {
        alert(data.error || "Verification failed");
      }
    } catch (err: any) {
      alert(`Server error: ${err.message}`);
    }
  };

  // Open 1-Click Verification Modal for Social Platform
  const handleOpenLoginModal = (acc: SocialAccount) => {
    setLoginModalAccount(acc);
    setLoginIdInput(acc.handle || `@${acc.name.replace(/\s+/g, "")}`);
    setLoginError("");
  };

  // Perform 1-Click Verification Login (No Token, No Password)
  const handleVerifySocialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginModalAccount) return;

    setIsVerifyingLogin(true);
    setLoginError("");
    try {
      const handleToUse = loginIdInput.trim() || loginModalAccount.handle || `@${loginModalAccount.name.replace(/\s+/g, "")}`;
      const res = await fetch("/api/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: loginModalAccount.id,
          action: "login_verify",
          loginId: handleToUse,
          userId: activeUserId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLoginModalAccount(null);
        fetchAccounts();
        alert(`🎉 Mubarak! ${loginModalAccount.name} (${handleToUse}) 1-Click verify ho kar successfully connect ho gaya!`);
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
    if (platformId === "whatsapp") {
      setShowWaDirectModal(true);
      return;
    }
    if (platformId === "telegram") {
      setShowTgDirectModal(true);
      return;
    }

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
  const publishedPosts = postsHistory.filter((p) => p.status?.toLowerCase() === "published");
  const scheduledPosts = postsHistory.filter((p) => p.status?.toLowerCase() === "scheduled");
  const totalPublishedCount = publishedPosts.length;
  const totalScheduledCount = scheduledPosts.length;

  // Platform publish metrics calculation
  const platformStatsList = [
    {
      id: "facebook",
      name: "Facebook",
      icon: "👥",
      badge: "Facebook Page",
      color: "from-blue-600 to-indigo-600",
      accent: "text-blue-400",
      border: "border-blue-500/30",
    },
    {
      id: "instagram",
      name: "Instagram",
      icon: "📸",
      badge: "Instagram Business",
      color: "from-pink-600 to-rose-600",
      accent: "text-pink-400",
      border: "border-pink-500/30",
    },
    {
      id: "whatsapp",
      name: "WhatsApp",
      icon: "💬",
      badge: "WA Official Cloud / SIM",
      color: "from-emerald-600 to-green-600",
      accent: "text-emerald-400",
      border: "border-emerald-500/30",
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      icon: "💼",
      badge: "LinkedIn Company",
      color: "from-sky-600 to-blue-700",
      accent: "text-sky-400",
      border: "border-sky-500/30",
    },
    {
      id: "twitter",
      name: "Twitter / X",
      icon: "🐦",
      badge: "X Feed",
      color: "from-slate-700 to-slate-900",
      accent: "text-slate-300",
      border: "border-slate-600/30",
    },
    {
      id: "telegram",
      name: "Telegram",
      icon: "✈️",
      badge: "Telegram Channel",
      color: "from-cyan-600 to-blue-600",
      accent: "text-cyan-400",
      border: "border-cyan-500/30",
    },
  ].map((meta) => {
    const acc = accounts.find((a) => a.id === meta.id);
    const isConnected = acc?.connected || false;
    const handle = acc?.handle || "";

    // Count how many posts have been published to this platform
    const publishedCount = publishedPosts.filter((p) => {
      const matchPlat = p.platforms?.includes(meta.id);
      const matchResult = p.results?.some(
        (r) =>
          r.platform === meta.id &&
          (r.status?.toLowerCase() === "published" ||
            r.status?.toLowerCase() === "success" ||
            r.status === "Published")
      );
      return matchPlat || matchResult;
    }).length;

    // Count scheduled for this platform
    const scheduledCount = scheduledPosts.filter((p) => {
      const matchPlat = p.platforms?.includes(meta.id);
      const matchSchedule = p.platformSchedules && p.platformSchedules[meta.id];
      return matchPlat || matchSchedule;
    }).length;

    return {
      ...meta,
      isConnected,
      handle,
      publishedCount,
      scheduledCount,
    };
  });

  // Calendar Helpers & Date calculations
  const getPostDateStr = (dateVal?: string | null): string => {
    if (!dateVal) return "";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return dateVal.slice(0, 10);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    } catch {
      return "";
    }
  };

  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const calMonthName = calendarDate.toLocaleString("en-US", { month: "long", year: "numeric" });
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const daysInCurrentMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

  const handlePrevMonth = () => {
    setCalendarDate(new Date(calYear, calMonth - 1, 1));
  };
  const handleNextMonth = () => {
    setCalendarDate(new Date(calYear, calMonth + 1, 1));
  };
  const handleTodayMonth = () => {
    const today = new Date();
    setCalendarDate(today);
    setSelectedCalDateStr(today.toISOString().slice(0, 10));
  };

  const scheduledInThisMonth = scheduledPosts.filter((p) => {
    if (p.scheduledTime) {
      const pDate = new Date(p.scheduledTime);
      if (!isNaN(pDate.getTime()) && pDate.getFullYear() === calYear && pDate.getMonth() === calMonth) {
        return true;
      }
    }
    if (p.platformSchedules) {
      return Object.values(p.platformSchedules).some((t) => {
        const pDate = new Date(t);
        return !isNaN(pDate.getTime()) && pDate.getFullYear() === calYear && pDate.getMonth() === calMonth;
      });
    }
    return false;
  });

  // Today ISO string for date matching
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const activeSelectedDay = selectedCalDateStr || todayDateStr;

  const selectedDateScheduledPosts = scheduledPosts.filter((p) => {
    if (p.scheduledTime && getPostDateStr(p.scheduledTime) === activeSelectedDay) return true;
    if (p.platformSchedules) {
      return Object.values(p.platformSchedules).some((t) => getPostDateStr(t) === activeSelectedDay);
    }
    return false;
  });

  // Generate calendar grid cells (prev padding + current month + next padding)
  const calendarCells: Array<{
    type: "prev" | "current" | "next";
    dayNum: number;
    dateStr: string;
    isCurrentMonth: boolean;
    isToday?: boolean;
    scheduledList: SocialPost[];
  }> = [];

  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    calendarCells.push({
      type: "prev",
      dayNum,
      dateStr: "",
      isCurrentMonth: false,
      scheduledList: [],
    });
  }

  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayScheduled = scheduledPosts.filter((p) => {
      if (p.scheduledTime && getPostDateStr(p.scheduledTime) === dateStr) return true;
      if (p.platformSchedules) {
        return Object.values(p.platformSchedules).some((t) => getPostDateStr(t) === dateStr);
      }
      return false;
    });

    calendarCells.push({
      type: "current",
      dayNum: d,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayDateStr,
      scheduledList: dayScheduled,
    });
  }

  const remainingCells = 35 - calendarCells.length;
  const targetTotal = remainingCells >= 0 ? 35 : 42;
  const paddingNeeded = targetTotal - calendarCells.length;
  for (let i = 1; i <= paddingNeeded; i++) {
    calendarCells.push({
      type: "next",
      dayNum: i,
      dateStr: "",
      isCurrentMonth: false,
      scheduledList: [],
    });
  }

  return (
    <div className="space-y-6">
      {/* =========================================================================
          TOP BANNER: OMNI-CHANNEL ACCOUNTS OVERVIEW & AI LAUNCHER
          ========================================================================= */}
      <div className="bg-[#111827] border-2 border-amber-500/50 rounded-3xl p-5 sm:p-7 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white border-2 border-amber-400 shadow-md shrink-0 hidden sm:flex items-center justify-center overflow-hidden p-1">
              <img
                src="/thumbnail2.svg"
                alt="Anant Reach Social Media"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold mb-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                Anant Reach • AI Smart Social Publisher
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                <span>🌐</span> Single Post ➔ All Social Media Accounts
              </h1>
              <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-2xl font-medium">
                AI se viral captions banayein aur unhe alag-alag date & time par schedule ya instantly sabhi platforms par publish karein!
              </p>
            </div>
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
              className="px-4 py-3 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black rounded-2xl text-xs transition flex items-center gap-2 cursor-pointer shadow-xl shadow-amber-950/50 border border-amber-300/60 active:scale-95"
            >
              <span className="text-base">✨</span>
              <span>AI Post Creator</span>
              <span className="bg-black/20 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black">NEW</span>
            </button>

            <button
              onClick={() => setShowAccountsModal(true)}
              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-xl shadow-indigo-950/50 border border-indigo-400/30 active:scale-95"
            >
              <span>⚙️</span>
              <span>Linked Accounts ({connectedCount})</span>
            </button>
          </div>
        </div>

        {/* Quick Account Status Pills */}
        <div className="mt-5 pt-4 border-t-2 border-slate-700/80 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-200 font-bold mr-1 flex items-center gap-1">
            <span>📡</span> Active Channels:
          </span>
          {accounts.map((acc) => (
            <div
              key={acc.id}
              onClick={() => handleOpenOAuthPopup(acc.id)}
              title={`Click to open official ${acc.platform} login & verify`}
              className={`px-3 py-1.5 rounded-xl border-2 text-xs font-bold flex items-center gap-2 cursor-pointer transition hover:scale-105 shadow-sm ${
                acc.connected
                  ? "bg-[#062419] border-emerald-500/60 text-emerald-300 hover:border-emerald-400"
                  : "bg-[#0b1020] border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${acc.connected ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`}></span>
              <span className="font-extrabold text-white">{acc.platform}</span>
              <span className="text-[11px] text-slate-300 font-mono hidden sm:inline">{acc.handle}</span>
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
        <div id="composer-section" className="lg:col-span-7 bg-[#111827] border-2 border-slate-700 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-slate-700/80">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2.5 tracking-tight">
                <span className="text-xl">✍️</span> Compose Multi-Platform Post
              </h2>
              <p className="text-xs text-slate-200 mt-1 font-medium">
                Target platforms choose karein aur date/time schedule set karein
              </p>
            </div>
            
            <button
              onClick={() => setShowAiModal(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-300 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-950/40 border border-amber-300/60 active:scale-95"
            >
              <span>✨ Generate with AI</span>
            </button>
          </div>

          {/* 1. Target Platforms Selector */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-black text-white uppercase tracking-wider block flex items-center gap-2">
                <span>🎯</span> Target Social Media Channels (Click to Toggle):
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer underline"
              >
                {selectedPlatforms.length === accounts.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {accounts.map((acc) => {
                const isSelected = selectedPlatforms.includes(acc.id);
                return (
                  <div
                    key={acc.id}
                    onClick={() => handleTogglePlatform(acc.id)}
                    className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-center gap-3 select-none ${
                      isSelected
                        ? "bg-gradient-to-r from-indigo-950 via-[#182348] to-indigo-950 border-indigo-400 text-white shadow-xl shadow-indigo-950/60 ring-2 ring-indigo-500/30"
                        : "bg-[#0b1020] border-slate-700/90 text-slate-200 hover:border-slate-500 hover:bg-[#101730]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-indigo-500 accent-indigo-500 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-black truncate flex items-center gap-1.5 text-white">
                        {acc.platform}
                      </div>
                      <div className="text-[11px] text-indigo-200/90 font-mono truncate font-semibold">{acc.handle}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Post Format Selector: Feed Post vs 9:16 Reel vs Story */}
          <div>
            <label className="text-xs font-black text-white uppercase tracking-wider block mb-2 flex items-center gap-2">
              <span>🎬</span> Choose Post Format (Feed vs Reel vs Story):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPostFormat("feed")}
                className={`p-3 rounded-2xl border-2 transition cursor-pointer text-left flex items-center gap-2.5 ${
                  postFormat === "feed"
                    ? "bg-gradient-to-r from-indigo-950 via-[#182348] to-indigo-950 border-indigo-400 text-white shadow-lg ring-2 ring-indigo-500/30"
                    : "bg-[#0b1020] border-slate-700/80 text-slate-300 hover:border-slate-500"
                }`}
              >
                <span className="text-xl">📸</span>
                <div>
                  <div className="text-xs font-black">Standard Post</div>
                  <div className="text-[10px] text-slate-400">Square / 1:1 Feed</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPostFormat("reel")}
                className={`p-3 rounded-2xl border-2 transition cursor-pointer text-left flex items-center gap-2.5 ${
                  postFormat === "reel"
                    ? "bg-gradient-to-r from-pink-950 via-purple-950 to-pink-950 border-pink-400 text-white shadow-xl ring-2 ring-pink-500/40"
                    : "bg-[#0b1020] border-slate-700/80 text-slate-300 hover:border-pink-500/50"
                }`}
              >
                <span className="text-xl">🎬</span>
                <div>
                  <div className="text-xs font-black flex items-center gap-1">
                    <span>Reel / Shorts</span>
                    <span className="text-[9px] bg-pink-500/30 text-pink-300 px-1 py-0.2 rounded font-mono font-bold">9:16</span>
                  </div>
                  <div className="text-[10px] text-pink-200">Instagram & FB Reel</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPostFormat("story")}
                className={`p-3 rounded-2xl border-2 transition cursor-pointer text-left flex items-center gap-2.5 ${
                  postFormat === "story"
                    ? "bg-gradient-to-r from-amber-950 via-orange-950 to-amber-950 border-amber-400 text-white shadow-lg ring-2 ring-amber-500/30"
                    : "bg-[#0b1020] border-slate-700/80 text-slate-300 hover:border-amber-500/50"
                }`}
              >
                <span className="text-xl">⚡</span>
                <div>
                  <div className="text-xs font-black">Story</div>
                  <div className="text-[10px] text-slate-400">24-Hour Vertical</div>
                </div>
              </button>
            </div>
            {postFormat === "reel" && (
              <div className="mt-2.5 p-2.5 bg-pink-950/40 border border-pink-500/30 rounded-xl text-xs text-pink-200 flex items-center gap-2">
                <span>🎬</span>
                <span><strong>Reel Mode Active:</strong> Instagram Reels aur Facebook Reels par 9:16 vertical video publish hogi.</span>
              </div>
            )}
          </div>

          {/* 3. Caption Textarea & AI Banner */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>📝</span> Post Text / Caption:
              </label>
              <div className="text-xs font-mono font-bold text-indigo-300 bg-slate-800 border border-slate-600 px-2 py-0.5 rounded-lg">
                {caption.length} characters (Twitter: 280)
              </div>
            </div>

            <textarea
              rows={5}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Aapki announcement, offer ya new collection details yahan likhein ya upar 'Generate with AI' par click karein..."
              className="w-full bg-[#070b14] border-2 border-slate-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl p-4 text-sm text-white placeholder:text-slate-400 focus:outline-none transition leading-relaxed shadow-inner"
            ></textarea>

            {/* Quick Hashtag Chips */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-200 font-bold mr-1 flex items-center gap-1">
                <span>🏷️</span> Add Hashtags:
              </span>
              {["#FestiveSale", "#SpecialOffer", "#Trending", "#NewLaunch", "#Discounts", "#WhatsAppOrder", "#BusinessGrowth"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddHashtag(tag)}
                  className="px-3 py-1.5 bg-[#1a233a] hover:bg-indigo-600 border border-slate-600 hover:border-indigo-400 rounded-xl text-xs text-indigo-200 hover:text-white font-mono font-bold transition cursor-pointer shadow-sm active:scale-95"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Media Upload (Image / Video / Reel) */}
          <div>
            <label className="text-xs font-black text-white uppercase tracking-wider block mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>🎬</span> Attach Media (Photo or Video / Reel):
              </span>
              {isUploadingMedia && (
                <span className="text-[11px] font-bold text-pink-400 flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                  Uploading to server...
                </span>
              )}
            </label>
            
            {mediaPreview ? (
              <div className="bg-[#070b14] border-2 border-indigo-500/50 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3 min-w-0">
                  {mediaType === "video" ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-pink-500 bg-black shrink-0 shadow-lg group">
                      <video
                        src={mediaPreview}
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1 left-1 bg-black/80 text-[8px] font-mono font-bold text-pink-300 px-1 py-0.5 rounded pointer-events-none">
                        VIDEO
                      </span>
                    </div>
                  ) : (
                    <img
                      src={mediaPreview}
                      alt="Upload Preview"
                      className="w-16 h-16 object-cover rounded-xl border-2 border-indigo-400 shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-black text-white truncate">{mediaName || (mediaType === "video" ? "Video_Upload.mp4" : "Image_Upload.jpg")}</div>
                    <div className="text-xs text-emerald-400 font-bold capitalize mt-0.5 flex items-center gap-1">
                      <span>✓</span>
                      <span>{mediaType === "video" ? "Video / Reel Attached" : "Photo Attached"} • Ready to Post</span>
                    </div>
                    {mediaType === "video" && postFormat !== "reel" && (
                      <button
                        type="button"
                        onClick={() => setPostFormat("reel")}
                        className="mt-1 text-[11px] font-black text-pink-400 hover:text-pink-300 underline cursor-pointer"
                      >
                        ⚡ Switch to 9:16 Instagram Reel Format
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="media-file-input"
                    className="px-3 py-2 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-600/60 text-indigo-200 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Change
                  </label>
                  <button
                    type="button"
                    onClick={handleRemoveMedia}
                    className="px-3 py-2 bg-[#2a0e16] hover:bg-rose-900 border border-rose-700 text-rose-200 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="media-file-input"
                className="border-2 border-dashed border-indigo-400/50 hover:border-indigo-400 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-[#070b14] hover:bg-[#0c1222] transition group select-none shadow-inner"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border-2 border-indigo-500/40 flex items-center justify-center text-2xl text-indigo-300 group-hover:scale-110 group-hover:border-indigo-400 transition shadow-md">
                  🎬
                </div>
                <span className="text-sm font-extrabold text-white mt-3 group-hover:text-indigo-200 transition">
                  Upload Video (MP4/MOV) or Photo for Post
                </span>
                <span className="text-xs text-slate-300 mt-1 font-medium">
                  Supports MP4, WEBM, MOV Video & JPG, PNG (Instagram Reel & Feed)
                </span>
                <div className="mt-3.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-950/50 transition">
                  <span>📁</span>
                  <span>Browse Video or Photo From Computer</span>
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
          <div className="p-5 bg-[#070b14] rounded-2xl border-2 border-slate-700 space-y-4 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wider">
                <span>🕒</span>
                <span>Scheduling Options (Alag-Alag Time Par Post Karein)</span>
              </label>

              {/* Mode Toggle */}
              <div className="flex bg-[#111827] p-1 rounded-xl border-2 border-slate-700">
                <button
                  type="button"
                  onClick={() => setScheduleMode("now")}
                  className={`px-3.5 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
                    scheduleMode === "now"
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/50"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  ⚡ Publish Now
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleMode("later")}
                  className={`px-3.5 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
                    scheduleMode === "later"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-950/50"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  📅 Schedule Later
                </button>
              </div>
            </div>

            {scheduleMode === "later" && (
              <div className="pt-3 border-t-2 border-slate-700/80 space-y-3.5">
                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-200 font-bold mr-1">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetTime(3)}
                    className="px-3 py-1.5 bg-[#1a233a] hover:bg-indigo-600 border border-slate-600 hover:border-indigo-400 text-xs text-white font-bold rounded-xl cursor-pointer transition shadow-sm"
                  >
                    ⚡ In 3 Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetTime(18)}
                    className="px-3 py-1.5 bg-[#1a233a] hover:bg-indigo-600 border border-slate-600 hover:border-indigo-400 text-xs text-indigo-200 hover:text-white font-bold rounded-xl cursor-pointer transition shadow-sm"
                  >
                    🌅 Tomorrow Morning
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetTime(24)}
                    className="px-3 py-1.5 bg-[#1a233a] hover:bg-purple-600 border border-slate-600 hover:border-purple-400 text-xs text-purple-200 hover:text-white font-bold rounded-xl cursor-pointer transition shadow-sm"
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
                    className="w-4 h-4 rounded text-indigo-500 accent-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="perPlatCheck" className="text-xs text-indigo-300 font-bold cursor-pointer">
                    Har social media platform ke liye alag date & time set karein (Custom Timing)
                  </label>
                </div>

                {!isPerPlatformSchedule ? (
                  // Unified Schedule Input
                  <div>
                    <label className="text-xs text-slate-200 font-bold block mb-1.5">
                      Sabhi platforms ke liye scheduled date & time:
                    </label>
                    <input
                      type="datetime-local"
                      value={unifiedDateTime}
                      onChange={(e) => setUnifiedDateTime(e.target.value)}
                      className="w-full bg-[#131b2e] border-2 border-slate-600 text-sm text-white font-bold rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-400 font-mono shadow-inner"
                    />
                  </div>
                ) : (
                  // Custom Time Per Platform List
                  <div className="space-y-2.5 pt-1">
                    <div className="text-xs text-slate-200 font-bold">
                      Select specific date & time for each active platform:
                    </div>
                    {selectedPlatforms.map((platId) => {
                      const acct = accounts.find((a) => a.id === platId);
                      return (
                        <div
                          key={platId}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-[#111827] rounded-xl border-2 border-slate-700"
                        >
                          <div className="text-xs font-black text-white flex items-center gap-2">
                            <span>{acct?.platform || platId}</span>
                            <span className="text-[11px] text-indigo-200 font-normal font-mono font-semibold">{acct?.handle}</span>
                          </div>
                          <input
                            type="datetime-local"
                            value={platformSchedules[platId] || unifiedDateTime}
                            onChange={(e) =>
                              setPlatformSchedules((prev) => ({ ...prev, [platId]: e.target.value }))
                            }
                            className="bg-[#070b14] border-2 border-slate-600 text-xs text-white font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-400 font-mono"
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
            className={`w-full py-4 text-white rounded-2xl text-sm sm:text-base font-black transition cursor-pointer shadow-2xl flex items-center justify-center gap-3 border border-white/20 active:scale-[0.99] disabled:opacity-60 ${
              scheduleMode === "later"
                ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-purple-950/70"
                : "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-emerald-950/70"
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
                <span className="text-xl">📅</span>
                <span>Schedule Post Across {selectedPlatforms.length} Channels</span>
              </>
            ) : (
              <>
                <span className="text-xl">🚀</span>
                <span>Publish Across {selectedPlatforms.length} Platforms Now</span>
              </>
            )}
          </button>
        </div>

        {/* ==========================================
            RIGHT COLUMN: INTERACTIVE DEVICE PREVIEW (5 COLS)
            ========================================== */}
        <div className="lg:col-span-5 bg-[#111827] border-2 border-slate-700 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b-2 border-slate-700/80">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>📱</span> Live Multi-Channel Preview
            </h3>
            <span className="text-xs font-bold text-indigo-300 bg-indigo-950 px-2.5 py-1 rounded-xl border border-indigo-500/40">
              Interactive Mockup
            </span>
          </div>

          {/* Platform Mockup Tabs */}
          <div className="flex bg-[#070b14] p-1.5 rounded-2xl border-2 border-slate-700 gap-1">
            <button
              onClick={() => setPreviewPlatform("instagram")}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                previewPlatform === "instagram" ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md" : "text-slate-300 hover:text-white"
              }`}
            >
              Instagram
            </button>
            <button
              onClick={() => setPreviewPlatform("facebook")}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                previewPlatform === "facebook" ? "bg-blue-600 text-white shadow-md" : "text-slate-300 hover:text-white"
              }`}
            >
              Facebook
            </button>
            <button
              onClick={() => setPreviewPlatform("linkedin")}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                previewPlatform === "linkedin" ? "bg-sky-600 text-white shadow-md" : "text-slate-300 hover:text-white"
              }`}
            >
              LinkedIn
            </button>
            <button
              onClick={() => setPreviewPlatform("twitter")}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                previewPlatform === "twitter" ? "bg-slate-700 text-white shadow-md" : "text-slate-300 hover:text-white"
              }`}
            >
              X / Twitter
            </button>
          </div>

          {/* DEVICE CONTAINER */}
          <div className="bg-[#070b14] border-2 border-slate-700 rounded-3xl p-4 shadow-inner min-h-[460px]">
            {/* 1. INSTAGRAM FEED OR REEL PREVIEW */}
            {previewPlatform === "instagram" && (
              postFormat === "reel" ? (
                /* Authentic 9:16 Instagram Reel Player Mockup */
                <div className="bg-black border-2 border-pink-500/70 rounded-3xl overflow-hidden shadow-2xl text-white aspect-[9/16] max-w-[270px] mx-auto relative flex flex-col justify-between">
                  {/* Reel Background Video / Media */}
                  {mediaPreview ? (
                    mediaType === "video" ? (
                      <video src={mediaPreview} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <img src={mediaPreview} alt="Reel visual" className="absolute inset-0 w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-purple-950/80 to-black flex items-center justify-center p-4 text-center">
                      <div>
                        <div className="text-4xl mb-2 animate-bounce">🎬</div>
                        <div className="text-xs font-black text-pink-300">Instagram Reel 9:16</div>
                        <div className="text-[10px] text-slate-300 mt-1">Vertical Video Preview</div>
                      </div>
                    </div>
                  )}

                  {/* Top Header Overlay */}
                  <div className="relative z-10 p-3 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black tracking-wider text-white">Reels</span>
                      <span className="text-[10px] text-pink-300">▼</span>
                    </div>
                    <div className="text-sm">📷</div>
                  </div>

                  {/* Right Floating Actions (Like, Comment, Share, Audio) */}
                  <div className="relative z-10 self-end p-3 flex flex-col items-center gap-3.5 mr-1">
                    <div className="flex flex-col items-center">
                      <span className="text-xl drop-shadow cursor-pointer">❤️</span>
                      <span className="text-[10px] font-bold">14.8K</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xl drop-shadow cursor-pointer">💬</span>
                      <span className="text-[10px] font-bold">542</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xl drop-shadow cursor-pointer">✈️</span>
                      <span className="text-[10px] font-bold">Share</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xl drop-shadow cursor-pointer">•••</span>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-slate-900 border-2 border-white/80 overflow-hidden flex items-center justify-center text-[10px] animate-spin">
                      🎵
                    </div>
                  </div>

                  {/* Bottom Caption & Audio Overlay */}
                  <div className="relative z-10 p-3 bg-gradient-to-t from-black/95 via-black/70 to-transparent space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center text-[10px] font-black border border-white">
                        AR
                      </div>
                      <div className="text-xs font-black text-white flex items-center gap-1">
                        <span>anant_reach_official</span>
                        <span className="text-[10px] text-blue-400">✓</span>
                      </div>
                      <button className="px-2 py-0.5 border border-white/60 rounded-lg text-[9px] font-bold text-white">
                        Follow
                      </button>
                    </div>
                    <div className="text-xs text-white line-clamp-2 leading-snug drop-shadow font-normal">
                      {caption || "Aapka Reel caption yahan dikhai dega..."}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-pink-200 font-medium">
                      <span>♫</span>
                      <span className="truncate">Original Audio - anant_reach_official</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-black border-2 border-neutral-700 rounded-2xl overflow-hidden shadow-2xl text-white">
                  <div className="p-3.5 flex items-center justify-between border-b border-neutral-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[2px]">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-xs font-black">
                          AR
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-black flex items-center gap-1 text-white">
                          anant_reach_official
                          <span className="text-[10px] text-blue-400">✓</span>
                        </div>
                        <div className="text-[10px] text-neutral-300 font-medium">Sponsored • India</div>
                      </div>
                    </div>
                    <div className="text-neutral-400 text-sm font-bold">•••</div>
                  </div>

                  <div className="w-full aspect-square bg-neutral-900 flex items-center justify-center overflow-hidden border-y border-neutral-800">
                    {mediaPreview ? (
                      mediaType === "video" ? (
                        <video src={mediaPreview} controls autoPlay loop muted playsInline className="w-full h-full object-cover" />
                      ) : (
                        <img src={mediaPreview} alt="Post visual" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="p-6 text-center text-neutral-400">
                        <div className="text-4xl mb-2">📸</div>
                        <div className="text-xs font-bold text-white">Image or Video Preview</div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">Upload media from composer</div>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-rose-500 cursor-pointer">❤️</span>
                        <span className="cursor-pointer">💬</span>
                        <span className="cursor-pointer">✈️</span>
                      </div>
                      <span className="cursor-pointer">🔖</span>
                    </div>
                    <div className="text-xs font-black text-white">1,842 likes</div>
                    <div className="text-xs leading-relaxed text-neutral-100">
                      <span className="font-black mr-1.5 text-white">anant_reach_official</span>
                      {caption || "Aapka caption yahan dikhega..."}
                    </div>
                    <div className="text-[11px] text-neutral-400 pt-1 font-medium">
                      View all 54 comments • Just now
                    </div>
                  </div>
                </div>
              )
            )}

            {/* 2. FACEBOOK POST PREVIEW */}
            {previewPlatform === "facebook" && (
              <div className="bg-[#111827] border-2 border-slate-700 rounded-2xl overflow-hidden shadow-2xl text-white">
                <div className="p-3.5 flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-black text-sm">
                    FB
                  </div>
                  <div>
                    <div className="text-xs font-black flex items-center gap-1.5 text-white">
                      Anant Reach Official
                      <span className="text-[10px] text-blue-400">✓</span>
                    </div>
                    <div className="text-[10px] text-slate-300 flex items-center gap-1 font-medium">
                      Just now • <span>🌍 Public</span>
                    </div>
                  </div>
                </div>

                <div className="px-3.5 pb-3 text-xs text-slate-100 leading-relaxed whitespace-pre-wrap font-medium">
                  {caption || "Aapka post text Facebook par is tarah dikhai dega..."}
                </div>

                {mediaPreview && (
                  <div className="w-full aspect-video bg-black overflow-hidden border-y border-slate-700">
                    {mediaType === "video" ? (
                      <video src={mediaPreview} controls autoPlay loop muted playsInline className="w-full h-full object-cover" />
                    ) : (
                      <img src={mediaPreview} alt="FB media" className="w-full h-full object-cover" />
                    )}
                  </div>
                )}

                <div className="p-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-300 font-semibold">
                  <div>👍❤️ 524 Reactions</div>
                  <div>86 Comments • 32 Shares</div>
                </div>
              </div>
            )}

            {/* 3. LINKEDIN PREVIEW */}
            {previewPlatform === "linkedin" && (
              <div className="bg-[#111827] border-2 border-slate-700 rounded-2xl overflow-hidden shadow-2xl text-white">
                <div className="p-3.5 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-700 flex items-center justify-center font-black text-sm">
                    in
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">Anant Reach Global</div>
                    <div className="text-[10px] text-slate-300 font-medium">12,450 followers</div>
                    <div className="text-[10px] text-slate-400">Just now • 🌐</div>
                  </div>
                </div>

                <div className="px-3.5 pb-3 text-xs text-slate-100 leading-relaxed whitespace-pre-wrap font-medium">
                  {caption || "Corporate and business updates will render here..."}
                </div>

                {mediaPreview && (
                  <div className="w-full aspect-video bg-black overflow-hidden border-y border-slate-700">
                    {mediaType === "video" ? (
                      <video src={mediaPreview} controls autoPlay loop muted playsInline className="w-full h-full object-cover" />
                    ) : (
                      <img src={mediaPreview} alt="LinkedIn media" className="w-full h-full object-cover" />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 4. TWITTER / X PREVIEW */}
            {previewPlatform === "twitter" && (
              <div className="bg-black border-2 border-neutral-700 rounded-2xl p-4 shadow-2xl text-white">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center font-black text-sm text-white">
                    𝕏
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white">Anant Reach</span>
                      <span className="text-[10px] text-sky-400">✓</span>
                      <span className="text-[11px] text-neutral-400">@AnantReach • 1m</span>
                    </div>

                    <div className="text-xs text-neutral-100 mt-1.5 leading-relaxed whitespace-pre-wrap font-medium">
                      {caption || "Your Tweet will be published to X handle..."}
                    </div>

                    {mediaPreview && (
                      <div className="mt-3 rounded-2xl overflow-hidden border border-neutral-700 aspect-video bg-neutral-900">
                        {mediaType === "video" ? (
                          <video src={mediaPreview} controls autoPlay loop muted playsInline className="w-full h-full object-cover" />
                        ) : (
                          <img src={mediaPreview} alt="Tweet media" className="w-full h-full object-cover" />
                        )}
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
          POST STUDIO: POSTS QUEUE, CONTENT CALENDAR & POST MANAGEMENT
          ========================================================================= */}
      <div className="bg-[#111827] border-2 border-slate-700 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
        {/* Sleek Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-slate-700/80">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span>📋</span> Posts Queue & Content Calendar
            </h3>
            {/* Compact Metric Pills */}
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className="bg-[#062419] text-emerald-300 border-2 border-emerald-500/50 px-2.5 py-1 rounded-xl font-bold">
                ✓ {totalPublishedCount} Published
              </span>
              <span className="bg-[#131b38] text-indigo-200 border-2 border-indigo-500/50 px-2.5 py-1 rounded-xl font-bold">
                ⏳ {totalScheduledCount} Scheduled
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Switcher Tabs: Posts vs Calendar */}
            <div className="flex bg-[#070b14] p-1.5 rounded-2xl border-2 border-slate-700 text-xs shadow-inner gap-1">
              <button
                type="button"
                onClick={() => setActiveHubTab("posts")}
                className={`px-3.5 py-2 rounded-xl font-black transition flex items-center gap-2 cursor-pointer ${
                  activeHubTab === "posts"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <span>📋 Posts Queue</span>
                <span className="bg-black/30 text-white text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                  {postsHistory.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveHubTab("calendar")}
                className={`px-3.5 py-2 rounded-xl font-black transition flex items-center gap-2 cursor-pointer ${
                  activeHubTab === "calendar"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <span>📅 Calendar</span>
                <span className="bg-black/30 text-indigo-200 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                  {totalScheduledCount}
                </span>
              </button>
            </div>

            {/* Quick Actions */}
            <button
              onClick={fetchPosts}
              title="Refresh Posts"
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1 border border-slate-700"
            >
              <span>↻</span> Refresh
            </button>

            {postsHistory.length > 0 && (
              <button
                onClick={handleClearAllHistory}
                title="Clear All History"
                className="px-2.5 py-1.5 bg-[#2a0e16] hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1"
              >
                <span>🗑️</span> Clear All
              </button>
            )}
          </div>
        </div>

        {/* =====================================================================
            TAB 2: 📅 CONTENT CALENDAR: SCHEDULED POSTS VIEW
            ===================================================================== */}
        {activeHubTab === "calendar" && (
          <div className="space-y-5">
            {/* Calendar Controls & Month Header */}
            <div className="bg-slate-950 border border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700 transition cursor-pointer text-xs font-bold"
                    title="Previous Month"
                  >
                    ◀ Prev
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700 transition cursor-pointer text-xs font-bold"
                    title="Next Month"
                  >
                    Next ▶
                  </button>
                </div>

                <h4 className="text-base sm:text-lg font-black text-white tracking-wide">
                  📅 {calMonthName}
                </h4>

                <button
                  type="button"
                  onClick={handleTodayMonth}
                  className="px-2.5 py-1 bg-[#131b38] hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-300 rounded-lg text-xs font-semibold cursor-pointer transition"
                >
                  Today
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-[#131b38] border border-indigo-500/40 text-indigo-300 rounded-xl text-xs font-semibold font-mono">
                  ⏳ {scheduledInThisMonth.length} Scheduled in {calMonthName}
                </span>
              </div>
            </div>

            {/* 7-Day Month Grid */}
            <div className="bg-slate-950 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
              {/* Day Headers */}
              <div className="grid grid-cols-7 bg-slate-900 border-b border-slate-700 text-center text-xs font-bold text-slate-400 py-2.5">
                <div className="text-rose-400">Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div className="text-indigo-400">Sat</div>
              </div>

              {/* Grid Cells */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-800/80">
                {calendarCells.map((cell, idx) => {
                  const isSelected = cell.dateStr === activeSelectedDay;
                  const hasScheduled = cell.scheduledList.length > 0;

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (cell.dateStr) setSelectedCalDateStr(cell.dateStr);
                      }}
                      className={`min-h-[90px] sm:min-h-[105px] p-2 flex flex-col justify-between transition cursor-pointer ${
                        !cell.isCurrentMonth
                          ? "bg-slate-950 text-slate-300 opacity-40 cursor-default"
                          : isSelected
                          ? "bg-[#131b38] ring-2 ring-indigo-500 z-10"
                          : hasScheduled
                          ? "bg-[#131b38] hover:bg-[#131b38]"
                          : "hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold rounded-lg px-1.5 py-0.5 ${
                            cell.isToday
                              ? "bg-indigo-600 text-white shadow-sm"
                              : isSelected
                              ? "bg-slate-800 text-indigo-300"
                              : "text-slate-300"
                          }`}
                        >
                          {cell.dayNum}
                        </span>

                        {cell.isToday && (
                          <span className="text-[9px] font-bold text-indigo-400 bg-[#131b38] px-1 rounded hidden sm:inline">
                            Today
                          </span>
                        )}
                      </div>

                      {/* Scheduled Markers */}
                      {hasScheduled && (
                        <div className="mt-1 space-y-1">
                          <div className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-indigo-950 to-indigo-900/90 border border-indigo-500/50 text-indigo-300 text-[10px] font-bold truncate flex items-center justify-between">
                            <span className="truncate">⏳ {cell.scheduledList.length} Scheduled</span>
                          </div>

                          {/* Mini Platform Icons */}
                          <div className="flex flex-wrap items-center gap-0.5 pt-0.5">
                            {cell.scheduledList.slice(0, 1).map((p) =>
                              p.platforms.slice(0, 3).map((plat) => {
                                const iconMap: Record<string, string> = {
                                  facebook: "👥",
                                  instagram: "📸",
                                  whatsapp: "💬",
                                  linkedin: "💼",
                                  twitter: "🐦",
                                  telegram: "✈️",
                                };
                                return (
                                  <span key={plat} className="text-[11px]" title={plat}>
                                    {iconMap[plat] || "🌐"}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}

                      <div className="h-1"></div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Inspector Panel */}
            <div className="bg-slate-950 border border-slate-700 rounded-2xl p-4 sm:p-5 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-900">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>📌</span> Scheduled Posts for:{" "}
                    <span className="text-indigo-400 font-mono">
                      {activeSelectedDay
                        ? new Date(`${activeSelectedDay}T00:00:00`).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Selected Date"}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Is tareekh par scheduled sabhi posts ka review aur quick actions
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-indigo-300 font-bold bg-[#131b38] px-2.5 py-1 rounded-xl border border-indigo-500/30">
                    {selectedDateScheduledPosts.length} Scheduled
                  </span>
                </div>
              </div>

              {/* Scheduled Posts for Active Date */}
              {selectedDateScheduledPosts.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-slate-300 text-xs">
                    Is date ({activeSelectedDay}) par koi post scheduled nahi hai.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleMode("later");
                      setUnifiedDateTime(`${activeSelectedDay}T10:00`);
                      document.getElementById("composer-section")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md shadow-indigo-950 inline-flex items-center gap-1.5"
                  >
                    <span>➕</span> Is Date Par Post Schedule Karein
                  </button>
                </div>
              ) : (
                <div className="space-y-3 mt-3">
                  {selectedDateScheduledPosts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-4 shadow-md space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-400 border border-indigo-500/40">
                            ⏳ Scheduled
                          </span>
                          <span className="text-xs font-mono text-indigo-300 bg-[#131b38] px-2 py-0.5 rounded-lg border border-indigo-500/30">
                            🕒 Time:{" "}
                            {post.scheduledTime
                              ? new Date(post.scheduledTime).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Unified Schedule"}
                          </span>
                        </div>

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
                            onClick={() => handleDeletePost(post.id)}
                            className="px-2.5 py-1 bg-[#2a0e16] hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1"
                          >
                            <span>🗑️</span> Delete
                          </button>
                        </div>
                      </div>

                      <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {post.caption}
                      </div>

                      {/* Platforms Badge */}
                      <div className="pt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-700">
                        <span className="text-[10px] text-slate-300 font-semibold mr-1">
                          Publish Target:
                        </span>
                        {post.platforms.map((plat) => (
                          <span
                            key={plat}
                            className="text-[10px] px-2 py-0.5 bg-slate-950 text-indigo-300 rounded-md border border-slate-700 capitalize font-medium flex items-center gap-1"
                          >
                            <span>🕒</span> {plat}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 3: 📋 ALL POSTS & AUDIT HISTORY (WITH DELETE BUTTON ON EVERY POST)
            ===================================================================== */}
        {activeHubTab === "posts" && (
          <div className="space-y-4">
            {/* Filter Sub-Tabs */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-700">
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-700 text-xs">
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
                    {totalScheduledCount}
                  </span>
                </button>
              </div>

              <span className="text-xs text-slate-300">
                Total: <strong className="text-slate-300">{postsHistory.length}</strong> items
              </span>
            </div>

            {/* Filtered Posts List */}
            {(() => {
              const list = historyTab === "scheduled" ? scheduledPosts : postsHistory;

              if (list.length === 0) {
                return (
                  <div className="p-8 text-center text-slate-300 text-xs">
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
                          : "border-slate-700 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-900">
                        <div className="flex flex-wrap items-center gap-2">
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
                            <span className="text-xs font-mono text-indigo-300 bg-[#131b38] px-2 py-0.5 rounded-lg border border-indigo-500/30">
                              🕒 Due: {new Date(post.scheduledTime).toLocaleString()}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            Author: <strong className="text-white">{post.author || "Admin"}</strong>
                          </span>
                        </div>

                        {/* Actions for All Posts: Delete Button + Publish Now if Scheduled */}
                        <div className="flex items-center gap-2">
                          {post.status === "Scheduled" && (
                            <button
                              type="button"
                              onClick={() => handlePublishScheduledNow(post.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer transition shadow-sm"
                            >
                              🚀 Publish Now
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            className="px-2.5 py-1 bg-[#2a0e16] hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1"
                          >
                            <span>🗑️</span> Delete
                          </button>
                        </div>
                      </div>

                      <div className="py-2.5 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {post.caption}
                      </div>

                      {/* Platform Delivery Badges */}
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-slate-300 font-semibold">
                          {post.status === "Scheduled" ? "Scheduled For:" : "Published To:"}
                        </span>
                        {post.platforms.map((plat) => {
                          const match = post.results?.find((r) => r.platform === plat);
                          const customTime = post.platformSchedules?.[plat];
                          return (
                            <span
                              key={plat}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-xl text-[11px] text-slate-300 capitalize font-medium"
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
                                <span className="text-[9px] font-mono text-slate-300 bg-slate-950 px-1 rounded">
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
        )}
      </div>

      {/* =========================================================================
          MODAL: AI POST CREATOR & COPYWRITING ASSISTANT
          ========================================================================= */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/90  z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
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
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
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
              <div className="space-y-3 pt-3 border-t border-slate-700">
                <div className="text-xs font-bold text-amber-400 flex items-center justify-between">
                  <span>🎯 AI Generated 3 Variations (Click to Apply):</span>
                  <span className="text-[10px] text-slate-300 font-normal">Choose the best fit</span>
                </div>

                {aiVariations.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-950 border border-slate-700 hover:border-amber-500/50 rounded-2xl p-4 transition space-y-2 group"
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

                    <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans bg-slate-900 p-3 rounded-xl border border-slate-700">
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
        <div className="fixed inset-0 bg-black/90  z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl">
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
                    acc.connected ? "border-emerald-500/30 bg-[#062419]" : "border-slate-700"
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
                            {acc.followers && <span className="text-slate-300"> • {acc.followers}</span>}
                          </>
                        ) : (
                          <span className="text-slate-300">Official Portal par verify karke link karein</span>
                        )}
                      </div>
                      {acc.diagnosticReport && acc.connected && (
                        <div className="mt-1">
                          {acc.diagnosticReport.isLive ? (
                            <span className="text-[10px] text-emerald-300 bg-[#062419] border border-emerald-500/40 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              <span>Live Handshake OK ({acc.diagnosticReport.pingMs}ms)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-300 bg-[#261708] border border-amber-500/40 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
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

                        {acc.id === "whatsapp" ? (
                          <button
                            onClick={() => {
                              setShowAccountsModal(false);
                              setShowWaDirectModal(true);
                            }}
                            className="px-2.5 py-1.5 bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-700/40 text-emerald-200 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1"
                            title="WhatsApp SIM / QR settings"
                          >
                            <span>📱</span>
                            <span>SIM / QR Settings</span>
                          </button>
                        ) : acc.id === "telegram" ? (
                          <button
                            onClick={() => {
                              setShowAccountsModal(false);
                              setShowTgDirectModal(true);
                            }}
                            className="px-2.5 py-1.5 bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-700/40 text-cyan-200 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1"
                            title="Telegram Bot settings"
                          >
                            <span>🤖</span>
                            <span>Bot Settings</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenOAuthPopup(acc.id)}
                            className="px-2.5 py-1.5 bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700/40 text-indigo-200 rounded-xl text-xs font-semibold cursor-pointer transition"
                            title="Official platform gateway open karein"
                          >
                            Portal Re-Login
                          </button>
                        )}
                        <button
                          onClick={() => handleDisconnectAccount(acc.id)}
                          className="px-3 py-1.5 bg-[#2a0e16] hover:bg-rose-900 border border-rose-800/80 text-rose-300 rounded-xl text-xs font-bold cursor-pointer transition"
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        {acc.id === "whatsapp" ? (
                          <button
                            onClick={() => {
                              setShowAccountsModal(false);
                              setShowWaDirectModal(true);
                            }}
                            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-lg shadow-emerald-950/60 flex items-center gap-1.5 active:scale-95"
                          >
                            <span>💬</span>
                            <span>Direct Link WhatsApp (QR / SIM)</span>
                          </button>
                        ) : acc.id === "telegram" ? (
                          <button
                            onClick={() => {
                              setShowAccountsModal(false);
                              setShowTgDirectModal(true);
                            }}
                            className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-lg shadow-cyan-950/60 flex items-center gap-1.5 active:scale-95"
                          >
                            <span>✈️</span>
                            <span>Direct Link Telegram (Bot Token)</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleQuickConnect(acc)}
                            className="px-4 py-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-lg shadow-indigo-950/60 flex items-center gap-1.5 active:scale-95"
                            title="1-Click Verify & Connect"
                          >
                            <span>⚡</span>
                            <span>1-Click Connect & Verify</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-700 flex justify-end">
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
          REAL CONNECTION DIAGNOSTIC & VERIFICATION REPORT MODAL
          ========================================================================= */}
      {activeDiagnosticReport && (
        <div className="fixed inset-0 bg-black/90  z-[80] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative overflow-hidden animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-4">
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
                  ? "bg-[#062419] border-emerald-500/40 text-emerald-300"
                  : "bg-[#261708] border-amber-500/40 text-amber-300"
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
            <div className="bg-slate-950 border border-slate-700 rounded-2xl p-4 space-y-2 mb-5 text-xs text-slate-300">
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
        <div className="fixed inset-0 bg-black/90  z-[90] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-4">
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
            <div className="bg-[#131b38] border border-indigo-500/30 rounded-2xl p-4 mb-4 space-y-3">
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
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
      {/* =========================================================================
          DIRECT WHATSAPP LINKING MODAL (LIVE QR & PHONE PAIRING CODE)
          ========================================================================= */}
      {showWaDirectModal && (
        <div className="fixed inset-0 bg-black/90  z-[80] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-lg shadow-emerald-950/50">
                  💬
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    Direct Link WhatsApp
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                      Baileys Live Engine
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Scan Live QR Code ya 8-Digit Pairing Code se WhatsApp jodein
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWaDirectModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* If an active SIM is already detected on the engine */}
            {waSessions.some((s) => s.status === "CONNECTED") && (
              <div className="mb-5 bg-[#062419] border border-emerald-500/40 rounded-2xl p-4 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Live SIM Engine Connected!</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Render Online</span>
                </div>
                {waSessions
                  .filter((s) => s.status === "CONNECTED")
                  .map((s) => (
                    <div
                      key={s.id}
                      className="bg-slate-950 border border-slate-700 rounded-xl p-3 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-bold text-white font-mono">
                          +{s.userPhone || "918875216646"}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-medium">
                          {s.label || "Active WhatsApp SIM"} • Status: READY
                        </div>
                      </div>
                      <button
                        onClick={() => handleLinkWaDirect(s.userPhone || "918875216646")}
                        disabled={isWaLoading}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-md shadow-emerald-950/50 flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                      >
                        <span>⚡</span>
                        <span>Instant Link This SIM</span>
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {/* QR Code Section */}
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-700 rounded-2xl p-4 text-center">
                <div className="text-xs font-bold text-slate-200 mb-2 flex items-center justify-center gap-1.5">
                  <span>📷</span>
                  <span>Option 1: Scan QR Code with Phone WhatsApp</span>
                </div>
                {waQrCode ? (
                  <div className="inline-block p-2 bg-white rounded-2xl shadow-xl shadow-black/60 my-2">
                    <img
                      src={waQrCode}
                      alt="WhatsApp QR Code"
                      className="w-48 h-48 rounded-xl object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 mx-auto my-2 rounded-2xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center gap-2 text-slate-300 text-xs">
                    <span className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                    <span>Loading QR Code...</span>
                  </div>
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  WhatsApp ➔ Settings ➔ Linked Devices ➔ <strong>Link a Device</strong>
                </p>
                <button
                  type="button"
                  onClick={fetchWaSessions}
                  disabled={isWaLoading}
                  className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer underline flex items-center justify-center gap-1 mx-auto"
                >
                  <span>🔄</span>
                  <span>Refresh QR Code</span>
                </button>
              </div>

              {/* Option 2: 8-Digit Pairing Code */}
              <div className="bg-slate-950 border border-slate-700 rounded-2xl p-4 text-left">
                <div className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                  <span>🔢</span>
                  <span>Option 2: Ya Phone Number se 8-Digit Code payein</span>
                </div>
                {waPairingCode ? (
                  <div className="bg-[#062419] border border-emerald-500/50 rounded-xl p-3.5 text-center space-y-1">
                    <span className="text-[11px] text-slate-300 font-medium">
                      WhatsApp me ye 8-digit code enter karein:
                    </span>
                    <div className="text-2xl font-mono font-black text-emerald-400 tracking-widest select-all my-1">
                      {waPairingCode}
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Linked Devices ➔ Link with phone number instead
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleGenerateWaPairingCode} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Mobile no (e.g. 918875216646)"
                      value={waPairingPhone}
                      onChange={(e) => setWaPairingPhone(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono placeholder-slate-600"
                    />
                    <button
                      type="submit"
                      disabled={isGeneratingWaPairing}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition shrink-0 shadow-md shadow-emerald-950/50"
                    >
                      {isGeneratingWaPairing ? "Generating..." : "Get Code"}
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-700 flex justify-end">
              <button
                type="button"
                onClick={() => setShowWaDirectModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DIRECT TELEGRAM LINKING MODAL (BOT TOKEN & CHANNEL ID)
          ========================================================================= */}
      {showTgDirectModal && (
        <div className="fixed inset-0 bg-black/90  z-[80] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-600 text-white flex items-center justify-center text-xl shadow-lg shadow-cyan-950/50">
                  ✈️
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    Direct Link Telegram
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-mono border border-cyan-500/30">
                      Bot API
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Bot Token & Channel Username se 15 second me link karein
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTgDirectModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Quick 3-Step Guide */}
            <div className="bg-[#07242d] border border-cyan-500/30 rounded-2xl p-3.5 mb-4 text-[11px] text-cyan-200 space-y-1.5 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 text-white">
                <span>⚡</span> Telegram Channel Setup (15 Seconds):
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-slate-300 text-[11px]">
                <li>
                  Telegram me <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-cyan-400 underline font-semibold">@BotFather</a> par jayein aur <code className="text-white bg-slate-950 px-1 py-0.5 rounded">/newbot</code> banayein.
                </li>
                <li>Milne wala <strong>Bot API Token</strong> yahan paste karein.</li>
                <li>Apne Telegram Channel me is bot ko <strong>Administrator</strong> banayein aur channel username yahan dalein.</li>
              </ol>
            </div>

            {tgError && (
              <div className="bg-[#2a0e16] border border-rose-800 text-rose-300 rounded-xl p-3 mb-4 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{tgError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyTelegramDirect} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Telegram Bot Token (@BotFather):
                </label>
                <input
                  type="text"
                  value={tgBotToken}
                  onChange={(e) => setTgBotToken(e.target.value)}
                  required
                  placeholder="7123456789:AAHk..._your_bot_token"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Channel ID / Username:
                </label>
                <input
                  type="text"
                  value={tgChannelId}
                  onChange={(e) => setTgChannelId(e.target.value)}
                  placeholder="@MyChannel (e.g. @AnantNews or -100...)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTgDirectModal(false)}
                  disabled={isTgVerifying}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTgVerifying}
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 disabled:opacity-50"
                >
                  {isTgVerifying ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Verifying Bot API...</span>
                    </>
                  ) : (
                    <>
                      <span>🔗</span>
                      <span>Verify & Link Telegram</span>
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
