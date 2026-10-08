"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import OmniChannelSocialPublisher from "@/components/OmniChannelSocialPublisher";
import SocialAnalyticsDashboard from "@/components/SocialAnalyticsDashboard";
import AIPostCreator from "@/components/AIPostCreator";

interface UserProfile {
  id: string;
  name: string;
  username: string;
  role: "admin" | "user";
  credits: number;
  sentCount: number;
}

interface SIMSession {
  id: string;
  label: string;
  owner?: string;
  status: "CONNECTED" | "SCAN_QR" | "ENTER_CODE" | "INITIALIZING" | "RECONNECTING" | "DISCONNECTED";
  userPhone: string | null;
  qrCode: string | null;
  pairingCode: string | null;
  sentCount: number;
}

interface Recipient {
  id: number;
  name: string;
  phone: string;
  customData?: Record<string, any>;
  status: "Pending" | "Sending" | "Sent" | "Failed";
  fromSIM?: string;
  fromPhone?: string;
  messageId?: string;
  error?: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  message: string;
  columns?: string[];
  createdBy?: string;
  createdAt?: string;
}

interface AttachmentFile {
  name: string;
  size: number;
  type: "image" | "video" | "pdf";
  dataUrl?: string;
}

interface MetaConfig {
  hasToken: boolean;
  maskedToken: string;
  phoneNumberId: string;
  wabaId: string;
  freeTierTotal: number;
  freeTierUsed: number;
  currentTierLimit: number;
  ratePerMessageINR: number;
}

// =========================================================================
// BRAND LOGO: ANANT REACH (Infinity + Multi-Channel Broadcast Pulse)
// =========================================================================
function AnantReachLogo({
  size = "md",
  showSubtitle = true,
}: {
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
}) {
  const isLg = size === "lg";
  const isSm = size === "sm";

  if (isLg) {
    return (
      <div className="flex flex-col items-center text-center gap-3 group">
        <div className="relative">
          {/* Ambient Golden Amber Glow */}
          <div className="absolute -inset-3 bg-gradient-to-r from-amber-500/35 via-orange-500/25 to-amber-500/35 rounded-full blur-2xl opacity-85 group-hover:opacity-100 transition duration-700 pointer-events-none"></div>

          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white border-4 border-amber-400 p-2 shadow-2xl flex items-center justify-center overflow-hidden group-hover:scale-105 transition duration-300">
            <img
              src="/thumbnail2.svg"
              alt="Anant Reach Social Media"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black tracking-tight">
            <span className="text-white">Anant</span>{" "}
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">
              Reach
            </span>
          </div>
          <div className="text-xs text-amber-300 font-bold uppercase tracking-wider mt-1">
            Social Media Platform
          </div>
        </div>
      </div>
    );
  }

  if (isSm) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-white border border-amber-400 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
          <img
            src="/thumbnail2.svg"
            alt="Anant Reach"
            className="w-full h-full object-contain p-0.5"
          />
        </div>
        <div className="text-sm font-black text-white flex items-center">
          <span>Anant</span>
          <span className="ml-1 text-amber-400">Reach</span>
        </div>
      </div>
    );
  }

  // size === "md" (Used in top-left sidebar and header - Small Circle Box)
  return (
    <div className="flex items-center gap-3 group">
      {/* Small circle box with newly uploaded SVG logo */}
      <div className="w-11 h-11 rounded-full bg-white border-2 border-amber-400 shadow-lg shadow-black/20 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 group-hover:border-amber-300 transition duration-300">
        <img
          src="/thumbnail2.svg"
          alt="Anant Reach Logo"
          className="w-full h-full object-contain p-1"
        />
      </div>

      <div className="min-w-0">
        <div className="leading-none flex items-center text-lg font-black tracking-tight">
          <span className="text-white">Anant</span>
          <span className="ml-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">
            Reach
          </span>
        </div>
        {showSubtitle && (
          <div className="text-[10px] tracking-wider text-amber-300 font-extrabold uppercase mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Social Media Platform</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MultiTenantWhatsAppSystem() {
  // Authentication State
  // Session Hydration Check (Prevents Login Page Blinking on Refresh)
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loginUsername, setLoginUsername] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Active View Tab: 'dashboard' vs 'social' vs 'reel' (Reel Studio) vs 'ai_creator' vs 'sender' vs 'admin'
  const [activeTab, setActiveTab] = useState<"dashboard" | "social" | "reel" | "ai_creator" | "sender" | "admin">("dashboard");
  const [prefillPostData, setPrefillPostData] = useState<any>(null);

  // ENGINE MODE: 'meta' (Official Meta Cloud API) vs 'sim' (Self-Hosted Private SIM Pool)
  const [engineMode, setEngineMode] = useState<"meta" | "sim">("meta");

  // Meta Cloud API Credentials & Policy State
  const [metaConfig, setMetaConfig] = useState<MetaConfig>({
    hasToken: false,
    maskedToken: "",
    phoneNumberId: "",
    wabaId: "",
    freeTierTotal: 1000,
    freeTierUsed: 0,
    currentTierLimit: 250,
    ratePerMessageINR: 0.85,
  });
  const [inputMetaToken, setInputMetaToken] = useState<string>("");
  const [inputMetaPhoneId, setInputMetaPhoneId] = useState<string>("");
  const [inputMetaWabaId, setInputMetaWabaId] = useState<string>("");
  const [inputMetaTierLimit, setInputMetaTierLimit] = useState<number>(250);
  const [showMetaConfigModal, setShowMetaConfigModal] = useState<boolean>(false);
  const [showBuyMetaModal, setShowBuyMetaModal] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Admin User Management State
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [newUserName, setNewUserName] = useState<string>("");
  const [newUserUsername, setNewUserUsername] = useState<string>("");
  const [newUserPassword, setNewUserPassword] = useState<string>("");
  const [newUserCredits, setNewUserCredits] = useState<number>(50000);
  const [isCreatingUser, setIsCreatingUser] = useState<boolean>(false);

  // Admin Credit Recharge Modal
  const [rechargeTargetUser, setRechargeTargetUser] = useState<UserProfile | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState<number>(50000);

  // SIM Sessions from private WhatsApp server
  const [sessions, setSessions] = useState<SIMSession[]>([]);
  const [isServerOnline, setIsServerOnline] = useState<boolean>(true);
  const [engineUrl, setEngineUrl] = useState<string>("http://localhost:5001");

  // Link SIM Modal
  const [showAddSimModal, setShowAddSimModal] = useState<boolean>(false);
  const [linkMethod, setLinkMethod] = useState<"pairing" | "qr">("pairing");
  const [newSimLabel, setNewSimLabel] = useState<string>("");
  const [newSimPhone, setNewSimPhone] = useState<string>("");
  const [activeQR, setActiveQR] = useState<string | null>(null);
  const [activePairingCode, setActivePairingCode] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState<boolean>(false);

  // Campaign Contacts State
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [directPasteInput, setDirectPasteInput] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [numbersFeedback, setNumbersFeedback] = useState<string>("");

  // Message & Attachment
  const [messageText, setMessageText] = useState<string>(
    "Hello {Name}, aapke order/service ki update yahan hai. Kripya check karein!"
  );
  const [attachment, setAttachment] = useState<AttachmentFile | null>(null);
  const [uploadError, setUploadError] = useState<string>("");

  // Message Templates State
  const [savedTemplates, setSavedTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState<boolean>(false);
  const [newTemplateName, setNewTemplateName] = useState<string>("");
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);

  // Dispatch progress
  const [isSending, setIsSending] = useState<boolean>(false);
  const [serverLogs, setServerLogs] = useState<string[]>([]);

  // Sending SIM Selection: 'random' (Round-Robin) or specific SIM id
  const [selectedDispatchSim, setSelectedDispatchSim] = useState<string>("random");

  // Mobile PWA App Installation States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallGuideModal, setShowInstallGuideModal] = useState<boolean>(false);
  const [isMobileUser, setIsMobileUser] = useState<boolean>(false);
  const [showPwaPopup, setShowPwaPopup] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || "";
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      setIsMobileUser(isMobile);

      const handleBeforeInstall = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstall);
      return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    }
  }, []);

  // Show PWA popup for exactly 5 seconds once per browser session ONLY when logged in
  useEffect(() => {
    if (currentUser && typeof window !== "undefined") {
      const alreadyShown = sessionStorage.getItem("anant_pwa_popup_shown");
      if (!alreadyShown) {
        sessionStorage.setItem("anant_pwa_popup_shown", "true");
        setShowPwaPopup(true);

        const timer = setTimeout(() => {
          setShowPwaPopup(false);
        }, 5000);

        return () => clearTimeout(timer);
      }
    }
  }, [currentUser]);

  const handleInstallApp = async () => {
    setShowPwaPopup(false);
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === "accepted") {
          setDeferredPrompt(null);
        }
      } catch (e) {
        setShowInstallGuideModal(true);
      }
    } else {
      setShowInstallGuideModal(true);
    }
  };

  // Check saved session in localStorage (Zero Blink Session Restore)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("whatsapp_saas_user");
      if (saved) {
        const u = JSON.parse(saved);
        setCurrentUser(u);
        setActiveTab("dashboard");
      }
    } catch (e) {
      console.warn("Session restore notice", e);
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  // Fetch Meta Config for Current User
  const fetchMetaConfig = async () => {
    try {
      const uId = currentUser?.id || "admin_1";
      const res = await fetch(`/api/meta/config?userId=${encodeURIComponent(uId)}`);
      const data = await res.json();
      if (data.success && data.config) {
        setMetaConfig(data.config);
        setInputMetaPhoneId(data.config.phoneNumberId || "");
        setInputMetaWabaId(data.config.wabaId || "");
        setInputMetaTierLimit(data.config.currentTierLimit || 250);
      }
    } catch (err) {
      console.error("Error fetching Meta config", err);
    }
  };

  useEffect(() => {
    fetchMetaConfig();
  }, [currentUser]);

  // Fetch all users for Admin
  const fetchAllUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success) {
        setAllUsers(data.users || []);
      }
    } catch (err) {
      console.error("Error fetching users", err);
    }
  };

  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchAllUsers();
    }
  }, [currentUser]);

  // Initialize engineUrl from localStorage or auto-detect
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("custom_wa_engine_url");
      if (saved) {
        setEngineUrl(saved);
      } else {
        const hostname = window.location.hostname;
        if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1" && !hostname.includes("vercel.app")) {
          const autoUrl = `http://${hostname}:5001`;
          setEngineUrl(autoUrl);
        } else {
          const fallback = process.env.NEXT_PUBLIC_ENGINE_URL || "http://localhost:5001";
          setEngineUrl(fallback);
        }
      }
    }
  }, []);

  const getEngineApiUrl = (endpoint: string) => {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
    const cleanEngine = engineUrl.trim();
    if (cleanEngine && cleanEngine !== "http://localhost:5001") {
      return `/api/wa/${cleanEndpoint}?engineUrl=${encodeURIComponent(cleanEngine)}`;
    }
    return `/api/wa/${cleanEndpoint}`;
  };

  // Fetch active sessions from Baileys engine
  const fetchSessions = async () => {
    try {
      const res = await fetch(getEngineApiUrl("sessions"));
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        setIsServerOnline(true);

        if (activeSessionId) {
          const current = (data.sessions || []).find((s: SIMSession) => s.id === activeSessionId);
          if (current) {
            if (current.status === "CONNECTED") {
              setActiveQR(null);
              setActivePairingCode(null);
              setShowAddSimModal(false);
              setActiveSessionId(null);
              alert(`🎉 SIM Successfully Linked! Phone: +${current.userPhone}`);
            } else if (current.pairingCode) {
              setActivePairingCode(current.pairingCode);
            } else if (current.qrCode) {
              setActiveQR(current.qrCode);
            }
          }
        }
      } else {
        setIsServerOnline(false);
      }
    } catch (err) {
      setIsServerOnline(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 2500);
    return () => clearInterval(interval);
  }, [activeSessionId, engineUrl]);

  const [isVerifyingMetaConfig, setIsVerifyingMetaConfig] = useState(false);

  // --- SAVE & VERIFY META CREDENTIALS WITH META GRAPH API ---
  const handleSaveMetaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingMetaConfig(true);
    try {
      const uId = currentUser?.id || "admin_1";
      const res = await fetch("/api/meta/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: uId,
          accessToken: inputMetaToken.trim() || undefined,
          phoneNumberId: inputMetaPhoneId.trim(),
          wabaId: inputMetaWabaId.trim(),
          currentTierLimit: inputMetaTierLimit,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "✅ Meta Cloud API Credentials Verified & Saved to Supabase!");
        setShowMetaConfigModal(false);
        setInputMetaToken("");
        fetchMetaConfig();
      } else {
        alert(data.error || "Failed to save Meta config");
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsVerifyingMetaConfig(false);
    }
  };

  // --- BUY META MESSAGE PACKS (AS PER META POLICY) ---
  const handleBuyMetaPack = (credits: number, costINR: number) => {
    if (!currentUser) return;
    if (confirm(`Confirm Purchase: ${credits.toLocaleString()} Meta WhatsApp Messages for ₹${costINR}?`)) {
      // Add credits to current user
      const updatedCredits = currentUser.credits + credits;
      const updatedUser = { ...currentUser, credits: updatedCredits };
      setCurrentUser(updatedUser);
      localStorage.setItem("whatsapp_saas_user", JSON.stringify(updatedUser));

      // Persist in DB
      fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentUser.id, creditsToAdd: credits }),
      });

      setShowBuyMetaModal(false);
      alert(`🎉 Payment Successful! ${credits.toLocaleString()} Meta WhatsApp Message credits added to your wallet!`);
    }
  };

  // --- AUTH HANDLERS ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Login failed");
      }

      setCurrentUser(data.user);
      localStorage.setItem("whatsapp_saas_user", JSON.stringify(data.user));
      setActiveTab("sender");
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("whatsapp_saas_user");
    setLoginError("");
  };

  // --- ADMIN: CREATE NEW USER ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserUsername.trim() || !newUserPassword.trim()) {
      alert("Please fill in all user details.");
      return;
    }

    setIsCreatingUser(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName.trim(),
          username: newUserUsername.trim(),
          password: newUserPassword.trim(),
          credits: newUserCredits,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "User create karne me dikkat aayi");
      }

      alert(`✅ User created successfully! Assigned: ${newUserCredits.toLocaleString()} Credits.`);
      setNewUserName("");
      setNewUserUsername("");
      setNewUserPassword("");
      setNewUserCredits(50000);
      fetchAllUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  // --- ADMIN: RECHARGE CREDITS ---
  const handleRechargeUserCredits = async () => {
    if (!rechargeTargetUser) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rechargeTargetUser.id,
          creditsToAdd: rechargeAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Recharge failed");
      }

      alert(`✅ ${rechargeAmount.toLocaleString()} credits added to ${rechargeTargetUser.name}!`);
      setRechargeTargetUser(null);
      fetchAllUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- ADMIN: DELETE USER ---
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (confirm(`Kya aap sach me user '${userName}' ko delete karna chahte hain?`)) {
      try {
        const res = await fetch(`/api/admin/users?id=${userId}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          fetchAllUsers();
        } else {
          alert(data.error);
        }
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // --- SIM LINKING HANDLERS ---
  const handleStartPairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSimPhone.trim()) {
      alert("Mobile number enter karein");
      return;
    }

    setIsGeneratingLink(true);
    const label = newSimLabel.trim() || `SIM (${newSimPhone.slice(-4)})`;
    const sessionId = `sim_${Date.now()}`;

    try {
      const res = await fetch(getEngineApiUrl("sessions/create-pairing"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          label,
          phoneNumber: newSimPhone.trim(),
          owner: currentUser?.username || "admin",
        }),
      });

      const data = await res.json();
      if (data.success && data.pairingCode) {
        setActiveSessionId(sessionId);
        setActivePairingCode(data.pairingCode);
      } else {
        alert(data.error || "Pairing code generate nahi ho saka.");
      }
    } catch (err: any) {
      alert(`Server error: ${err.message}`);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleStartLinkingQR = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingLink(true);
    const label = newSimLabel.trim() || `SIM ${sessions.length + 1}`;
    const sessionId = `sim_${Date.now()}`;

    try {
      const res = await fetch(getEngineApiUrl("sessions/create"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          label,
          owner: currentUser?.username || "admin",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActiveSessionId(sessionId);
        if (data.session.qrCode) {
          setActiveQR(data.session.qrCode);
        }
      }
    } catch (err: any) {
      alert(`Server error: ${err.message}`);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (confirm("Disconnect this SIM?")) {
      try {
        await fetch(getEngineApiUrl(`sessions/${id}`), { method: "DELETE" });
        fetchSessions();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- SMART MOBILE NUMBER PARSER & VALIDATOR (10-Digit Enforcement, Auto-Shift, De-duplicate, Purge <10) ---
  const parseAndCleanMobileNumbers = (raw: string) => {
    const tokens = raw.split(/[\r\n,;\t ]+/);
    const seen = new Set<string>();
    let duplicateCount = 0;
    let invalidCount = 0;

    tokens.forEach((token) => {
      const digits = token.replace(/\D/g, "");
      if (!digits) return;

      const chunks =
        digits.length > 12 && !digits.startsWith("91")
          ? (digits.match(/.{1,10}/g) || [])
          : [digits];

      chunks.forEach((chunk) => {
        let clean = chunk;
        if (clean.startsWith("91") && clean.length === 12) {
          clean = clean.slice(2);
        } else if (clean.startsWith("0") && clean.length === 11) {
          clean = clean.slice(1);
        }

        if (clean.length === 10) {
          if (seen.has(clean)) {
            duplicateCount++;
          } else {
            seen.add(clean);
          }
        } else {
          invalidCount++;
        }
      });
    });

    const uniqueNumbers = Array.from(seen);
    return {
      cleanedText: uniqueNumbers.join("\n"),
      uniqueNumbers,
      duplicateCount,
      invalidCount,
    };
  };

  const syncRecipients = (phoneNumbers: string[]) => {
    const list: Recipient[] = phoneNumbers.map((phone, idx) => ({
      id: Date.now() + idx + Math.random(),
      name: `Customer ${idx + 1}`,
      phone: phone,
      status: "Pending",
    }));
    setRecipients(list);
  };

  const handleNumberInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const sanitized = val.replace(/[^0-9\n]/g, "");

    const lines = sanitized.split("\n");
    const processedLines: string[] = [];
    const seen = new Set<string>();
    let duplicateFound = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].replace(/\D/g, "");

      if (line.length >= 10) {
        if (line.startsWith("91") && line.length === 12) line = line.slice(2);
        if (line.startsWith("0") && line.length === 11) line = line.slice(1);

        if (line.length > 10) {
          const chunks = line.match(/.{1,10}/g) || [];
          chunks.forEach((c, cIdx) => {
            if (c.length === 10) {
              if (!seen.has(c)) {
                seen.add(c);
                processedLines.push(c);
              } else {
                duplicateFound = true;
              }
            } else if (i === lines.length - 1 && cIdx === chunks.length - 1) {
              processedLines.push(c);
            }
          });
          continue;
        }

        if (seen.has(line)) {
          duplicateFound = true;
          continue;
        }

        seen.add(line);
        processedLines.push(line);

        if (i === lines.length - 1) {
          processedLines.push("");
        }
      } else {
        if (i === lines.length - 1) {
          processedLines.push(line);
        }
      }
    }

    const newText = processedLines.join("\n");
    setDirectPasteInput(newText);

    const validList = Array.from(seen);
    syncRecipients(validList);

    if (duplicateFound) {
      setNumbersFeedback("⚡ Duplicate number auto-removed");
    } else if (validList.length > 0) {
      setNumbersFeedback(`✅ ${validList.length} Mobile Number(s) Active`);
    } else {
      setNumbersFeedback("");
    }
  };

  const handleNumberPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const combined = (directPasteInput ? directPasteInput + "\n" : "") + pastedText;
    const { cleanedText, uniqueNumbers, duplicateCount, invalidCount } = parseAndCleanMobileNumbers(combined);

    setDirectPasteInput(cleanedText ? cleanedText + "\n" : "");
    syncRecipients(uniqueNumbers);

    let msg = `✨ Pasted: ${uniqueNumbers.length} Valid 10-Digit Number(s)`;
    if (duplicateCount > 0) msg += ` | 🗑️ ${duplicateCount} Duplicate Auto-Removed`;
    if (invalidCount > 0) msg += ` | ❌ ${invalidCount} Incomplete (<10 digits) Auto-Deleted`;
    setNumbersFeedback(msg);
  };

  const handleNumberInputBlur = () => {
    if (!directPasteInput.trim()) {
      setDirectPasteInput("");
      setRecipients([]);
      setNumbersFeedback("");
      return;
    }

    const { cleanedText, uniqueNumbers, duplicateCount, invalidCount } = parseAndCleanMobileNumbers(directPasteInput);
    setDirectPasteInput(cleanedText);
    syncRecipients(uniqueNumbers);

    let msg = `✨ Cleaned: ${uniqueNumbers.length} Valid 10-Digit Number(s)`;
    if (duplicateCount > 0) msg += ` | 🗑️ ${duplicateCount} Duplicate Removed`;
    if (invalidCount > 0) msg += ` | ❌ ${invalidCount} Incomplete (<10 digits) Deleted`;
    setNumbersFeedback(msg);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        if (!data || data.length === 0) {
          alert("Excel file empty hai!");
          return;
        }

        // Auto detect dynamic column headers freshly from this uploaded Excel file only
        const detectedColsSet = new Set<string>();
        data.forEach((row: any) => {
          Object.keys(row).forEach((k) => {
            const trimmed = k.trim();
            const lower = trimmed.toLowerCase();
            const isPhone = [
              "phone",
              "mobile",
              "mob no",
              "mob_no",
              "contact",
              "number",
              "phone number",
              "mobile number",
              "ph",
              "cell",
            ].includes(lower);
            if (trimmed && !isPhone) {
              detectedColsSet.add(trimmed);
            }
          });
        });
        setDetectedVariables(Array.from(detectedColsSet));

        const mapped: Recipient[] = [];
        const seenPhones = new Set<string>();
        let duplicateCount = 0;
        let invalidCount = 0;

        data.forEach((row: any, index: number) => {
          let phone =
            row["Mob No"] ||
            row["mob no"] ||
            row["MOB NO"] ||
            row.Phone ||
            row.phone ||
            row.Mobile ||
            row.mobile ||
            row["Phone Number"] ||
            row["Mobile Number"] ||
            row["Contact"] ||
            row["Number"] ||
            "";

          let digits = String(phone).replace(/\D/g, "");
          if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
          if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);

          if (digits.length === 10) {
            if (seenPhones.has(digits)) {
              duplicateCount++;
            } else {
              seenPhones.add(digits);
              const name =
                row.name ||
                row.Name ||
                row["Customer Name"] ||
                row["Customer"] ||
                `Customer ${index + 1}`;

              mapped.push({
                id: Date.now() + index + Math.random(),
                name: String(name),
                phone: digits,
                customData: row,
                status: "Pending",
              });
            }
          } else if (digits) {
            invalidCount++;
          }
        });

        setRecipients(mapped);
        setDirectPasteInput(mapped.map((r) => r.phone).join("\n"));

        let msg = `📊 Excel Loaded: ${mapped.length} Valid 10-Digit Contacts`;
        if (duplicateCount > 0) msg += ` | 🗑️ ${duplicateCount} Duplicates Auto-Removed`;
        if (invalidCount > 0) msg += ` | ❌ ${invalidCount} Incomplete (<10 digits) Auto-Deleted`;
        setNumbersFeedback(msg);
      } catch (err) {
        alert("File parse nahi ho saki. Valid .xlsx ya .csv file upload karein.");
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        "Mob No": "8875216646",
        "name": "Rahul Sharma",
        "Os pending": "₹12,500",
        "due date": "15-Oct-2026",
        "aging": "45 Days",
      },
      {
        "Mob No": "9057588165",
        "name": "Pooja Verma",
        "Os pending": "₹5,200",
        "due date": "20-Oct-2026",
        "aging": "15 Days",
      },
      {
        "Mob No": "9876543210",
        "name": "Amit Kumar",
        "Os pending": "₹8,900",
        "due date": "25-Oct-2026",
        "aging": "30 Days",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "bulk_contacts_sample.xlsx");
  };

  const handleSelectAttachment = (type: "image" | "video" | "pdf", file: File | undefined) => {
    setUploadError("");
    if (!file) return;

    if (type === "image" && file.size > 2 * 1024 * 1024) {
      setUploadError(`❌ Image limit 2 MB hai! Selected: ${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      return;
    }
    if (type === "video" && file.size > 10 * 1024 * 1024) {
      setUploadError(`❌ Video limit 10 MB hai! Selected: ${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      return;
    }
    if (type === "pdf" && file.size > 3 * 1024 * 1024) {
      setUploadError(`❌ PDF limit 3 MB hai! Selected: ${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: file.name,
        size: file.size,
        type: type,
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  // --- TEMPLATES HANDLERS ---
  const fetchTemplates = async () => {
    try {
      const userParam = currentUser?.username || "admin";
      const res = await fetch(`/api/templates?user=${encodeURIComponent(userParam)}`);
      const data = await res.json();
      if (data.success && data.templates) {
        setSavedTemplates(data.templates);
        if (!selectedTemplateId && data.templates.length > 0) {
          setSelectedTemplateId(data.templates[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching templates", err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTemplates();
    }
  }, [currentUser]);

  const handleSelectTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const found = savedTemplates.find((t) => t.id === tplId);
    if (found) {
      setMessageText(found.message);
    }
  };

  const handleSaveCurrentTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) {
      alert("Template name enter karein");
      return;
    }

    setIsSavingTemplate(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          message: messageText,
          columns: detectedVariables,
          createdBy: currentUser?.username || "admin",
        }),
      });

      const data = await res.json();
      if (data.success && data.template) {
        setSavedTemplates((prev) => [data.template, ...prev]);
        setSelectedTemplateId(data.template.id);
        setShowSaveTemplateModal(false);
        setNewTemplateName("");
        alert(`✅ Template "${data.template.name}" successfully save ho gaya!`);
      } else {
        alert(data.error || "Template save nahi ho saka");
      }
    } catch (err: any) {
      alert(`Error saving template: ${err.message}`);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (tplId: string, tplName: string) => {
    if (confirm(`Kya aap template "${tplName}" ko delete karna chahte hain?`)) {
      try {
        const res = await fetch(`/api/templates?id=${tplId}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          setSavedTemplates((prev) => prev.filter((t) => t.id !== tplId));
          if (selectedTemplateId === tplId) setSelectedTemplateId("");
        } else {
          alert(data.error);
        }
      } catch (err: any) {
        alert(`Error deleting template: ${err.message}`);
      }
    }
  };

  const handleInsertVariable = (varName: string) => {
    const placeholder = `{${varName}}`;
    setMessageText((prev) => (prev ? prev + " " + placeholder : placeholder));
  };

  // --- DISPATCH CAMPAIGN (DUAL MODE: META CLOUD API OR PRIVATE SIMs) ---
  // User-Specific SIM Isolation: Admin sees all, Client only sees SIMs they linked
  const userVisibleSessions =
    currentUser?.role === "admin"
      ? sessions
      : sessions.filter((s) => (s.owner || "admin") === currentUser?.username);

  const connectedSIMs = userVisibleSessions.filter((s) => s.status === "CONNECTED");

  const handleStartDispatch = async () => {
    if (!currentUser) return;
    if (recipients.length === 0) {
      alert("Kripya pehle recipients add karein!");
      return;
    }

    // Credits Check
    if (currentUser.role !== "admin" && recipients.length > currentUser.credits) {
      alert(
        `Insufficient Credits! Aapke paas sirf ${currentUser.credits.toLocaleString()} credits hain, par aap ${recipients.length} messages bhej rahe hain. Kripya 'Buy Messages' par click karke recharge karein.`
      );
      return;
    }

    setIsSending(true);

    // Generate personalized messages for each contact (replaces {name}, {os pending}, {due date}, etc.)
    const personalizedMessages = recipients.map((r) => {
      let text = messageText;
      text = text.replace(/{([^}]+)}/g, (match, key) => {
        const trimmed = key.trim().toLowerCase();
        if (r.customData) {
          for (const col of Object.keys(r.customData)) {
            if (col.trim().toLowerCase() === trimmed) {
              return String(r.customData[col] ?? "");
            }
          }
        }
        if (trimmed === "name") return r.name;
        if (trimmed === "phone" || trimmed === "mobile" || trimmed === "mob no") return r.phone;
        return match;
      });
      return text;
    });

    // ==========================================
    // CASE A: OFFICIAL META CLOUD API DISPATCH
    // ==========================================
    if (engineMode === "meta") {
      setServerLogs([
        `[${new Date().toLocaleTimeString()}] Authenticated with Official Meta Cloud API (Graph v21.0)...`,
        `[${new Date().toLocaleTimeString()}] Checking Meta 24-Hour Tier Limit (${metaConfig.currentTierLimit} msgs/24h)...`,
      ]);

      try {
        const response = await fetch("/api/meta/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser?.id || "admin_1",
            recipients: recipients.map((r) => r.phone),
            message: messageText,
            messages: personalizedMessages,
          }),
        });

        const resData = await response.json();

        if (!response.ok || !resData.success) {
          throw new Error(resData.error || "Meta Cloud API dispatch failed");
        }

        // Update table
        const updated = recipients.map((r, idx) => {
          const itemResult = resData.results?.[idx];
          if (itemResult && itemResult.status === "SUCCESS") {
            return {
              ...r,
              status: "Sent" as const,
              messageId: itemResult.messageId,
              fromSIM: "Meta Cloud API (0% Ban Risk)",
            };
          } else {
            return {
              ...r,
              status: "Failed" as const,
              error: itemResult?.error || "Error",
            };
          }
        });

        setRecipients(updated);
        const successCount = resData.successfulCount || 0;

        // Deduct user credits
        if (currentUser.role !== "admin") {
          const deductRes = await fetch("/api/user/deduct-credits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUser.id, amount: successCount }),
          });
          const deductData = await deductRes.json();
          if (deductData.success) {
            const updatedUser = {
              ...currentUser,
              credits: deductData.remainingCredits,
              sentCount: (currentUser.sentCount || 0) + successCount,
            };
            setCurrentUser(updatedUser);
            localStorage.setItem("whatsapp_saas_user", JSON.stringify(updatedUser));
          }
        }

        fetchMetaConfig();

        setServerLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ✅ ${successCount} Messages delivered via Official Meta Cloud API!`,
          `[${new Date().toLocaleTimeString()}] Meta Free Tier Remaining: ${resData.freeTierRemaining} / 1,000 Free Conversations.`,
        ]);

        alert(`Success! ${successCount} messages Meta Official API se directly deliver ho gaye hain!`);
      } catch (err: any) {
        setServerLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ❌ Meta API Error: ${err.message}`,
        ]);
        alert(`Error: ${err.message}`);
      } finally {
        setIsSending(false);
      }
      return;
    }

    // ==========================================
    // CASE B: PRIVATE SIM SERVER DISPATCH
    // ==========================================
    if (connectedSIMs.length === 0) {
      alert("Aapke account par koi SIM connected nahi hai! Kripya pehle apni SIM link karein.");
      setIsSending(false);
      return;
    }

    setServerLogs([
      `[${new Date().toLocaleTimeString()}] Dispatching ${recipients.length} messages across ${connectedSIMs.length} SIM(s)...`,
    ]);

    try {
      const response = await fetch(getEngineApiUrl("sessions/send-bulk"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: recipients.map((r) => r.phone),
          message: messageText,
          messages: personalizedMessages,
          allowedSimIds: connectedSIMs.map((s) => s.id),
          attachment: attachment ? { name: attachment.name, type: attachment.type, dataUrl: attachment.dataUrl } : null,
          selectedSimId: selectedDispatchSim,
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || "Dispatch failed");
      }

      const updated = recipients.map((r, idx) => {
        const itemResult = resData.results?.[idx];
        if (itemResult && itemResult.status === "SUCCESS") {
          return {
            ...r,
            status: "Sent" as const,
            messageId: itemResult.messageId,
            fromSIM: itemResult.fromSIM,
            fromPhone: itemResult.fromPhone,
          };
        } else {
          return {
            ...r,
            status: "Failed" as const,
            error: itemResult?.error || "Error",
          };
        }
      });

      setRecipients(updated);
      const successCount = resData.successfulCount || 0;

      if (currentUser.role !== "admin") {
        const deductRes = await fetch("/api/user/deduct-credits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id, amount: successCount }),
        });
        const deductData = await deductRes.json();
        if (deductData.success) {
          const updatedUser = {
            ...currentUser,
            credits: deductData.remainingCredits,
            sentCount: (currentUser.sentCount || 0) + successCount,
          };
          setCurrentUser(updatedUser);
          localStorage.setItem("whatsapp_saas_user", JSON.stringify(updatedUser));
        }
      }

      setServerLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✅ ${successCount} Messages delivered across ${connectedSIMs.length} SIMs!`,
      ]);

      alert(`Success! ${successCount} messages aapke WhatsApp server ke zariye successfully deliver ho gaye!`);
      fetchSessions();
    } catch (err: any) {
      setServerLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ❌ Dispatch Error: ${err.message}`,
      ]);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };



  // =========================================================================
  // ZERO-BLINK HYDRATION SCREEN
  // =========================================================================
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#070a13] text-slate-100 font-sans flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="relative rounded-3xl bg-[#090d18] border border-amber-500/40 p-3 shadow-2xl ">
            <img
              src="/anant-reach-logo.png"
              alt="Anant Reach"
              className="w-56 h-auto object-contain animate-pulse drop-shadow-[0_4px_20px_rgba(245,158,11,0.35)]"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>Loading Anant Reach Workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: LOGIN PAGE
  // =========================================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#070a13] text-slate-100 font-sans flex items-center justify-center p-4">
        <div className="bg-[#0a0f1d] border border-amber-500/35 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-amber-950/50">
          <div className="flex flex-col items-center text-center mb-6">
            <AnantReachLogo size="lg" showSubtitle={true} />
            <p className="text-xs text-amber-200/80 font-medium mt-3">
              Social Media Publishing & WhatsApp Automation Hub
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-[#2a0e16] border border-rose-800 rounded-xl text-xs text-rose-300">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Username:</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
                className="w-full bg-[#070a13] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Password:</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full bg-[#070a13] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer shadow-lg shadow-amber-950/60"
            >
              {isLoggingIn ? "Logging in..." : "Login to Anant Reach Portal"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: LOGGED IN APPLICATION
  // =========================================================================
  const freeTierRemaining = Math.max(0, metaConfig.freeTierTotal - (metaConfig.freeTierUsed || 0));

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 font-sans flex flex-col lg:flex-row w-full max-w-full overflow-x-hidden">

      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
        ></div>
      )}

      {/* =========================================================================
          LEFT VERTICAL NAVIGATION BAR (SIDEBAR)
          ========================================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 h-screen w-72 bg-[#090d16]/95 backdrop-blur-xl border-r border-slate-800/80 p-5 flex flex-col justify-between shrink-0 shadow-2xl transition-transform duration-300 ease-in-out lg:sticky lg:top-0 ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="space-y-5">
          {/* Brand Header */}
          <div className="relative pb-4 border-b border-slate-800/80">
            <AnantReachLogo size="md" showSubtitle={true} />
            {/* Close button on mobile */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden absolute top-2 right-2 text-slate-400 hover:text-white p-1 text-sm cursor-pointer bg-slate-800/80 hover:bg-slate-700 rounded-lg transition"
            >
              ✕
            </button>
          </div>

          {/* User Profile Card */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 flex items-center gap-3 shadow-md backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center font-black text-slate-950 text-xs shadow-md shrink-0">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-white truncate flex items-center gap-1.5">
                <span className="truncate">{currentUser.name}</span>
                {currentUser.role === "admin" ? (
                  <span className="text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                    ADMIN
                  </span>
                ) : (
                  <span className="text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                    CLIENT
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-mono truncate">@{currentUser.username}</div>
            </div>
          </div>

          {/* VERTICAL NAVIGATION TABS */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">
              Workspace Menu
            </div>

            {/* Vertical Tab 1: Dashboard (Views & Analytics) */}
            <button
              onClick={() => {
                setActiveTab("dashboard");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-left transition-all duration-200 flex items-center gap-3 cursor-pointer group relative ${
                activeTab === "dashboard"
                  ? "bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 text-white shadow-sm font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent font-medium"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 transition ${
                activeTab === "dashboard" ? "bg-amber-500/20 text-amber-300" : "bg-slate-800/60 text-slate-400 group-hover:bg-slate-800 group-hover:text-white"
              }`}>
                📊
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs leading-tight flex items-center justify-between">
                  <span className="font-bold">Dashboard</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    activeTab === "dashboard" ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-400"
                  }`}>
                    ANALYTICS
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  Views, Reach & Insights
                </div>
              </div>
            </button>

            {/* Vertical Tab 2: Post Studio */}
            <button
              onClick={() => {
                setActiveTab("social");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-left transition-all duration-200 flex items-center gap-3 cursor-pointer group relative ${
                activeTab === "social"
                  ? "bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent border border-indigo-500/30 text-white shadow-sm font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent font-medium"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 transition ${
                activeTab === "social" ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-800/60 text-slate-400 group-hover:bg-slate-800 group-hover:text-white"
              }`}>
                ✍️
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs leading-tight flex items-center justify-between">
                  <span className="font-bold">Post Studio</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    activeTab === "social" ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-800 text-slate-400"
                  }`}>
                    PUBLISH
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  FB, Insta, WA, LinkedIn, X
                </div>
              </div>
            </button>

            {/* Vertical Tab 2.5: Reel Studio (9:16) */}
            <button
              onClick={() => {
                setActiveTab("reel");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-left transition-all duration-200 flex items-center gap-3 cursor-pointer group relative ${
                activeTab === "reel"
                  ? "bg-gradient-to-r from-pink-500/15 via-rose-500/10 to-transparent border border-pink-500/30 text-white shadow-sm font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent font-medium"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 transition ${
                activeTab === "reel" ? "bg-pink-500/20 text-pink-300" : "bg-slate-800/60 text-slate-400 group-hover:bg-slate-800 group-hover:text-white"
              }`}>
                🎬
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs leading-tight flex items-center justify-between">
                  <span className="font-bold">Reel Studio</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    activeTab === "reel" ? "bg-pink-500/20 text-pink-300" : "bg-slate-800 text-slate-400"
                  }`}>
                    9:16 REEL
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  Insta & FB Viral Reels
                </div>
              </div>
            </button>

            {/* Vertical Tab 3: AI Auto Creator */}
            <button
              onClick={() => {
                setActiveTab("ai_creator");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-left transition-all duration-200 flex items-center gap-3 cursor-pointer group relative ${
                activeTab === "ai_creator"
                  ? "bg-gradient-to-r from-purple-500/15 via-pink-500/10 to-transparent border border-purple-500/30 text-white shadow-sm font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent font-medium"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 transition ${
                activeTab === "ai_creator" ? "bg-purple-500/20 text-purple-300" : "bg-slate-800/60 text-slate-400 group-hover:bg-slate-800 group-hover:text-white"
              }`}>
                🤖
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs leading-tight flex items-center justify-between">
                  <span className="font-bold">AI Post Creator</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    activeTab === "ai_creator" ? "bg-purple-500/20 text-purple-300" : "bg-slate-800 text-slate-400"
                  }`}>
                    GEMINI
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  Daily 5 Posts & 5s Reels
                </div>
              </div>
            </button>

            {/* Vertical Tab 4: WhatsApp Campaigns */}
            <button
              onClick={() => {
                setActiveTab("sender");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-left transition-all duration-200 flex items-center gap-3 cursor-pointer group relative ${
                activeTab === "sender"
                  ? "bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/30 text-white shadow-sm font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent font-medium"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 transition ${
                activeTab === "sender" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800/60 text-slate-400 group-hover:bg-slate-800 group-hover:text-white"
              }`}>
                🚀
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs leading-tight flex items-center justify-between">
                  <span className="font-bold">WhatsApp Campaigns</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    activeTab === "sender" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"
                  }`}>
                    BROADCAST
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  Meta API & SIM Farm
                </div>
              </div>
            </button>

            {/* Vertical Tab 5: Admin Users & Credits */}
            {currentUser.role === "admin" && (
              <button
                onClick={() => {
                  setActiveTab("admin");
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full p-2.5 rounded-xl text-left transition-all duration-200 flex items-center gap-3 cursor-pointer group relative ${
                  activeTab === "admin"
                    ? "bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 text-white shadow-sm font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent font-medium"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 transition ${
                  activeTab === "admin" ? "bg-amber-500/20 text-amber-300" : "bg-slate-800/60 text-slate-400 group-hover:bg-slate-800 group-hover:text-white"
                }`}>
                  👑
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs leading-tight flex items-center justify-between">
                    <span className="font-bold">Users & Credits</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      activeTab === "admin" ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-400"
                    }`}>
                      ADMIN
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    Client Wallets & Accounts
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          {/* Quick Engine Status */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 text-xs space-y-2 backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium text-slate-300 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                SIM Farm
              </span>
              <span className="font-mono text-emerald-400 font-bold text-[11px]">{connectedSIMs.length} Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium text-slate-300 text-[11px]">
                <span className={`w-2 h-2 rounded-full ${metaConfig.hasToken ? "bg-cyan-400" : "bg-slate-500"}`}></span>
                Meta Cloud API
              </span>
              <span className={`font-mono font-bold text-[11px] ${metaConfig.hasToken ? "text-cyan-400" : "text-slate-400"}`}>
                {metaConfig.hasToken ? "Ready" : "Not Set"}
              </span>
            </div>
          </div>

          {/* Quick Jump to Buffer View */}
          <a
            href="/buffer"
            className="w-full py-2 px-3 bg-slate-900/40 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <span>📅</span>
              <span>Buffer View / Calendar</span>
            </span>
            <span className="text-[10px] text-slate-400">➔</span>
          </a>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-3 bg-slate-900/60 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-800/80 hover:border-rose-800/50 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🚪</span>
            <span>Logout Account</span>
          </button>
        </div>
      </aside>

      {/* =========================================================================
          RIGHT MAIN CONTENT AREA
          ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full min-h-screen bg-[#070a13] overflow-x-hidden">
        {/* Top Header inside Main Content */}
        <header className="px-3 sm:px-8 py-3 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Mobile Sidebar Hamburger Toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium truncate">
                <span>Anant Reach</span>
                <span>/</span>
                <span className="text-amber-400 font-semibold capitalize truncate">
                  {activeTab === "dashboard"
                    ? "Analytics Dashboard"
                    : activeTab === "social"
                    ? "Post Studio"
                    : activeTab === "reel"
                    ? "Reel Studio"
                    : activeTab === "ai_creator"
                    ? "AI Auto Creator"
                    : activeTab === "sender"
                    ? "WhatsApp Campaigns"
                    : "User Management"}
                </span>
              </div>
              <h1 className="text-sm sm:text-lg font-black text-white flex items-center gap-2 truncate">
                {activeTab === "dashboard" && "📊 Social Media Analytics & Performance"}
                {activeTab === "social" && "✍️ Multi-Channel Post Studio"}
                {activeTab === "reel" && "🎬 9:16 Viral Reel Studio"}
                {activeTab === "ai_creator" && "✨ AI Auto-Pilot Post & Reel Studio"}
                {activeTab === "sender" && "🚀 WhatsApp Bulk Campaign Dispatcher"}
                {activeTab === "admin" && "👑 Admin User & Credit Management"}
              </h1>
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab("social")}
              className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition cursor-pointer active:scale-95"
            >
              <span>✍️</span>
              <span>Create Post</span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <div className="p-3 sm:p-6 lg:p-8 flex-1 w-full max-w-full overflow-x-hidden">

      {/* =========================================================================
          META PRICING & BUY MESSAGES MODAL (AS PER META POLICY)
          ========================================================================= */}
      {showBuyMetaModal && (
        <div className="fixed inset-0 bg-black/90  z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-xl">💳</span>
                  Buy WhatsApp Messages (Meta Policy Pricing)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Official WhatsApp Business Indian Tariff Rates (Meta Cloud API Approved)
                </p>
              </div>
              <button
                onClick={() => setShowBuyMetaModal(false)}
                className="text-slate-400 hover:text-white text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Meta Free Tier Info Banner */}
            <div className="p-3.5 rounded-2xl bg-[#062419] border border-emerald-500/40 mb-5 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <span>🎁</span> Meta Official Free Allowance:
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  Meta gives <strong className="text-white">1,000 Free Service Conversations</strong> every month!
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-900/60 px-2.5 py-1 rounded-lg">
                {freeTierRemaining} Free Left
              </span>
            </div>

            {/* Buy Packages as per Meta Policy */}
            <div className="space-y-3 mb-6">
              {/* Pack 1 */}
              <div
                onClick={() => handleBuyMetaPack(1000, 850)}
                className="p-4 rounded-2xl border border-slate-700 bg-slate-950 hover:border-emerald-500/60 hover:bg-slate-900 transition cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition">
                    Starter Pack • 1,000 Messages
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Official Meta Rate: ₹0.85 per marketing conversation
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-emerald-400 font-mono">₹850</div>
                  <button className="text-[10px] font-bold text-emerald-300 group-hover:underline">
                    Buy Now ➜
                  </button>
                </div>
              </div>

              {/* Pack 2 (Popular) */}
              <div
                onClick={() => handleBuyMetaPack(5000, 4000)}
                className="p-4 rounded-2xl border-2 border-emerald-500/50 bg-[#062419] hover:border-emerald-400 hover:bg-[#062419] transition cursor-pointer flex items-center justify-between relative shadow-lg shadow-emerald-950/50"
              >
                <div className="absolute -top-2.5 right-4 px-2 py-0.5 bg-emerald-500 text-black text-[9px] font-black uppercase rounded-full">
                  Popular
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    Growth Pack • 5,000 Messages
                  </div>
                  <div className="text-xs text-emerald-300 mt-0.5">
                    Discounted Rate: ₹0.80 per conversation (Save ₹250)
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-emerald-300 font-mono">₹4,000</div>
                  <button className="text-[10px] font-bold text-emerald-400">
                    Buy Now ➜
                  </button>
                </div>
              </div>

              {/* Pack 3 */}
              <div
                onClick={() => handleBuyMetaPack(10000, 7500)}
                className="p-4 rounded-2xl border border-slate-700 bg-slate-950 hover:border-cyan-500/60 hover:bg-slate-900 transition cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition">
                    Commercial Bulk • 10,000 Messages
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    High Volume Rate: ₹0.75 per conversation (Save ₹1,000)
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-cyan-400 font-mono">₹7,500</div>
                  <button className="text-[10px] font-bold text-cyan-300 group-hover:underline">
                    Buy Now ➜
                  </button>
                </div>
              </div>
            </div>

            <div className="text-center">
              <span className="text-[11px] text-slate-300">
                100% Compliant with Meta WhatsApp Cloud Platform Terms • 0% Ban Risk
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          META CLOUD API CONFIGURATION MODAL (For Uploading Meta API Key)
          ========================================================================= */}
      {showMetaConfigModal && (
        <div className="fixed inset-0 bg-black/90  z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="text-lg">🌐</span>
                Upload Meta WhatsApp Cloud API Key
              </h3>
              <button
                onClick={() => setShowMetaConfigModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="bg-slate-950 border border-slate-700 rounded-2xl p-3 mb-4 text-xs text-slate-300">
              <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                <span>📋</span> Meta Developer Portal se Key Kaise Lein:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                <li><strong className="text-slate-200">developers.facebook.com</strong> par jayein aur apna WhatsApp App open karein.</li>
                <li>Left menu me <strong className="text-slate-200">WhatsApp ➔ API Setup</strong> par click karein.</li>
                <li>Wahan se <strong className="text-white font-mono">Temporary Access Token</strong> (ya Permanent System User Token) copy karein.</li>
                <li>Niche likha <strong className="text-white font-mono">Phone number ID</strong> copy karke yahan paste karein.</li>
              </ol>
            </div>

            <form onSubmit={handleSaveMetaConfig} className="space-y-3.5">
              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                  Meta Access Token (EAAG...):
                </label>
                <textarea
                  rows={3}
                  placeholder={metaConfig.hasToken ? `Current: ${metaConfig.maskedToken}` : "Paste your Meta Access Token here"}
                  value={inputMetaToken}
                  onChange={(e) => setInputMetaToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                  Phone Number ID (15-Digit):
                </label>
                <input
                  type="text"
                  placeholder="e.g. 109283746501928"
                  value={inputMetaPhoneId}
                  onChange={(e) => setInputMetaPhoneId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                  WhatsApp Business Account (WABA) ID:
                </label>
                <input
                  type="text"
                  placeholder="e.g. 293847162534"
                  value={inputMetaWabaId}
                  onChange={(e) => setInputMetaWabaId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                  Meta 24-Hour Messaging Tier Limit:
                </label>
                <select
                  value={inputMetaTierLimit}
                  onChange={(e) => setInputMetaTierLimit(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value={250}>Tier 1: 250 conversations / 24 hours (Unverified / Starter)</option>
                  <option value={1000}>Tier 2: 1,000 conversations / 24 hours (Standard Verified)</option>
                  <option value={10000}>Tier 3: 10,000 conversations / 24 hours</option>
                  <option value={100000}>Tier 4: 1,00,000 conversations / 24 hours</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMetaConfigModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingMetaConfig}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isVerifyingMetaConfig ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Verifying with Meta API...</span>
                    </>
                  ) : (
                    <span>Verify & Save to Supabase</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credit Recharge Modal (Admin Only) */}
      {rechargeTargetUser && (
        <div className="fixed inset-0 bg-black/90  z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              Recharge Credits for {rechargeTargetUser.name}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Current Balance: <span className="text-emerald-400 font-mono">{rechargeTargetUser.credits.toLocaleString()} Credits</span>
            </p>

            <div className="space-y-2 mb-4">
              <label className="p-3 rounded-xl border border-emerald-500/50 bg-[#062419] flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-sm font-bold text-white">50,000 Credits Pack</div>
                  <div className="text-xs text-emerald-400">₹5,000 Package (10 Paise / msg)</div>
                </div>
                <input
                  type="radio"
                  checked={rechargeAmount === 50000}
                  onChange={() => setRechargeAmount(50000)}
                />
              </label>

              <label className="p-3 rounded-xl border border-slate-700 bg-slate-950 flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-sm font-bold text-white">1,00,000 Credits Pack</div>
                  <div className="text-xs text-cyan-400">₹9,000 Package</div>
                </div>
                <input
                  type="radio"
                  checked={rechargeAmount === 100000}
                  onChange={() => setRechargeAmount(100000)}
                />
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setRechargeTargetUser(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRechargeUserCredits}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                Add {rechargeAmount.toLocaleString()} Credits
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUAL LINK SIM MODAL */}
      {showAddSimModal && (
        <div className="fixed inset-0 bg-black/90  z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white">Link New SIM to Private Server</h3>
              <span className="text-[11px] text-emerald-400 font-mono">100% Free Forever</span>
            </div>

            <div className="flex bg-slate-950 p-1 rounded-xl mb-4 border border-slate-700">
              <button
                onClick={() => {
                  setLinkMethod("pairing");
                  setActiveQR(null);
                  setActivePairingCode(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  linkMethod === "pairing" ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                📲 OTP / 8-Digit Code
              </button>
              <button
                onClick={() => {
                  setLinkMethod("qr");
                  setActiveQR(null);
                  setActivePairingCode(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  linkMethod === "qr" ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                📷 Scan QR Code
              </button>
            </div>

            {linkMethod === "pairing" && (
              <div>
                {activePairingCode ? (
                  <div className="text-center p-4 bg-slate-950 rounded-2xl border border-emerald-500/40">
                    <p className="text-xs text-slate-300 mb-2">
                      WhatsApp ➡️ <strong>Linked Devices</strong> ➡️ <strong>Link with phone number instead</strong> me yeh code daalein:
                    </p>
                    <div className="my-4 py-3 px-4 bg-[#062419] border-2 border-dashed border-emerald-500 rounded-xl inline-block">
                      <span className="text-3xl font-black font-mono tracking-widest text-emerald-300">
                        {activePairingCode}
                      </span>
                    </div>
                    <div className="text-xs text-emerald-400 animate-pulse font-medium">
                      Phone me code enter karne ka wait kar raha hai...
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleStartPairingCode} className="space-y-3">
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                        SIM Mobile Number:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 9057588165"
                        value={newSimPhone}
                        onChange={(e) => setNewSimPhone(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                        Label (Optional):
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Jio SIM 2"
                        value={newSimLabel}
                        onChange={(e) => setNewSimLabel(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isGeneratingLink}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      {isGeneratingLink ? "Generating Code..." : "Get 8-Digit Pairing Code"}
                    </button>
                  </form>
                )}
              </div>
            )}

            {linkMethod === "qr" && (
              <div>
                {activeQR ? (
                  <div className="flex flex-col items-center">
                    <p className="text-xs text-slate-300 mb-3">WhatsApp se QR scan karein:</p>
                    <div className="p-3 bg-white rounded-2xl shadow-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={activeQR} alt="QR Code" className="w-52 h-52" />
                    </div>
                    <div className="mt-3 text-xs text-emerald-400 animate-pulse font-medium">
                      Scan karne ka wait kar raha hai...
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleStartLinkingQR} className="space-y-3">
                    <input
                      type="text"
                      placeholder="SIM Label (e.g. SIM 1)"
                      value={newSimLabel}
                      onChange={(e) => setNewSimLabel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={isGeneratingLink}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      {isGeneratingLink ? "Generating QR..." : "Generate QR Code"}
                    </button>
                  </form>
                )}
              </div>
            )}

            <button
              onClick={() => {
                setShowAddSimModal(false);
                setActiveQR(null);
                setActivePairingCode(null);
                setActiveSessionId(null);
              }}
              className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* SAVE TEMPLATE MODAL */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black/90  z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>💾</span>
                <span>Save Message Template</span>
              </h3>
              <button
                onClick={() => setShowSaveTemplateModal(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Is template ko ek pehchan name dein taki aap ise baad me kabhi bhi 1-click me load karke use kar sakein.
            </p>

            <form onSubmit={handleSaveCurrentTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Template Name (e.g. Outstanding Notice, Payment Reminder)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Outstanding & Aging Notice"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Template Message Preview
                </label>
                <div className="p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-300 font-sans max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {messageText || "(Message box is empty)"}
                </div>
              </div>

              {detectedVariables.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Auto-Included Variables:
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {detectedVariables.map((v) => (
                      <span key={v} className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 text-[10px] font-mono">
                        {`{${v}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSavingTemplate || !messageText.trim()}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-lg"
                >
                  {isSavingTemplate ? "Saving..." : "Save Template"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSaveTemplateModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOBILE APP INSTALL GUIDE MODAL */}
      {showInstallGuideModal && (
        <div className="fixed inset-0 bg-black/90  z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="text-lg">📲</span>
                <span>Install Anant Reach on Mobile</span>
              </h3>
              <button
                onClick={() => setShowInstallGuideModal(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Anant Reach ek Progressive Web App (PWA) hai. Ise bina Play Store ke direct phone ki home screen par app bana kar chala sakte hain:
            </p>

            <div className="space-y-3">
              {/* Android Chrome */}
              <div className="p-3.5 bg-slate-950 border border-slate-700 rounded-2xl">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                  <span>🤖</span> Android (Google Chrome):
                </div>
                <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>Chrome browser ke top-right me <strong>3 dots (⋮)</strong> par tap karein.</li>
                  <li>Menu me <strong>"Install app"</strong> ya <strong>"Add to Home screen"</strong> chunein.</li>
                  <li><strong>Install</strong> par tap karein — App phone screen par aa jayegi!</li>
                </ol>
              </div>

              {/* iPhone iOS Safari */}
              <div className="p-3.5 bg-slate-950 border border-slate-700 rounded-2xl">
                <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 mb-1">
                  <span>🍎</span> iPhone / iPad (Apple Safari):
                </div>
                <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>Safari browser ke bottom me <strong>Share button (📤)</strong> par tap karein.</li>
                  <li>Niche scroll karke <strong>"Add to Home Screen" (➕)</strong> chunein.</li>
                  <li>Top-right me <strong>"Add"</strong> dabayein — Native App ki tarah save ho jayegi!</li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => setShowInstallGuideModal(false)}
              className="mt-5 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-lg"
            >
              Samajh Gaya (Done)
            </button>
          </div>
        </div>
      )}

      {/* 5-SECOND FLOATING PWA INSTALL POPUP (Only once upon browser login) */}
      {showPwaPopup && currentUser && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-[calc(100%-3rem)] sm:w-96 bg-slate-900 border border-emerald-500/50 rounded-2xl p-4 shadow-2xl  animate-fadeIn flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl shrink-0">
              📱
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Anant Reach Mobile App</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                  PWA
                </span>
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                Apne phone par app ki tarah chalaane ke liye install karein!
              </div>
            </div>
            <button
              onClick={() => setShowPwaPopup(false)}
              className="text-slate-400 hover:text-white p-1 text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                handleInstallApp();
                setShowPwaPopup(false);
              }}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md text-center"
            >
              📲 Install App
            </button>
            <button
              onClick={() => setShowPwaPopup(false)}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Later
            </button>
          </div>

          {/* 5-Second Animated Bar */}
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div className="bg-emerald-400 h-full animate-[pulse_1s_infinite]"></div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-VIEW A: ADMIN USER MANAGEMENT (Only for Admin)
          ========================================================================= */}
      {currentUser.role === "admin" && activeTab === "admin" && (
        <main className="max-w-7xl mx-auto mt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
              <div className="text-xs text-slate-400">Total Registered Clients</div>
              <div className="text-2xl font-black text-white mt-1">
                {allUsers.filter((u) => u.role === "user").length}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
              <div className="text-xs text-slate-400">Active User Credits</div>
              <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                {allUsers
                  .filter((u) => u.role === "user")
                  .reduce((acc, u) => acc + (u.credits || 0), 0)
                  .toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
              <div className="text-xs text-slate-400">Meta Free Allowance</div>
              <div className="text-2xl font-black text-cyan-400 mt-1 font-mono">
                {freeTierRemaining} Free
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
              <div className="text-xs text-slate-400">Meta 24h Tier Limit</div>
              <div className="text-lg font-bold text-amber-400 mt-1 font-mono">
                {metaConfig.currentTierLimit} msgs/24h
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form: Create User */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl">
              <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Create New Client Account
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Naye client ko login credentials aur message credits assign karein.
              </p>

              <form onSubmit={handleCreateUser} className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                    Client / Business Name:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Trading Co."
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                    Login Username:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ramesh"
                    value={newUserUsername}
                    onChange={(e) => setNewUserUsername(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-cyan-400 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                    Login Password:
                  </label>
                  <input
                    type="password"
                    placeholder="e.g. client@123"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                    Assign Initial Credits:
                  </label>
                  <input
                    type="number"
                    value={newUserCredits}
                    onChange={(e) => setNewUserCredits(Number(e.target.value))}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md"
                >
                  {isCreatingUser ? "Creating..." : "+ Create User & Assign Credits"}
                </button>
              </form>
            </div>

            {/* Table: Client Accounts & Credits */}
            <div className="lg:col-span-8 bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-white">Registered Clients & Credits Balance</h3>
                <span className="text-xs text-slate-400">Total: {allUsers.length} accounts</span>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] text-slate-400 uppercase bg-slate-950 border-b border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Client Name</th>
                      <th className="py-2.5 px-3">Username</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Balance Credits</th>
                      <th className="py-2.5 px-3">Sent Count</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {allUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-3 font-semibold text-white">{u.name}</td>
                        <td className="py-3 px-3 font-mono text-cyan-400">{u.username}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === "admin"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-cyan-500/20 text-cyan-300"
                            }`}
                          >
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-sm font-extrabold text-emerald-400">
                            {u.role === "admin" ? "∞ Unlimited" : u.credits.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">{u.sentCount || 0}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {u.role !== "admin" && (
                              <button
                                onClick={() => {
                                  setRechargeTargetUser(u);
                                  setRechargeAmount(50000);
                                }}
                                className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded text-[11px] font-semibold transition cursor-pointer"
                              >
                                + Recharge
                              </button>
                            )}
                            {u.role !== "admin" && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className="p-1 text-slate-300 hover:text-rose-400 transition cursor-pointer"
                                title="Delete user"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* =========================================================================
          SUB-VIEW B: CAMPAIGN SENDER (Meta Cloud API & SIM Modes)
          ========================================================================= */}
      {activeTab === "sender" && (
        <main className="max-w-7xl mx-auto mt-6 space-y-6">
          
          {/* DUAL ENGINE SWITCHER & META POLICY DASHBOARD */}
          <div className="bg-slate-900 border border-slate-700/90 rounded-3xl p-5 sm:p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-700">
              <div>
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Select Sending Engine
                </h2>
                <p className="text-xs text-slate-200 mt-1 font-medium">
                  Meta Official API (1,000 Free, Zero Ban) ya Private SIM Farm choose karein
                </p>
              </div>

              {/* Mode Toggle Buttons */}
              <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-700 shadow-md">
                <button
                  onClick={() => setEngineMode("meta")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    engineMode === "meta"
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <span>🌐 Official Meta Cloud API</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded-md border border-emerald-500/40 font-mono font-bold">
                    1000 Free/Mo
                  </span>
                </button>
                <button
                  onClick={() => setEngineMode("sim")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    engineMode === "sim"
                      ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <span>📱 Private SIM Farm</span>
                  <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded-md border border-cyan-500/40 font-mono font-bold">
                    {connectedSIMs.length} SIMs
                  </span>
                </button>
              </div>
            </div>

            {/* ENGINE INFO BAR */}
            {engineMode === "meta" ? (
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 border border-slate-700/90 rounded-xl p-3.5 shadow-md">
                  <div className="text-xs font-bold text-slate-200">🎁 Meta Free Allowance:</div>
                  <div className="text-base font-black text-emerald-400 font-mono mt-0.5">
                    {freeTierRemaining} / 1,000 <span className="text-xs font-semibold text-slate-300">Free/Mo</span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-medium mt-0.5">Service (Incoming) Msgs</div>
                </div>

                <div className="bg-slate-950 border border-slate-700/90 rounded-xl p-3.5 shadow-md">
                  <div className="text-xs font-bold text-slate-200">📊 Meta 24h Tier Limit:</div>
                  <div className="text-base font-black text-amber-300 font-mono mt-0.5">
                    {metaConfig.currentTierLimit} Customers / 24h
                  </div>
                  <div className="text-[11px] text-slate-300 font-medium mt-0.5">Official Tier Limit</div>
                </div>

                <div className="bg-slate-950 border border-slate-700/90 rounded-xl p-3.5 shadow-md">
                  <div className="text-xs font-bold text-slate-200">🛡️ Meta Ban Risk:</div>
                  <div className="text-base font-black text-emerald-300 font-mono mt-0.5">
                    0.0% (Meta Approved)
                  </div>
                  <div className="text-[11px] text-emerald-400 font-bold mt-0.5">
                    {metaConfig.hasToken ? "✅ Meta API Key Active" : "⚠️ API Key Needed"}
                  </div>
                </div>

                <div className="flex flex-col gap-2 justify-center">
                  <button
                    onClick={() => setShowMetaConfigModal(true)}
                    className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <span>⚙️ {metaConfig.hasToken ? "Update Meta API Key" : "Upload Meta API Key"}</span>
                  </button>
                  <button
                    onClick={() => setShowBuyMetaModal(true)}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <span>💳 Buy Meta Messages</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="pt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950 border border-slate-700/90 rounded-xl p-3.5 shadow-md">
                    <div className="text-xs font-bold text-slate-200">📱 Connected SIMs:</div>
                    <div className="text-base font-black text-cyan-400 font-mono mt-0.5">
                      {connectedSIMs.length} Active in Rotation
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-700/90 rounded-xl p-3.5 shadow-md">
                    <div className="text-xs font-bold text-slate-200">⚡ Engine Cost:</div>
                    <div className="text-base font-black text-emerald-400 font-mono mt-0.5">
                      100% Free Forever
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-700/90 rounded-xl p-3.5 shadow-md">
                    <div className="text-xs font-bold text-slate-200">Safe Capacity:</div>
                    <div className="text-base font-black text-white font-mono mt-0.5">
                      ~{connectedSIMs.length * 200} msgs/day
                    </div>
                  </div>

                  <div className="flex items-center">
                    <button
                      onClick={() => {
                        setShowAddSimModal(true);
                        setActiveQR(null);
                        setActivePairingCode(null);
                        setNewSimLabel(`SIM ${userVisibleSessions.length + 1}`);
                      }}
                      className="w-full py-3 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <span>+ Link SIM (OTP/QR)</span>
                    </button>
                  </div>
                </div>

                {/* Active SIMs List (Filtered by User) */}
                <div className="mt-4 pt-3 border-t border-slate-700">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-black text-slate-200">Live SIM Devices:</span>
                    <span className="text-xs text-slate-400 font-semibold">
                      ({connectedSIMs.length} connected)
                    </span>
                  </div>

                  {userVisibleSessions.length === 0 ? (
                    <div className="p-3.5 bg-slate-950 border border-dashed border-slate-700 rounded-xl text-center text-xs text-slate-300 font-medium">
                      Aapke account par koi SIM connected nahi hai. "+ Link SIM (OTP/QR)" par click karke apna WhatsApp number jodein.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {userVisibleSessions.map((sim) => (
                        <div
                          key={sim.id}
                          className={`p-3.5 rounded-xl border flex items-center justify-between shadow-md ${
                            sim.status === "CONNECTED"
                              ? "bg-[#062419] border-emerald-700/60"
                              : "bg-slate-950 border-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              sim.status === "CONNECTED" ? "bg-emerald-600/40 text-emerald-300 border border-emerald-500/40" : "bg-slate-800 text-slate-300"
                            }`}>
                              📱
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                                <span>{sim.label}</span>
                                <span className={`w-1.5 h-1.5 rounded-full ${sim.status === "CONNECTED" ? "bg-emerald-400" : "bg-amber-400"}`}></span>
                                {currentUser?.role === "admin" && sim.owner && (
                                  <span className="text-[9px] bg-slate-800 text-cyan-300 px-1 rounded font-mono font-bold">
                                    @{sim.owner}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-cyan-300 font-mono font-bold truncate">
                                {sim.userPhone ? `+${sim.userPhone}` : sim.status}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteSession(sim.id)}
                            title="Disconnect SIM"
                            className="px-2.5 py-1 bg-[#2a0e16] hover:bg-rose-900 border border-rose-700 text-rose-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                          >
                            Disconnect
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* MAIN TWO-COLUMN DISPATCH VIEW */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Target Contacts */}
            <section className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-slate-900 border border-slate-700/90 rounded-3xl p-5 sm:p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-cyan-600/40 text-cyan-300 border border-cyan-500/50 flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    Target Contacts ({recipients.length})
                  </h2>
                  {recipients.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRecipients([]);
                        setDirectPasteInput("");
                        setNumbersFeedback("");
                        setFileName("");
                        setDetectedVariables([]);
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 underline font-bold cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-200 font-medium mb-2.5 leading-relaxed">
                  📱 Mobile Numbers Box (Only 10 Digits | Auto-shift at 10 | Duplicates & &lt;10 auto-removed):
                </p>

                <textarea
                  rows={4}
                  placeholder={"8875216646\n9057588165\n(Type or paste 10-digit mobile numbers here)"}
                  value={directPasteInput}
                  onChange={handleNumberInputChange}
                  onPaste={handleNumberPaste}
                  onBlur={handleNumberInputBlur}
                  className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-xl p-3.5 text-xs text-emerald-300 focus:outline-none font-mono leading-relaxed resize-y placeholder:text-slate-400 focus:ring-1 focus:ring-cyan-400 shadow-inner"
                ></textarea>

                {numbersFeedback && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-cyan-300 font-mono font-semibold">
                    {numbersFeedback}
                  </div>
                )}

                <div className="flex gap-2.5 mt-3">
                  <button
                    type="button"
                    onClick={handleNumberInputBlur}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold py-2.5 rounded-xl transition cursor-pointer shadow-md"
                  >
                    ⚡ Auto-Format & Clean
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSampleExcel}
                    className="px-3.5 bg-slate-800 hover:bg-slate-700 text-cyan-200 border border-slate-600 text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
                  >
                    📥 Sample .xlsx
                  </button>
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-700">
                  <label className="w-full flex items-center justify-center p-3 border-2 border-dashed border-slate-600 hover:border-cyan-400 rounded-xl cursor-pointer bg-slate-950 transition group">
                    <span className="text-xs text-slate-200 group-hover:text-cyan-300 font-bold">
                      {fileName ? `File: ${fileName}` : "📊 Or Upload .xlsx Sheet"}
                    </span>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </section>

            {/* Right Column: Message, Attachments & Dispatch */}
            <section className="lg:col-span-7 flex flex-col gap-6">
              {/* Message Box */}
              <div className="bg-slate-900 border border-slate-700/90 rounded-3xl p-5 sm:p-6 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600/40 text-emerald-300 border border-emerald-500/50 flex items-center justify-center text-xs font-bold">
                      3
                    </span>
                    Message Content & Dynamic Templates
                  </h2>

                  {/* Template selector & Save / Delete controls */}
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleSelectTemplate(e.target.value)}
                      className="bg-slate-950 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-semibold"
                    >
                      <option value="">-- Saved Templates --</option>
                      {savedTemplates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setShowSaveTemplateModal(true)}
                      title="Save current message as template"
                      className="px-3 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <span>💾</span>
                      <span>Save</span>
                    </button>

                    {selectedTemplateId && (
                      <button
                        type="button"
                        onClick={() => {
                          const cur = savedTemplates.find((t) => t.id === selectedTemplateId);
                          if (cur) handleDeleteTemplate(cur.id, cur.name);
                        }}
                        title="Delete selected template"
                        className="px-2.5 py-2 bg-[#2a0e16] hover:bg-rose-900 border border-rose-700 text-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Variable Tags Bar (Excel Column Headers) */}
                <div className="mb-3 p-3 bg-slate-950 border border-slate-700/80 rounded-2xl shadow-inner">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span className="text-emerald-400">🏷️</span>
                      <span>
                        {detectedVariables.length > 0
                          ? `Uploaded Excel Headers (${detectedVariables.length}):`
                          : "Dynamic Column Tags:"}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const custom = prompt("Custom tag ka naam likhein (e.g. invoice, balance, city):");
                        if (custom && custom.trim()) {
                          const clean = custom.trim();
                          if (!detectedVariables.includes(clean)) {
                            setDetectedVariables((prev) => [...prev, clean]);
                          }
                          handleInsertVariable(clean);
                        }
                      }}
                      className="text-xs text-cyan-300 hover:text-cyan-200 underline font-bold cursor-pointer"
                    >
                      + Custom Tag
                    </button>
                  </div>

                  {detectedVariables.length === 0 ? (
                    <div className="text-xs text-amber-200 bg-[#261708] border border-amber-800/60 p-2.5 rounded-xl font-medium flex items-center gap-2">
                      <span>ℹ️</span>
                      <span>Excel sheet upload karein — uske saare column headers automatic yahan buttons ban kar dikhenge.</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {detectedVariables.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => handleInsertVariable(v)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-950 border border-slate-600 hover:border-emerald-400 text-emerald-300 font-bold rounded-lg text-xs font-mono transition cursor-pointer shadow-sm"
                          title={`Click to insert {${v}} in message`}
                        >
                          + {`{${v}}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    rows={4}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Dear {name}, your outstanding is {os pending} from {due date}. Ageing is {aging}. Thank you!"
                    className="w-full bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl p-3.5 text-sm text-white focus:outline-none leading-relaxed font-sans placeholder:text-slate-400 focus:ring-1 focus:ring-emerald-400 shadow-inner"
                  ></textarea>
                  <span className="absolute bottom-3 right-3 text-xs text-slate-300 font-mono font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                    {messageText.length} chars
                  </span>
                </div>

                {/* Live Message Preview (showing how actual message will look for 1st recipient) */}
                {recipients.length > 0 && (
                  <div className="mt-3 p-3 bg-[#062419] border border-emerald-700/60 rounded-xl shadow-md">
                    <div className="text-xs font-black text-emerald-300 mb-1.5 flex items-center justify-between">
                      <span>👁️ Live Preview for First Contact ({recipients[0].phone}):</span>
                      <span className="text-slate-300 font-semibold text-[11px]">Excel columns auto-substituted</span>
                    </div>
                    <div className="text-xs text-white whitespace-pre-wrap font-sans bg-slate-950 p-3 rounded-lg border border-slate-700 leading-relaxed font-medium">
                      {(() => {
                        let preview = messageText;
                        const row = recipients[0].customData || {};
                        const lowerRow: Record<string, any> = {};
                        Object.keys(row).forEach((k) => {
                          lowerRow[k.trim().toLowerCase()] = row[k];
                        });
                        preview = preview.replace(/{([^}]+)}/g, (match, key) => {
                          const cleanKey = key.trim().toLowerCase();
                          if (cleanKey === "name") {
                            return recipients[0].name || lowerRow["name"] || match;
                          }
                          if (lowerRow[cleanKey] !== undefined && lowerRow[cleanKey] !== null) {
                            return String(lowerRow[cleanKey]);
                          }
                          return match;
                        });
                        return preview;
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Media Attachment (1 of 3) */}
              <div className="bg-slate-900 border border-slate-700/90 rounded-3xl p-5 sm:p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Attachment (Select 1 of 3)
                  </h2>
                  {attachment && (
                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      className="text-xs text-rose-400 hover:text-rose-300 underline font-bold cursor-pointer"
                    >
                      Remove Attachment
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-200 mb-3.5 font-medium">
                  Image (2 MB) | Video (10 MB) | PDF (3 MB)
                </p>

                {uploadError && (
                  <div className="mb-3 p-2.5 rounded-lg bg-[#2a0e16] border border-rose-800 text-rose-300 text-xs font-semibold">
                    {uploadError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label
                    className={`p-3.5 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition shadow-md ${
                      attachment?.type === "image"
                        ? "bg-pink-500/20 border-pink-500 text-pink-200"
                        : "bg-slate-950 border-slate-700 hover:border-pink-500/50 text-slate-200"
                    }`}
                  >
                    <span className="text-2xl mb-1">🖼️</span>
                    <span className="text-xs font-black">Image</span>
                    <span className="text-[10px] text-pink-300 font-bold mt-0.5">Max 2 MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleSelectAttachment("image", e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>

                  <label
                    className={`p-3.5 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition shadow-md ${
                      attachment?.type === "video"
                        ? "bg-purple-500/20 border-purple-500 text-purple-200"
                        : "bg-slate-950 border-slate-700 hover:border-purple-500/50 text-slate-200"
                    }`}
                  >
                    <span className="text-2xl mb-1">🎥</span>
                    <span className="text-xs font-black">Video</span>
                    <span className="text-[10px] text-purple-300 font-bold mt-0.5">Max 10 MB</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleSelectAttachment("video", e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>

                  <label
                    className={`p-3.5 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition shadow-md ${
                      attachment?.type === "pdf"
                        ? "bg-amber-500/20 border-amber-500 text-amber-200"
                        : "bg-slate-950 border-slate-700 hover:border-amber-500/50 text-slate-200"
                    }`}
                  >
                    <span className="text-2xl mb-1">📄</span>
                    <span className="text-xs font-black">PDF Document</span>
                    <span className="text-[10px] text-amber-300 font-bold mt-0.5">Max 3 MB</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => handleSelectAttachment("pdf", e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>
                </div>

                {attachment && (
                  <div className="mt-3.5 p-3 bg-slate-950 rounded-xl border border-emerald-500/50 flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{attachment.type === "image" ? "🖼️" : attachment.type === "video" ? "🎥" : "📄"}</span>
                      <span className="text-xs font-bold text-white truncate max-w-[220px]">{attachment.name}</span>
                    </div>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold">
                      Ready to Send
                    </span>
                  </div>
                )}
              </div>

              {/* Table & Big Dispatch Button */}
              <div className="bg-slate-900 border border-slate-700/90 rounded-3xl p-5 sm:p-6 shadow-2xl flex-1 flex flex-col">
                {/* SELECT SENDING WHATSAPP NUMBER (SPECIFIC SIM VS RANDOM ROTATION) */}
                {engineMode === "sim" && (
                  <div className="mb-4 bg-slate-950 border border-slate-700 rounded-2xl p-3.5 space-y-2 shadow-inner">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <span>📲</span> Select Sending WhatsApp SIM:
                      </label>
                      <span className="text-xs text-cyan-300 font-mono font-bold">
                        {connectedSIMs.length} SIM(s) Connected
                      </span>
                    </div>
                    <select
                      value={selectedDispatchSim}
                      onChange={(e) => setSelectedDispatchSim(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-cyan-300 font-bold focus:outline-none focus:border-cyan-500 font-mono shadow-sm"
                    >
                      <option value="random">
                        🎲 Random / Auto Round-Robin ({connectedSIMs.length} SIMs Rotation - Safe & Anti-Ban)
                      </option>
                      {connectedSIMs.map((sim) => (
                        <option key={sim.id} value={sim.id}>
                          📱 Specific SIM: {sim.label} ({sim.userPhone ? `+${sim.userPhone}` : sim.id})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-300 leading-normal font-medium">
                      {selectedDispatchSim === "random"
                        ? "✨ Random Rotation: Har message alag SIM se round-robin rotation me jayega (WhatsApp Ban Protection)."
                        : `🎯 Specific SIM: Sabhi messages strictly chuni hui SIM (${connectedSIMs.find((s) => s.id === selectedDispatchSim)?.label || "selected"}) se bheje jayenge.`}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">Contacts Queue</h3>
                  <span className="text-xs text-emerald-400 font-mono font-bold">
                    Cost: {recipients.length} Credits
                  </span>
                </div>

                <div className="overflow-x-auto flex-1 max-h-[160px] overflow-y-auto mb-4 border border-slate-700 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="text-xs text-slate-200 font-black uppercase bg-slate-950 sticky top-0 border-b border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Number</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {recipients.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-300 font-medium">
                            Koi contact nahi hai. Excel upload ya numbers paste karein.
                          </td>
                        </tr>
                      ) : (
                        recipients.map((r, idx) => (
                          <tr key={r.id} className="hover:bg-slate-800/60 transition">
                            <td className="py-2 px-3 font-mono text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-2 px-3 text-slate-100 font-semibold">{r.name}</td>
                            <td className="py-2 px-3 font-mono text-cyan-300 font-bold">{r.phone}</td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  r.status === "Sent"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                    : r.status === "Failed"
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                    : "bg-slate-800 text-slate-300"
                                }`}
                              >
                                {r.status === "Sent" ? `Sent (${r.messageId?.slice(0, 12)}...)` : r.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* The Big Send Button */}
                <button
                  onClick={handleStartDispatch}
                  disabled={isSending || recipients.length === 0}
                  className={`w-full py-4 px-6 rounded-2xl font-black text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-2xl ${
                    isSending
                      ? "bg-amber-600 text-white animate-pulse"
                      : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/60"
                  }`}
                >
                  {isSending ? (
                    <span>Dispatching via {engineMode === "meta" ? "Meta Cloud API" : "SIM Server"}...</span>
                  ) : (
                    <>
                      <span>
                        Send {recipients.length} Messages via {engineMode === "meta" ? "Official Meta Cloud API" : "Private SIM Server"}
                      </span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>

                {/* Server Logs */}
                {serverLogs.length > 0 && (
                  <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-700 font-mono text-[11px] text-slate-300 max-h-[100px] overflow-y-auto space-y-1">
                    {serverLogs.map((log, i) => (
                      <div key={i} className="text-emerald-400">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      )}

      {/* =========================================================================
          SUB-VIEW A: EXECUTIVE ANALYTICS & VIEWS DASHBOARD
          ========================================================================= */}
      {activeTab === "dashboard" && (
        <main className="max-w-7xl mx-auto mt-4">
          <SocialAnalyticsDashboard
            currentUserId={currentUser.id}
            currentUserName={currentUser.name}
            onNavigateToPostStudio={() => setActiveTab("social")}
          />
        </main>
      )}

      {/* =========================================================================
          SUB-VIEW B: POST STUDIO (MULTI-CHANNEL PUBLISHER)
          ========================================================================= */}
      {activeTab === "social" && (
        <main className="max-w-7xl mx-auto mt-6">
          <OmniChannelSocialPublisher
            currentUserName={currentUser.name}
            currentUserId={currentUser.id}
            initialPostFormat="feed"
            prefillData={prefillPostData}
          />
        </main>
      )}

      {/* =========================================================================
          SUB-VIEW B.5: REEL STUDIO (INSTAGRAM & FACEBOOK REELS 9:16)
          ========================================================================= */}
      {activeTab === "reel" && (
        <main className="max-w-7xl mx-auto mt-6">
          <OmniChannelSocialPublisher
            currentUserName={currentUser.name}
            currentUserId={currentUser.id}
            initialPostFormat="reel"
            prefillData={prefillPostData}
          />
        </main>
      )}

      {/* =========================================================================
          SUB-VIEW C: AI POST CREATOR (GEMINI DAILY 5 POSTS & 5s REELS)
          ========================================================================= */}
      {activeTab === "ai_creator" && (
        <main className="max-w-7xl mx-auto mt-6">
          <AIPostCreator
            currentUserId={currentUser.id}
            currentUserName={currentUser.name}
            onNavigateToPostStudio={(data) => {
              if (data) setPrefillPostData(data);
              setActiveTab(data?.postFormat === "reel" ? "reel" : "social");
            }}
          />
        </main>
      )}
        </div>
      </div>
    </div>
  );
}
