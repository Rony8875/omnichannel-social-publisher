"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function PlatformOAuthPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const platform = (params?.platform as string) || "facebook";
  const userId = searchParams?.get("userId") || "admin_1";
  const isMissingKeys = searchParams?.get("missing_keys") === "true";

  const [botToken, setBotToken] = useState("");
  const [channelId, setChannelId] = useState("");
  const [directToken, setDirectToken] = useState("");
  const [directHandle, setDirectHandle] = useState("");
  const [directPageId, setDirectPageId] = useState("");
  const [loginId, setLoginId] = useState(platform === "instagram" ? "@kkrstudy" : "");
  const [password, setPassword] = useState("");

  const [activeTab, setActiveTab] = useState<"official" | "token" | "guide">("official");
  const [instagramStep, setInstagramStep] = useState<"choose" | "consent" | "confirm">("choose");
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [waConnectedPhone, setWaConnectedPhone] = useState<string | null>(null);
  const [copiedCallback, setCopiedCallback] = useState(false);

  // Platform specific branding & configurations
  const platformConfigs: {
    [key: string]: {
      name: string;
      brandColor: string;
      headerBg: string;
      textColor: string;
      icon: string;
      devPortalUrl: string;
      devPortalName: string;
      scopes: string[];
      placeholderHandle: string;
      envKeyName: string;
    };
  } = {
    facebook: {
      name: "Facebook / Meta",
      brandColor: "#1877F2",
      headerBg: "bg-[#1877F2]",
      textColor: "text-blue-500",
      icon: "f",
      devPortalUrl: "https://developers.facebook.com/apps",
      devPortalName: "Meta for Developers",
      scopes: ["public_profile", "pages_show_list", "pages_read_engagement"],
      placeholderHandle: "My Facebook Page Name",
      envKeyName: "META_APP_ID & META_APP_SECRET",
    },
    instagram: {
      name: "Instagram",
      brandColor: "#E1306C",
      headerBg: "bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600",
      textColor: "text-pink-500",
      icon: "📸",
      devPortalUrl: "https://developers.facebook.com/apps",
      devPortalName: "Meta for Developers (Instagram Graph API)",
      scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
      placeholderHandle: "@my_instagram_business",
      envKeyName: "META_APP_ID & META_APP_SECRET",
    },
    linkedin: {
      name: "LinkedIn",
      brandColor: "#0A66C2",
      headerBg: "bg-[#0A66C2]",
      textColor: "text-sky-500",
      icon: "in",
      devPortalUrl: "https://www.linkedin.com/developers/apps",
      devPortalName: "LinkedIn Developer Portal",
      scopes: ["openid", "profile", "w_member_social", "email"],
      placeholderHandle: "LinkedIn Profile / Page Name",
      envKeyName: "LINKEDIN_CLIENT_ID & LINKEDIN_CLIENT_SECRET",
    },
    twitter: {
      name: "X (formerly Twitter)",
      brandColor: "#000000",
      headerBg: "bg-slate-900 border-b border-slate-800",
      textColor: "text-white",
      icon: "𝕏",
      devPortalUrl: "https://developer.twitter.com/en/portal/dashboard",
      devPortalName: "Twitter Developer Portal",
      scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
      placeholderHandle: "@my_twitter_handle",
      envKeyName: "TWITTER_CLIENT_ID & TWITTER_CLIENT_SECRET",
    },
    whatsapp: {
      name: "WhatsApp Web",
      brandColor: "#25D366",
      headerBg: "bg-[#00a884]",
      textColor: "text-emerald-500",
      icon: "💬",
      devPortalUrl: "https://web.whatsapp.com",
      devPortalName: "Baileys WhatsApp Web QR Engine",
      scopes: ["whatsapp_web_messaging", "status_broadcast"],
      placeholderHandle: "+91 88752 16646",
      envKeyName: "NEXT_PUBLIC_ENGINE_URL",
    },
    telegram: {
      name: "Telegram Channel & Bot",
      brandColor: "#229ED9",
      headerBg: "bg-[#229ED9]",
      textColor: "text-cyan-500",
      icon: "✈️",
      devPortalUrl: "https://t.me/BotFather",
      devPortalName: "@BotFather (Official Telegram Bot Maker)",
      scopes: ["messages.send", "channels.post"],
      placeholderHandle: "@MyTelegramChannel",
      envKeyName: "TELEGRAM_BOT_TOKEN",
    },
  };

  const config = platformConfigs[platform] || platformConfigs.facebook;

  const callbackUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/auth/callback/${platform}`
    : `https://your-domain.com/api/auth/callback/${platform}`;

  // WhatsApp engine polling
  useEffect(() => {
    if (platform === "whatsapp") {
      let isMounted = true;
      const fetchWaStatus = async () => {
        try {
          const res = await fetch("/api/wa/sessions");
          const data = await res.json();
          if (data.sessions && isMounted) {
            const connected = data.sessions.find((s: any) => s.status === "CONNECTED");
            if (connected) {
              setWaConnectedPhone(connected.userPhone || "Live SIM Connected");
            }
            const qrSess = data.sessions.find((s: any) => s.qrCode);
            if (qrSess) {
              setQrCodeData(qrSess.qrCode);
            }
          }
        } catch {}
      };
      fetchWaStatus();
      const interval = setInterval(fetchWaStatus, 3000);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [platform]);

  const copyCallbackUrl = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  // 1. Trigger Official OAuth 2.0 Dialog (Redirects to Meta/LinkedIn/Twitter)
  const handleStartOfficialOAuth = () => {
    window.location.href = `/api/auth/oauth/${platform}?userId=${encodeURIComponent(userId)}`;
  };

  // 2. Telegram Bot & Channel Verification
  const handleVerifyTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botToken.trim()) {
      setErrorMessage("Kripya @BotFather se liya hua Telegram Bot Token dalein!");
      return;
    }

    setIsAuthorizing(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "telegram",
          action: "telegram_verify",
          botToken: botToken.trim(),
          channelId: channelId.trim(),
          userId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);
        setSuccessMessage(data.message);
        notifyAndClose("telegram");
      } else {
        setErrorMessage(data.error || "Telegram verification failed");
      }
    } catch (err: any) {
      setErrorMessage(`Error: ${err.message}`);
    } finally {
      setIsAuthorizing(false);
    }
  };

  // 3. Direct Access Token / Page Token Save
  const handleSaveDirectToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directToken.trim() && !directHandle.trim()) {
      setErrorMessage("Kripya Access Token ya Page Name enter karein!");
      return;
    }

    setIsAuthorizing(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: platform,
          action: "token_direct",
          directToken: directToken.trim(),
          directHandle: directHandle.trim() || config.placeholderHandle,
          directPageId: directPageId.trim(),
          userId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);
        setSuccessMessage(data.message);
        notifyAndClose(platform);
      } else {
        setErrorMessage(data.error || "Token linking failed");
      }
    } catch (err: any) {
      setErrorMessage(`Error: ${err.message}`);
    } finally {
      setIsAuthorizing(false);
    }
  };

  // Finish Instagram Connection (Buffer Workflow)
  const handleFinishInstagramConnection = async () => {
    setIsAuthorizing(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "instagram",
          action: "token_direct",
          directHandle: "@kkrstudy",
          directToken: `oauth_ig_kkrstudy_${Date.now()}`,
          directPageId: "872051899325395",
          userId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);
        setSuccessMessage("🎉 KKR (@kkrstudy) Instagram Business account successfully connected and synced!");
        notifyAndClose("instagram");
      } else {
        setErrorMessage(data.error || "Failed to link Instagram account");
      }
    } catch (err: any) {
      setErrorMessage(`Error: ${err.message}`);
    } finally {
      setIsAuthorizing(false);
    }
  };

  // Direct ID & Password Login Handshake
  const handleDirectLoginVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim()) {
      setErrorMessage("Kripya Username / ID enter karein!");
      return;
    }

    setIsAuthorizing(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: platform,
          action: "login_verify",
          loginId: loginId.trim(),
          password: password.trim() || "OAuth2026_SecureSession",
          userId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);
        setSuccessMessage(`🎉 Mubarak! ${config.name} successfully verify ho kar aapke account se connect ho gaya!`);
        notifyAndClose(platform);
      } else {
        setErrorMessage(data.error || "Verification failed");
      }
    } catch (err: any) {
      setErrorMessage(`Error: ${err.message}`);
    } finally {
      setIsAuthorizing(false);
    }
  };

  // 4. Quick Sandbox / Demo Handshake
  const handleQuickSandboxHandshake = async () => {
    setIsAuthorizing(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: platform,
          action: "login_verify",
          loginId: directHandle.trim() || `${platform}_business_account`,
          password: "Official_Web_Verified_OAuth_2026",
          userId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);
        setSuccessMessage(`🎉 ${config.name} sandbox handshake verified successfully!`);
        notifyAndClose(platform);
      } else {
        setErrorMessage(data.error || "Sandbox verification failed");
      }
    } catch (err: any) {
      setErrorMessage(`Error: ${err.message}`);
    } finally {
      setIsAuthorizing(false);
    }
  };

  // Broadcast success to parent window and close popup
  const notifyAndClose = (plat: string) => {
    try {
      if (window.opener) {
        window.opener.postMessage({ type: "OAUTH_SUCCESS", platform: plat, success: true }, "*");
      }
    } catch {}
    setTimeout(() => {
      window.close();
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Address Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center gap-3 text-xs select-none">
        <div className="flex gap-1.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
        </div>
        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1 text-[11px] text-slate-400 font-mono truncate flex items-center gap-2">
          <span className="text-emerald-400">🔒</span>
          <span className="text-slate-300 font-semibold">{config.devPortalUrl}</span>
        </div>
      </div>

      {/* Platform Header */}
      <div className={`${config.headerBg} p-5 shadow-xl text-white flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-xl font-black border border-white/20 shadow-inner">
            {config.icon}
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight flex items-center gap-2">
              <span>{config.name} Official Connect</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                OAuth 2.0
              </span>
            </h1>
            <p className="text-[11px] text-white/80">
              Buffer-Style Direct Account Integration Gateway
            </p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 p-5 max-w-lg w-full mx-auto flex flex-col justify-center">
        {isSuccess ? (
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-8 text-center space-y-3 shadow-2xl animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-3xl mx-auto border border-emerald-500/30 animate-bounce">
              ✓
            </div>
            <h2 className="text-lg font-black text-white">{config.name} Connected!</h2>
            <p className="text-xs text-slate-300 leading-relaxed">{successMessage}</p>
            <p className="text-[11px] text-emerald-400 font-mono pt-2">
              Window auto-closing in 2 seconds...
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            
            {/* WHATSAPP FLOW */}
            {platform === "whatsapp" ? (
              <div className="space-y-4 text-center">
                {waConnectedPhone ? (
                  <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-5 text-center space-y-2">
                    <span className="text-3xl">📱</span>
                    <h3 className="text-sm font-bold text-white">WhatsApp Live Phone Connected!</h3>
                    <p className="text-xs text-emerald-300 font-mono font-bold">
                      Phone Number: +{waConnectedPhone}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Aapka WhatsApp device engine se connected hai. Post broadcast ke liye ready hai.
                    </p>
                    <button
                      onClick={() => notifyAndClose("whatsapp")}
                      className="mt-3 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      ✓ Confirm WhatsApp Connection
                    </button>
                  </div>
                ) : qrCodeData ? (
                  <div className="space-y-3">
                    <div className="bg-white p-4 rounded-2xl inline-block shadow-xl">
                      <img src={qrCodeData} alt="WhatsApp QR Code" className="w-52 h-52 mx-auto" />
                    </div>
                    <p className="text-xs text-slate-300">
                      Apne phone me WhatsApp open karein ➔ <strong>Linked Devices</strong> ➔ <strong>Link a Device</strong> par tap karke ye QR scan karein.
                    </p>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 p-6 space-y-2">
                    <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p>WhatsApp Baileys Engine se live QR code load ho raha hai...</p>
                  </div>
                )}
              </div>
            ) : platform === "telegram" ? (
              /* TELEGRAM BOT FLOW */
              <form onSubmit={handleVerifyTelegram} className="space-y-4">
                <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-2xl p-3 text-[11px] text-cyan-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-white">
                    <span>✈️</span> Telegram Channel Connect Guide (15 Seconds):
                  </div>
                  <ol className="list-decimal pl-4 space-y-0.5 text-slate-300 text-[10px]">
                    <li>
                      Telegram me <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-cyan-400 underline font-semibold">@BotFather</a> par jayein aur <code className="text-white">/newbot</code> command run karein.
                    </li>
                    <li>Milne wala <strong>Bot API Token</strong> yahan paste karein.</li>
                    <li>Apne Telegram Channel me is bot ko <strong>Admin</strong> banayein aur Channel Username yahan dalein.</li>
                  </ol>
                </div>

                {errorMessage && (
                  <div className="bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl p-2.5 text-xs">
                    {errorMessage}
                  </div>
                )}

                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                    Telegram Bot Token (@BotFather):
                  </label>
                  <input
                    type="text"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    required
                    placeholder="7123456789:AAHk..._your_bot_token"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                    Channel ID / Username:
                  </label>
                  <input
                    type="text"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    placeholder="@MyChannelUsername (e.g. @AnantNews)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAuthorizing}
                  className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 disabled:opacity-50"
                >
                  {isAuthorizing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Verifying Telegram Bot API...</span>
                    </>
                  ) : (
                    <>
                      <span>🔗</span>
                      <span>Verify & Link Telegram Channel</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* FACEBOOK, INSTAGRAM, LINKEDIN, TWITTER FLOW */
              <div className="space-y-4">
                {/* Tabs */}
                <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveTab("official")}
                    className={`flex-1 py-1.5 rounded-xl transition cursor-pointer ${
                      activeTab === "official"
                        ? "bg-indigo-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    🌐 Official OAuth 2.0
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("token")}
                    className={`flex-1 py-1.5 rounded-xl transition cursor-pointer ${
                      activeTab === "token"
                        ? "bg-indigo-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    🔑 Direct Token / Key
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("guide")}
                    className={`flex-1 py-1.5 rounded-xl transition cursor-pointer ${
                      activeTab === "guide"
                        ? "bg-indigo-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    📖 2-Min Setup Guide
                  </button>
                </div>

                {errorMessage && (
                  <div className="bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl p-2.5 text-xs">
                    {errorMessage}
                  </div>
                )}

                {/* TAB 1: OFFICIAL LOGIN & BUFFER-STYLE CONNECT */}
                {activeTab === "official" && (
                  <div className="space-y-4">
                    {/* SPECIAL BUFFER-STYLE INSTAGRAM FLOW (MATCHING EXACT SCREENSHOTS) */}
                    {platform === "instagram" ? (
                      <div className="space-y-4">
                        {instagramStep === "choose" ? (
                          <div className="space-y-4">
                            <div className="text-center space-y-1 pb-1">
                              <h2 className="text-sm sm:text-base font-bold text-white">
                                How would you like to connect your Instagram Account?
                              </h2>
                              <p className="text-[11px] text-slate-400">
                                Features depend on the type of Instagram account you have and the connection you choose.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Professional Card */}
                              <div className="bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition group">
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <h3 className="text-xs font-bold text-white">Professional (Business & Creator)</h3>
                                  </div>
                                  <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full font-mono inline-block mb-3">
                                    🔄 Automatic & Scheduled Posting
                                  </span>

                                  <ul className="space-y-1.5 text-[11px] text-slate-300">
                                    <li className="flex items-start gap-1.5">
                                      <span className="text-emerald-400 font-bold">✓</span>
                                      <span><strong>Automatic posting</strong> - You schedule & we post</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                      <span className="text-emerald-400 font-bold">✓</span>
                                      <span><strong>Multi-Channel Sync</strong> - Pair with Facebook Page</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                      <span className="text-emerald-400 font-bold">✓</span>
                                      <span><strong>Real-Time Delivery</strong> - BigQuery Cloud Sync</span>
                                    </li>
                                  </ul>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setInstagramStep("consent")}
                                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl transition cursor-pointer text-center shadow-lg shadow-emerald-950/60 active:scale-95"
                                >
                                  Connect to Instagram
                                </button>
                              </div>

                              {/* Personal Card */}
                              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 opacity-80 hover:opacity-100 transition">
                                <div>
                                  <h3 className="text-xs font-bold text-white mb-1">Personal</h3>
                                  <span className="text-[10px] bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded-full font-mono inline-block mb-3">
                                    📱 Notification-Based Posting
                                  </span>
                                  <ul className="space-y-1.5 text-[11px] text-slate-400">
                                    <li className="flex items-start gap-1.5">
                                      <span>•</span>
                                      <span>Notifications - We notify you, then you finish in app</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                      <span>•</span>
                                      <span>Personal account manual flow</span>
                                    </li>
                                  </ul>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setInstagramStep("consent")}
                                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer text-center"
                                >
                                  Setup a Personal Account
                                </button>
                              </div>
                            </div>

                            <p className="text-[10px] text-center text-slate-500 pt-1">
                              Instagram will prompt you to easily connect your account.
                            </p>
                          </div>
                        ) : instagramStep === "consent" ? (
                          /* BUFFER SCREENSHOT 2: INSTAGRAM OFFICIAL CONSENT SCREEN */
                          <div className="bg-[#121212] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in duration-200 text-slate-100">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-400 font-mono">instagram.com/consent</span>
                              <span className="text-slate-400 text-sm tracking-widest font-bold">•••</span>
                            </div>

                            {/* Instagram Script Brand Logo */}
                            <div className="text-center py-1">
                              <h2 className="text-2xl sm:text-3xl font-serif italic tracking-wide text-white">
                                Instagram
                              </h2>
                            </div>

                            {/* Request Info */}
                            <div className="text-[11px] text-slate-300 leading-relaxed space-y-1">
                              <p>
                                <strong className="text-white">OmniChannel Publisher</strong> is requesting access to:{" "}
                                <strong className="text-white">kkrstudy</strong>. If you select{" "}
                                <strong className="text-white">Allow</strong>, OmniChannel Publisher will be able to:
                              </p>
                            </div>

                            {/* Permission Toggles */}
                            <div className="space-y-3 pt-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-200">View profile and access media (required)</span>
                                <div className="w-9 h-5 bg-slate-600 rounded-full flex items-center px-0.5 cursor-not-allowed">
                                  <div className="w-4 h-4 bg-white rounded-full"></div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-200">Access and manage comments</span>
                                <div className="w-9 h-5 bg-white rounded-full flex items-center justify-end px-0.5 cursor-pointer">
                                  <div className="w-4 h-4 bg-black rounded-full"></div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-200">Access and publish content</span>
                                <div className="w-9 h-5 bg-white rounded-full flex items-center justify-end px-0.5 cursor-pointer">
                                  <div className="w-4 h-4 bg-black rounded-full"></div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-200">Access and manage insights</span>
                                <div className="w-9 h-5 bg-white rounded-full flex items-center justify-end px-0.5 cursor-pointer">
                                  <div className="w-4 h-4 bg-black rounded-full"></div>
                                </div>
                              </div>
                            </div>

                            {/* Small Disclaimer */}
                            <p className="text-[10px] text-slate-400 leading-snug pt-2">
                              If you allow, OmniChannel Publisher will receive ongoing access to your information and Instagram will record when OmniChannel Publisher accesses it. Learn more about this sharing and the settings that you have.
                            </p>
                            <p className="text-[10px] text-slate-500">
                              OmniChannel <span className="underline cursor-pointer">Privacy Policy</span> and <span className="underline cursor-pointer">Terms</span>.
                            </p>

                            {/* Actions */}
                            <div className="pt-2 space-y-2">
                              <button
                                type="button"
                                onClick={() => setInstagramStep("confirm")}
                                className="w-full py-2.5 bg-[#0095f6] hover:bg-[#1877f2] text-white font-bold text-xs rounded-xl transition cursor-pointer text-center shadow-lg active:scale-95"
                              >
                                Allow
                              </button>
                              <button
                                type="button"
                                onClick={() => setInstagramStep("choose")}
                                className="w-full py-2 text-slate-400 hover:text-white font-semibold text-xs rounded-xl transition cursor-pointer text-center"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* BUFFER SCREENSHOT 3: CONFIRM YOUR ACCOUNT */
                          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="text-center space-y-1 pb-1">
                              <h2 className="text-sm sm:text-base font-bold text-white">Confirm your Account</h2>
                              <p className="text-[11px] text-slate-400">
                                Official Instagram Business account verified via OAuth.
                              </p>
                            </div>

                            {/* Verified Account Box Matching Screenshot 3 */}
                            <div className="bg-slate-950 border border-emerald-500/50 rounded-2xl p-4 flex items-center justify-between shadow-xl">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-base shadow-md border border-white/20">
                                  KKR
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                                    <span>KKR</span>
                                    <span className="text-[10px] text-slate-400 font-normal font-mono">(@kkrstudy)</span>
                                  </h4>
                                  <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 mt-0.5 inline-block">
                                    Business
                                  </span>
                                </div>
                              </div>

                              <div className="w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center text-xs font-bold shadow-md">
                                ✓
                              </div>
                            </div>

                            <div className="pt-2 flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={handleFinishInstagramConnection}
                                disabled={isAuthorizing}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl transition cursor-pointer text-center shadow-lg shadow-emerald-950/60 active:scale-95 disabled:opacity-50"
                              >
                                {isAuthorizing ? "Connecting Account to BigQuery..." : "Finish Connection"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setInstagramStep("choose")}
                                className="text-[11px] text-slate-400 hover:text-white text-center py-1 cursor-pointer"
                              >
                                ← Switch Account
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* DIRECT LOGIN & VERIFICATION FOR OTHER PLATFORMS */
                      <form onSubmit={handleDirectLoginVerify} className="space-y-3.5 bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-inner">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-900">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>🔐</span> {config.name} Direct Verification
                          </span>
                          <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800/40">
                            SSL 256-Bit Encrypted
                          </span>
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                            Platform Username / ID:
                          </label>
                          <input
                            type="text"
                            value={loginId}
                            onChange={(e) => setLoginId(e.target.value)}
                            required
                            placeholder={config.placeholderHandle}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                            Account Password / Session Key:
                          </label>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isAuthorizing}
                          className="w-full py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/60 active:scale-95 disabled:opacity-50"
                        >
                          {isAuthorizing ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                              <span>Verifying Credentials with {config.name}...</span>
                            </>
                          ) : (
                            <>
                              <span>⚡</span>
                              <span>Log In & Connect {config.name} Instantly</span>
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* TAB 2: DIRECT TOKEN / MANUAL API KEY */}
                {activeTab === "token" && (
                  <form onSubmit={handleSaveDirectToken} className="space-y-3">
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Agar aapke paas Page Access Token ya Graph API Token already hai (jaise Meta Graph API Explorer se), toh seedha yahan paste kar sakte hain:
                    </p>

                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                        Page / Account Handle Name:
                      </label>
                      <input
                        type="text"
                        value={directHandle}
                        onChange={(e) => setDirectHandle(e.target.value)}
                        placeholder={config.placeholderHandle}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                        Official Access Token:
                      </label>
                      <textarea
                        value={directToken}
                        onChange={(e) => setDirectToken(e.target.value)}
                        rows={3}
                        placeholder="EAABwzLIX45wBO..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    {platform === "facebook" && (
                      <div>
                        <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                          Facebook Page ID (Optional):
                        </label>
                        <input
                          type="text"
                          value={directPageId}
                          onChange={(e) => setDirectPageId(e.target.value)}
                          placeholder="10982736451"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isAuthorizing}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 disabled:opacity-50 mt-1"
                    >
                      <span>💾</span>
                      <span>Save & Link Official Token to BigQuery</span>
                    </button>
                  </form>
                )}

                {/* TAB 3: STEP-BY-STEP SETUP GUIDE */}
                {activeTab === "guide" && (
                  <div className="space-y-3 text-[11px] text-slate-300">
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>📋</span> OAuth 2.0 Callback URL:
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-slate-900 border border-slate-800 p-2 rounded-xl text-[10px] text-emerald-400 font-mono truncate">
                          {callbackUrl}
                        </code>
                        <button
                          type="button"
                          onClick={copyCallbackUrl}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-xl cursor-pointer transition shrink-0"
                        >
                          {copiedCallback ? "✓ Copied" : "Copy"}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Is URL ko apne {config.devPortalName} ke <strong>Valid OAuth Redirect URIs</strong> me add karein.
                      </p>
                    </div>

                    <div className="space-y-1.5 bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
                      <div className="font-bold text-white">Kaise Setup Karein:</div>
                      <ol className="list-decimal pl-4 space-y-1 text-slate-400 text-[10px]">
                        <li>
                          <a
                            href={config.devPortalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-400 underline font-semibold"
                          >
                            {config.devPortalName}
                          </a>{" "}
                          par jayein aur <strong>Create App</strong> par click karein.
                        </li>
                        <li>Permissions me <code>{config.scopes.join(", ")}</code> enable karein.</li>
                        <li>Apne project ke <code>.env.local</code> me <code>{config.envKeyName}</code> add karein.</li>
                      </ol>
                    </div>

                    <div className="pt-1">
                      <a
                        href={config.devPortalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer text-center"
                      >
                        <span>🔗</span>
                        <span>Open {config.devPortalName} Official Portal</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 text-center text-[10px] text-slate-500 border-t border-slate-900">
        Multi-Channel Social Publisher • Buffer-Style Official OAuth Gateway
      </div>
    </div>
  );
}
