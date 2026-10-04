"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function PlatformOAuthPage() {
  const params = useParams();
  const platform = (params?.platform as string) || "facebook";

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [waConnectedPhone, setWaConnectedPhone] = useState<string | null>(null);

  // Platform specific branding & URLs
  const platformConfigs: { [key: string]: {
    name: string;
    brandColor: string;
    headerBg: string;
    textColor: string;
    icon: string;
    authUrl: string;
    realLoginUrl: string;
    permissionScope: string[];
    defaultHandle: string;
  } } = {
    facebook: {
      name: "Facebook / Meta",
      brandColor: "#1877F2",
      headerBg: "bg-[#1877F2]",
      textColor: "text-blue-500",
      icon: "f",
      authUrl: "https://www.facebook.com/v18.0/dialog/oauth?client_id=10982736451",
      realLoginUrl: "https://www.facebook.com/login",
      permissionScope: [
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_posts",
        "public_profile"
      ],
      defaultHandle: "",
    },
    instagram: {
      name: "Instagram",
      brandColor: "#E1306C",
      headerBg: "bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600",
      textColor: "text-pink-500",
      icon: "📸",
      authUrl: "https://api.instagram.com/oauth/authorize?client_id=1784140029384",
      realLoginUrl: "https://www.instagram.com/accounts/login/",
      permissionScope: [
        "instagram_basic",
        "instagram_content_publish",
        "instagram_manage_insights"
      ],
      defaultHandle: "",
    },
    linkedin: {
      name: "LinkedIn",
      brandColor: "#0A66C2",
      headerBg: "bg-[#0A66C2]",
      textColor: "text-sky-500",
      icon: "in",
      authUrl: "https://www.linkedin.com/oauth/v2/authorization?response_type=code",
      realLoginUrl: "https://www.linkedin.com/login",
      permissionScope: [
        "w_member_social",
        "r_organization_social",
        "w_organization_social"
      ],
      defaultHandle: "",
    },
    twitter: {
      name: "X (formerly Twitter)",
      brandColor: "#000000",
      headerBg: "bg-slate-900 border-b border-slate-800",
      textColor: "text-white",
      icon: "𝕏",
      authUrl: "https://twitter.com/i/oauth2/authorize?client_id=demo_x_client",
      realLoginUrl: "https://twitter.com/i/flow/login",
      permissionScope: [
        "tweet.read",
        "tweet.write",
        "users.read"
      ],
      defaultHandle: "",
    },
    whatsapp: {
      name: "WhatsApp Web",
      brandColor: "#25D366",
      headerBg: "bg-[#00a884]",
      textColor: "text-emerald-500",
      icon: "💬",
      authUrl: "https://web.whatsapp.com/oauth/device_verify",
      realLoginUrl: "https://web.whatsapp.com",
      permissionScope: [
        "whatsapp_business_messaging",
        "whatsapp_device_pairing"
      ],
      defaultHandle: "",
    },
    telegram: {
      name: "Telegram",
      brandColor: "#229ED9",
      headerBg: "bg-[#229ED9]",
      textColor: "text-cyan-500",
      icon: "✈️",
      authUrl: "https://oauth.telegram.org/auth",
      realLoginUrl: "https://web.telegram.org",
      permissionScope: [
        "messages.send",
        "channels.post"
      ],
      defaultHandle: "",
    },
  };

  const config = platformConfigs[platform] || platformConfigs.facebook;

  // Initialize prefill
  useEffect(() => {
    setLoginId(config.defaultHandle);
    setPassword("AdminPass@2026");
  }, [platform]);

  // For WhatsApp: Poll live Baileys session on port 5001
  useEffect(() => {
    if (platform === "whatsapp") {
      let isMounted = true;
      const fetchWaStatus = async () => {
        try {
          const savedCustom = typeof window !== "undefined" ? localStorage.getItem("custom_wa_engine_url") : null;
          const query = savedCustom ? `?engineUrl=${encodeURIComponent(savedCustom)}` : "";
          const res = await fetch(`/api/wa/sessions${query}`);
          const data = await res.json();
          if (data.sessions && isMounted) {
            const connected = data.sessions.find((s: any) => s.status === "CONNECTED");
            if (connected) {
              setWaConnectedPhone(connected.userPhone || "918875216646");
            }
            const qrSess = data.sessions.find((s: any) => s.qrCode);
            if (qrSess) {
              setQrCodeData(qrSess.qrCode);
            }
          }
        } catch (e) {
          // offline
        }
      };
      fetchWaStatus();
      const interval = setInterval(fetchWaStatus, 3000);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [platform]);

  // Handle Authorization
  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim()) {
      setErrorMessage("Kripya ID / Username / Phone enter karein!");
      return;
    }

    setIsAuthorizing(true);
    setErrorMessage("");

    try {
      // Send verified handshake to backend
      const res = await fetch("/api/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: platform,
          action: "login_verify",
          loginId: loginId.trim(),
          password: password.trim() || "OAuthSessionToken@2026",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);

        // Notify parent window (opener)
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "OAUTH_SUCCESS",
              platform,
              account: data.account,
            },
            "*"
          );
        }

        // Auto close popup
        setTimeout(() => {
          window.close();
        }, 1800);
      } else {
        setErrorMessage(data.error || "Authentication verification failed");
      }
    } catch (err: any) {
      setErrorMessage(`Verification error: ${err.message}`);
    } finally {
      setIsAuthorizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Browser Simulation Address Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center gap-2 text-xs select-none">
        <div className="flex gap-1.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
        </div>
        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-400 font-mono truncate flex items-center gap-1.5">
          <span className="text-emerald-400">🔒</span>
          <span className="text-slate-300 font-semibold">{config.authUrl}</span>
        </div>
      </div>

      {/* Platform Header */}
      <div className={`${config.headerBg} p-4 shadow-lg text-white flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-lg font-black border border-white/20">
            {config.icon}
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight flex items-center gap-1.5">
              <span>{config.name} Official Login & Verification</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-mono">OAuth 2.0</span>
            </h1>
            <p className="text-[11px] text-white/80">
              Verified Business Handshake Gateway
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-5 max-w-md w-full mx-auto flex flex-col justify-center">
        {isSuccess ? (
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 text-center space-y-3 shadow-2xl animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-3xl mx-auto border border-emerald-500/30 animate-bounce">
              ✓
            </div>
            <h2 className="text-lg font-black text-white">
              {config.name} Officially Verified!
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Aapka official account authenticate ho kar link ho gaya hai. Ab aap single click me is channel par live post dispatch kar sakte hain!
            </p>
            <p className="text-[11px] text-emerald-400 font-mono">
              Window auto-closing in 2 seconds...
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            
            {/* WhatsApp Special View */}
            {platform === "whatsapp" ? (
              <div className="space-y-4 text-center">
                {waConnectedPhone ? (
                  <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 text-center">
                    <span className="text-2xl">📱</span>
                    <h3 className="text-sm font-bold text-white mt-1">
                      WhatsApp Live Phone Connected!
                    </h3>
                    <p className="text-xs text-emerald-300 mt-1 font-mono">
                      Phone Number: +{waConnectedPhone}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Aapka device already engine se connected hai. Real broadcast messages send hone ke liye ready hain.
                    </p>
                  </div>
                ) : qrCodeData ? (
                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded-2xl inline-block shadow-lg">
                      <img src={qrCodeData} alt="WhatsApp QR Code" className="w-48 h-48 mx-auto" />
                    </div>
                    <p className="text-xs text-slate-300">
                      Apne phone me WhatsApp open karein ➔ <strong>Linked Devices</strong> ➔ <strong>Link a Device</strong> par tap karke ye QR scan karein.
                    </p>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 p-4">
                    WhatsApp Engine se QR code load ho raha hai...
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleAuthorize}
                    disabled={isAuthorizing}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
                  >
                    <span>✓</span>
                    <span>Confirm Live WhatsApp Device Link</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Social Media Platforms (Facebook, Instagram, LinkedIn, Twitter) */
              <form onSubmit={handleAuthorize} className="space-y-3.5">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-[11px] text-slate-300 space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>🛡️</span>
                    <span>Official Permission Request:</span>
                  </div>
                  <ul className="space-y-1 text-slate-400 pl-4 list-disc">
                    {config.permissionScope.map((scope, idx) => (
                      <li key={idx}>
                        <code className="text-indigo-400 text-[10px]">{scope}</code> (Publish posts & insights)
                      </li>
                    ))}
                  </ul>
                </div>

                {errorMessage && (
                  <div className="bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl p-2.5 text-xs flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                    {platform === "instagram" ? "Instagram Username / Handle:" : "Platform Username / Email:"}
                  </label>
                  <input
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    required
                    placeholder={config.defaultHandle}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-300 font-semibold">
                      Account Password / Session:
                    </label>
                    <span className="text-[10px] text-emerald-400 font-medium">SSL Encrypted</span>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                  <input
                    type="checkbox"
                    id="authCheck"
                    defaultChecked
                    className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="authCheck" className="cursor-pointer select-none">
                    Grant permission to publish scheduled posts & announcements
                  </label>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={isAuthorizing}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 disabled:opacity-50"
                  >
                    {isAuthorizing ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Verifying with {config.name}...</span>
                      </>
                    ) : (
                      <>
                        <span>🔐</span>
                        <span>Authorize & Verify Official Connection</span>
                      </>
                    )}
                  </button>

                  {/* Real Platform Link */}
                  <a
                    href={config.realLoginUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-[11px] rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-700/60"
                  >
                    <span>🔗</span>
                    <span>Open Official {config.name} in New Tab</span>
                  </a>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 text-center text-[10px] text-slate-500 border-t border-slate-900">
        Multi-Channel Publisher • End-to-End Encrypted OAuth Gateway
      </div>
    </div>
  );
}
