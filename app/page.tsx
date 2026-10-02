"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import OmniChannelSocialPublisher from "@/components/OmniChannelSocialPublisher";

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
  status: "Pending" | "Sending" | "Sent" | "Failed";
  fromSIM?: string;
  fromPhone?: string;
  messageId?: string;
  error?: string;
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

const ENGINE_URL = "http://localhost:5001";

export default function MultiTenantWhatsAppSystem() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loginUsername, setLoginUsername] = useState<string>("admin");
  const [loginPassword, setLoginPassword] = useState<string>("admin123");
  const [loginError, setLoginError] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Active View Tab: 'sender' (WhatsApp Campaigns) vs 'social' (Omni Social Media) vs 'admin' (User Management)
  const [activeTab, setActiveTab] = useState<"admin" | "sender" | "social">("sender");

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
  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: 1, name: "Test Contact", phone: "8875216646", status: "Pending" },
    { id: 2, name: "Second Contact", phone: "9057588165", status: "Pending" },
  ]);
  const [directPasteInput, setDirectPasteInput] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  // Message & Attachment
  const [messageText, setMessageText] = useState<string>(
    "Hello {Name}, aapke order/service ki update yahan hai. Kripya check karein!"
  );
  const [attachment, setAttachment] = useState<AttachmentFile | null>(null);
  const [uploadError, setUploadError] = useState<string>("");

  // Dispatch progress
  const [isSending, setIsSending] = useState<boolean>(false);
  const [serverLogs, setServerLogs] = useState<string[]>([]);

  // Check saved session in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("whatsapp_saas_user");
    if (saved) {
      try {
        const u = JSON.parse(saved);
        setCurrentUser(u);
        setActiveTab("sender");
      } catch (e) {}
    }
  }, []);

  // Fetch Meta Config
  const fetchMetaConfig = async () => {
    try {
      const res = await fetch("/api/meta/config");
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
  }, []);

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

  // Fetch active sessions from Baileys engine
  const fetchSessions = async () => {
    try {
      const res = await fetch(`${ENGINE_URL}/api/sessions`);
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
      }
    } catch (err) {
      setIsServerOnline(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 2500);
    return () => clearInterval(interval);
  }, [activeSessionId]);

  // --- SAVE META CREDENTIALS ---
  const handleSaveMetaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/meta/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: inputMetaToken.trim() || undefined,
          phoneNumberId: inputMetaPhoneId.trim(),
          wabaId: inputMetaWabaId.trim(),
          currentTierLimit: inputMetaTierLimit,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Meta Cloud API Credentials Saved Successfully!");
        setShowMetaConfigModal(false);
        setInputMetaToken("");
        fetchMetaConfig();
      } else {
        alert(data.error || "Failed to save Meta config");
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
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

  const handleQuickDemoLogin = (uname: string, pword: string) => {
    setLoginUsername(uname);
    setLoginPassword(pword);
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
      const res = await fetch(`${ENGINE_URL}/api/sessions/create-pairing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          label,
          phoneNumber: newSimPhone.trim(),
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
      const res = await fetch(`${ENGINE_URL}/api/sessions/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, label }),
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
        await fetch(`${ENGINE_URL}/api/sessions/${id}`, { method: "DELETE" });
        fetchSessions();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- RECIPIENTS & ATTACHMENTS ---
  const handleAddDirectPasted = () => {
    if (!directPasteInput.trim()) return;

    const lines = directPasteInput.split("\n");
    const newItems: Recipient[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let name = "";
      let phone = "";

      if (trimmed.includes("\t")) {
        const parts = trimmed.split("\t");
        name = parts[0]?.trim();
        phone = parts[1]?.trim() || parts[0]?.trim();
      } else if (trimmed.includes(",")) {
        const parts = trimmed.split(",");
        name = parts[0]?.trim();
        phone = parts[1]?.trim() || parts[0]?.trim();
      } else {
        phone = trimmed;
      }

      const cleanPhone = phone.replace(/[^0-9]/g, "");

      if (cleanPhone.length >= 7) {
        newItems.push({
          id: Date.now() + Math.random(),
          name: name && name !== phone ? name : `Customer ${recipients.length + newItems.length + 1}`,
          phone: cleanPhone,
          status: "Pending",
        });
      }
    });

    setRecipients((prev) => [...prev, ...newItems]);
    setDirectPasteInput("");
  };

  const handleLoadDemoContacts = () => {
    setRecipients([
      { id: 1, name: "Satyam Sharma", phone: "8875216646", status: "Pending" },
      { id: 2, name: "Rahul Verma", phone: "9057588165", status: "Pending" },
      { id: 3, name: "Pooja Patel", phone: "9876543210", status: "Pending" },
    ]);
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

        const mapped: Recipient[] = data.map((row, index) => {
          const name = row.Name || row.name || row["Customer Name"] || row["Customer"] || `Customer ${index + 1}`;
          let phone =
            row.Phone ||
            row.phone ||
            row.Mobile ||
            row.mobile ||
            row["Phone Number"] ||
            row["Mobile Number"] ||
            row["Contact"] ||
            "";

          phone = String(phone).replace(/[^0-9]/g, "");

          return {
            id: Date.now() + index,
            name: String(name),
            phone: phone,
            status: "Pending",
          };
        });

        setRecipients(mapped);
      } catch (err) {
        alert("File parse nahi ho saki. Valid .xlsx ya .csv file upload karein.");
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleDownloadSampleExcel = () => {
    const sampleData = [
      { "Customer Name": "Rahul Sharma", "Mobile Number": "918875216646", "Amount": "1500" },
      { "Customer Name": "Pooja Verma", "Mobile Number": "919057588165", "Amount": "2400" },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "bulk_whatsapp_sample.xlsx");
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

  // --- DISPATCH CAMPAIGN (DUAL MODE: META CLOUD API OR PRIVATE SIMs) ---
  const connectedSIMs = sessions.filter((s) => s.status === "CONNECTED");

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
            recipients: recipients.map((r) => r.phone),
            message: messageText,
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
      alert("Server par koi SIM connected nahi hai! Admin ko boliye ki SIM link karein.");
      setIsSending(false);
      return;
    }

    setServerLogs([
      `[${new Date().toLocaleTimeString()}] Dispatching ${recipients.length} messages across ${connectedSIMs.length} SIMs...`,
    ]);

    try {
      const response = await fetch(`${ENGINE_URL}/api/sessions/send-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: recipients.map((r) => r.phone),
          message: messageText,
          attachment: attachment ? { name: attachment.name, type: attachment.type, dataUrl: attachment.dataUrl } : null,
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

      alert(`Success! ${successCount} messages aapke connected SIMs ke zariye WhatsApp par successfully deliver ho gaye!`);
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
  // VIEW 1: LOGIN PAGE
  // =========================================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Meta Cloud & SIM Bulk SaaS Portal
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Portal Login</h1>
            <p className="text-xs text-slate-400 mt-1">
              Admin ya User account se login karke campaign manage karein
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300">
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Password:</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-lg shadow-emerald-950/50"
            >
              {isLoggingIn ? "Logging in..." : "Login to Portal"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 block mb-2.5">Instant Testing Accounts:</span>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin("admin", "admin123")}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-400 rounded-lg text-xs font-mono transition text-left flex justify-between cursor-pointer"
              >
                <span>👑 Super Admin</span>
                <span className="text-slate-500">admin / admin123</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin("user", "123")}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-emerald-400 rounded-lg text-xs font-mono transition text-left flex justify-between cursor-pointer"
              >
                <span>👤 Satyam (User)</span>
                <span className="text-slate-500">user / 123</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin("rahul", "user123")}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-400 rounded-lg text-xs font-mono transition text-left flex justify-between cursor-pointer"
              >
                <span>👤 Rahul Sharma</span>
                <span className="text-slate-500">50k Credits</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: LOGGED IN APPLICATION
  // =========================================================================
  const freeTierRemaining = Math.max(0, metaConfig.freeTierTotal - (metaConfig.freeTierUsed || 0));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col lg:flex-row">
      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden"
        ></div>
      )}

      {/* =========================================================================
          LEFT VERTICAL NAVIGATION BAR (SIDEBAR)
          ========================================================================= */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-slate-900 border-r border-slate-800 p-5 flex flex-col justify-between shrink-0 transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-emerald-950/50">
                💬
              </div>
              <div>
                <div className="text-sm font-black text-white flex items-center gap-1.5">
                  OmniChat SaaS
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-mono font-bold">
                    PRO
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">WhatsApp & Social Suite</div>
              </div>
            </div>
            {/* Close button on mobile */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-1 text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* User Profile & Credit Balance Card */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                  <span className="truncate">{currentUser.name}</span>
                  {currentUser.role === "admin" ? (
                    <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 py-0.2 rounded font-mono font-bold">
                      ADMIN
                    </span>
                  ) : (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded font-mono font-bold">
                      CLIENT
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 truncate">@{currentUser.username}</div>
              </div>
            </div>

            {/* Credits Counter */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400">Message Balance</div>
                <div className="text-sm font-extrabold text-emerald-400 font-mono">
                  {currentUser.role === "admin" ? "UNLIMITED" : currentUser.credits.toLocaleString()}{" "}
                  <span className="text-[10px] font-normal text-slate-400">Credits</span>
                </div>
              </div>
              <button
                onClick={() => setShowBuyMetaModal(true)}
                className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-md"
              >
                <span>+ Buy</span>
              </button>
            </div>
          </div>

          {/* VERTICAL NAVIGATION TABS */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 mb-2">
              Navigation Menu
            </div>

            {/* Vertical Tab 1: WhatsApp Campaigns */}
            <button
              onClick={() => {
                setActiveTab("sender");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full p-3 rounded-2xl text-left transition flex items-center gap-3 cursor-pointer group ${
                activeTab === "sender"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/60 font-bold border-l-4 border-emerald-300"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/70"
              }`}
            >
              <span className="text-lg">🚀</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold leading-tight">WhatsApp Campaigns</div>
                <div className={`text-[10px] truncate ${activeTab === "sender" ? "text-emerald-100" : "text-slate-500"}`}>
                  Meta API & SIM Farm
                </div>
              </div>
            </button>

            {/* Vertical Tab 2: Omni-Post (All Socials) */}
            <button
              onClick={() => {
                setActiveTab("social");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full p-3 rounded-2xl text-left transition flex items-center gap-3 cursor-pointer group ${
                activeTab === "social"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-950/60 font-bold border-l-4 border-indigo-300"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/70"
              }`}
            >
              <span className="text-lg">🌐</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold leading-tight flex items-center justify-between">
                  <span>Omni-Post Studio</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    activeTab === "social" ? "bg-white/20 text-white" : "bg-indigo-950 text-indigo-300 border border-indigo-500/30"
                  }`}>
                    1-CLICK
                  </span>
                </div>
                <div className={`text-[10px] truncate ${activeTab === "social" ? "text-indigo-100" : "text-slate-500"}`}>
                  FB, Insta, LinkedIn, X, TG
                </div>
              </div>
            </button>

            {/* Vertical Tab 3: Admin Users & Credits (Admin Only) */}
            {currentUser.role === "admin" && (
              <button
                onClick={() => {
                  setActiveTab("admin");
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full p-3 rounded-2xl text-left transition flex items-center gap-3 cursor-pointer group ${
                  activeTab === "admin"
                    ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-950/60 font-bold border-l-4 border-amber-300"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/70"
                }`}
              >
                <span className="text-lg">👑</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold leading-tight">Users & Credits</div>
                  <div className={`text-[10px] truncate ${activeTab === "admin" ? "text-amber-100" : "text-slate-500"}`}>
                    Client Wallets & Accounts
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          {/* Quick Engine Status */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 text-[10px] text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                SIM Farm
              </span>
              <span className="font-mono text-emerald-400">{connectedSIMs.length} Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                Meta Cloud API
              </span>
              <span className="font-mono text-cyan-400">{metaConfig.hasToken ? "Ready" : "Not Set"}</span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-3 bg-slate-950 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 border border-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🚪</span>
            <span>Logout Account</span>
          </button>
        </div>
      </aside>

      {/* =========================================================================
          RIGHT MAIN CONTENT AREA
          ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header inside Main Content */}
        <header className="px-4 sm:px-8 py-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar Hamburger Toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                <span>Dashboard</span>
                <span>/</span>
                <span className="text-emerald-400 capitalize">
                  {activeTab === "sender" ? "WhatsApp Campaigns" : activeTab === "social" ? "Omni-Post Studio" : "User Management"}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                {activeTab === "sender" && "🚀 WhatsApp Bulk Campaign Dispatcher"}
                {activeTab === "social" && "🌐 Single Post ➔ All Social Media Accounts"}
                {activeTab === "admin" && "👑 Admin User & Credit Management"}
              </h1>
            </div>
          </div>

          {/* Quick Header Right Actions */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400">Balance:</span>
              <span className="font-mono font-bold text-emerald-400">
                {currentUser.role === "admin" ? "UNLIMITED" : currentUser.credits.toLocaleString()}
              </span>
            </div>

            <button
              onClick={() => setShowBuyMetaModal(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-md"
            >
              <span>💳 Buy Messages</span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1">

      {/* =========================================================================
          META PRICING & BUY MESSAGES MODAL (AS PER META POLICY)
          ========================================================================= */}
      {showBuyMetaModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl">
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
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 mb-5 flex items-center justify-between">
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
                className="p-4 rounded-2xl border border-slate-800 bg-slate-950 hover:border-emerald-500/60 hover:bg-slate-900/80 transition cursor-pointer flex items-center justify-between group"
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
                className="p-4 rounded-2xl border-2 border-emerald-500/50 bg-emerald-950/20 hover:border-emerald-400 hover:bg-emerald-950/40 transition cursor-pointer flex items-center justify-between relative shadow-lg shadow-emerald-950/50"
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
                className="p-4 rounded-2xl border border-slate-800 bg-slate-950 hover:border-cyan-500/60 hover:bg-slate-900/80 transition cursor-pointer flex items-center justify-between group"
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
              <span className="text-[11px] text-slate-500">
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl">
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
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 mb-4 text-xs text-slate-300">
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                  Meta 24-Hour Messaging Tier Limit:
                </label>
                <select
                  value={inputMetaTierLimit}
                  onChange={(e) => setInputMetaTierLimit(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
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
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Save Meta Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credit Recharge Modal (Admin Only) */}
      {rechargeTargetUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              Recharge Credits for {rechargeTargetUser.name}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Current Balance: <span className="text-emerald-400 font-mono">{rechargeTargetUser.credits.toLocaleString()} Credits</span>
            </p>

            <div className="space-y-2 mb-4">
              <label className="p-3 rounded-xl border border-emerald-500/50 bg-emerald-950/20 flex items-center justify-between cursor-pointer">
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

              <label className="p-3 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between cursor-pointer">
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white">Link New SIM to Private Server</h3>
              <span className="text-[11px] text-emerald-400 font-mono">100% Free Forever</span>
            </div>

            <div className="flex bg-slate-950 p-1 rounded-xl mb-4 border border-slate-800">
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
                    <div className="my-4 py-3 px-4 bg-emerald-950/60 border-2 border-dashed border-emerald-500 rounded-xl inline-block">
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
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
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
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
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

      {/* =========================================================================
          SUB-VIEW A: ADMIN USER MANAGEMENT (Only for Admin)
          ========================================================================= */}
      {currentUser.role === "admin" && activeTab === "admin" && (
        <main className="max-w-7xl mx-auto mt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="text-xs text-slate-400">Total Registered Clients</div>
              <div className="text-2xl font-black text-white mt-1">
                {allUsers.filter((u) => u.role === "user").length}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="text-xs text-slate-400">Active User Credits</div>
              <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                {allUsers
                  .filter((u) => u.role === "user")
                  .reduce((acc, u) => acc + (u.credits || 0), 0)
                  .toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="text-xs text-slate-400">Meta Free Allowance</div>
              <div className="text-2xl font-black text-cyan-400 mt-1 font-mono">
                {freeTierRemaining} Free
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="text-xs text-slate-400">Meta 24h Tier Limit</div>
              <div className="text-lg font-bold text-amber-400 mt-1 font-mono">
                {metaConfig.currentTierLimit} msgs/24h
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form: Create User */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-400 font-mono focus:outline-none focus:border-emerald-500"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
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
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-white">Registered Clients & Credits Balance</h3>
                <span className="text-xs text-slate-400">Total: {allUsers.length} accounts</span>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
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
                                className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Select Sending Engine
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Meta Official API (1,000 Free, Zero Ban) ya Private SIM Farm choose karein
                </p>
              </div>

              {/* Mode Toggle Buttons */}
              <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setEngineMode("meta")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    engineMode === "meta"
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>🌐 Official Meta Cloud API</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded-md border border-emerald-500/40 font-mono">
                    1000 Free/Mo
                  </span>
                </button>
                <button
                  onClick={() => setEngineMode("sim")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    engineMode === "sim"
                      ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>📱 Private SIM Farm</span>
                  <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded-md border border-cyan-500/40 font-mono">
                    {connectedSIMs.length} SIMs
                  </span>
                </button>
              </div>
            </div>

            {/* ENGINE INFO BAR */}
            {engineMode === "meta" ? (
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">🎁 Meta Free Allowance:</div>
                  <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                    {freeTierRemaining} / 1,000 <span className="text-xs font-normal text-slate-400">Free/Mo</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Service (Incoming) Msgs</div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">📊 Meta 24h Tier Limit:</div>
                  <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
                    {metaConfig.currentTierLimit} Customers / 24h
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Official Tier Limit</div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">🛡️ Meta Ban Risk:</div>
                  <div className="text-base font-bold text-emerald-300 font-mono mt-0.5">
                    0.0% (Meta Approved)
                  </div>
                  <div className="text-[10px] text-emerald-500/80 mt-0.5 font-medium">
                    {metaConfig.hasToken ? "✅ Meta API Key Active" : "⚠️ API Key Needed"}
                  </div>
                </div>

                <div className="flex flex-col gap-2 justify-center">
                  <button
                    onClick={() => setShowMetaConfigModal(true)}
                    className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <span>⚙️ {metaConfig.hasToken ? "Update Meta API Key" : "Upload Meta API Key"}</span>
                  </button>
                  <button
                    onClick={() => setShowBuyMetaModal(true)}
                    className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <span>💳 Buy Meta Messages</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">📱 Connected SIMs:</div>
                  <div className="text-base font-bold text-cyan-400 font-mono mt-0.5">
                    {connectedSIMs.length} Active in Rotation
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">⚡ Engine Cost:</div>
                  <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                    100% Free Forever
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">Safe Capacity:</div>
                  <div className="text-base font-bold text-white font-mono mt-0.5">
                    ~{connectedSIMs.length * 200} msgs/day
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowAddSimModal(true);
                      setActiveQR(null);
                      setActivePairingCode(null);
                      setNewSimLabel(`SIM ${sessions.length + 1}`);
                    }}
                    className="flex-1 py-3 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <span>+ Link SIM (OTP/QR)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* MAIN TWO-COLUMN DISPATCH VIEW */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Target Contacts */}
            <section className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    Target Contacts ({recipients.length})
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleLoadDemoContacts}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer underline"
                    >
                      + 3 Demo Numbers
                    </button>
                    {recipients.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setRecipients([])}
                        className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mb-2">
                  💡 Hint: Direct number paste karein ya Excel sheet upload karein (1 line me 1 number):
                </p>

                <textarea
                  rows={3}
                  placeholder="8875216646&#10;Rahul, 9057588165"
                  value={directPasteInput}
                  onChange={(e) => setDirectPasteInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                ></textarea>

                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleAddDirectPasted}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold py-2 rounded-xl transition cursor-pointer shadow-md"
                  >
                    + Add Pasted Numbers
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSampleExcel}
                    className="px-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    📥 Sample .xlsx
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800">
                  <label className="w-full flex items-center justify-center p-2.5 border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl cursor-pointer bg-slate-950/60 transition group">
                    <span className="text-xs text-slate-300 group-hover:text-cyan-400 font-medium">
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
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-bold">
                      3
                    </span>
                    Message Content & Templates
                  </h2>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {messageText.length} chars
                  </span>
                </div>

                <textarea
                  rows={3}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Aapka message yahan likhein..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed"
                ></textarea>

                {/* Quick Insert & Templates */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  <span className="text-[11px] text-slate-400 font-medium mr-1">Quick Templates:</span>
                  <button
                    type="button"
                    onClick={() => setMessageText((prev) => prev.trim() + " {Name}")}
                    className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
                  >
                    + {`{Name}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageText("🎉 Special Festive Offer! Dear {Name}, enjoy up to 40% OFF on all services today. Order now: 8875216646")}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs transition cursor-pointer"
                  >
                    🎁 Festival Offer
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageText("📦 Order Update: Hello {Name}, aapka order dispatch ho chuka hai aur jald hi deliver hoga. Tracking ke liye reply karein!")}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs transition cursor-pointer"
                  >
                    📦 Order Update
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageText("👋 Namaste {Name}, hum aapki kya sahayata kar sakte hain? Kripya apna prashna yahan reply karein.")}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs transition cursor-pointer"
                  >
                    💬 Support Help
                  </button>
                </div>
              </div>

              {/* Media Attachment (1 of 3) */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Attachment (Select 1 of 3)
                  </h2>
                  {attachment && (
                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
                    >
                      Remove Attachment
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Image (2 MB) | Video (10 MB) | PDF (3 MB)
                </p>

                {uploadError && (
                  <div className="mb-3 p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs">
                    {uploadError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition ${
                      attachment?.type === "image"
                        ? "bg-pink-500/10 border-pink-500 text-pink-300"
                        : "bg-slate-950 border-slate-800 hover:border-pink-500/50 text-slate-300"
                    }`}
                  >
                    <span className="text-xl mb-1">🖼️</span>
                    <span className="text-xs font-bold">Image</span>
                    <span className="text-[10px] text-pink-400 mt-0.5">Max 2 MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleSelectAttachment("image", e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition ${
                      attachment?.type === "video"
                        ? "bg-purple-500/10 border-purple-500 text-purple-300"
                        : "bg-slate-950 border-slate-800 hover:border-purple-500/50 text-slate-300"
                    }`}
                  >
                    <span className="text-xl mb-1">🎥</span>
                    <span className="text-xs font-bold">Video</span>
                    <span className="text-[10px] text-purple-400 mt-0.5">Max 10 MB</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleSelectAttachment("video", e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition ${
                      attachment?.type === "pdf"
                        ? "bg-amber-500/10 border-amber-500 text-amber-300"
                        : "bg-slate-950 border-slate-800 hover:border-amber-500/50 text-slate-300"
                    }`}
                  >
                    <span className="text-xl mb-1">📄</span>
                    <span className="text-xs font-bold">PDF Document</span>
                    <span className="text-[10px] text-amber-400 mt-0.5">Max 3 MB</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => handleSelectAttachment("pdf", e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>
                </div>

                {attachment && (
                  <div className="mt-3 p-2.5 bg-slate-950 rounded-xl border border-emerald-500/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{attachment.type === "image" ? "🖼️" : attachment.type === "video" ? "🎥" : "📄"}</span>
                      <span className="text-xs font-semibold text-slate-200 truncate max-w-[200px]">{attachment.name}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">Ready</span>
                  </div>
                )}
              </div>

              {/* Table & Big Dispatch Button */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">Contacts Queue</h3>
                  <span className="text-xs text-emerald-400 font-mono">
                    Cost: {recipients.length} Credits
                  </span>
                </div>

                <div className="overflow-x-auto flex-1 max-h-[160px] overflow-y-auto mb-4">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/60 sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Number</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {recipients.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-500">
                            Koi contact nahi hai.
                          </td>
                        </tr>
                      ) : (
                        recipients.map((r, idx) => (
                          <tr key={r.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                            <td className="py-2 px-3 text-slate-200">{r.name}</td>
                            <td className="py-2 px-3 font-mono text-cyan-400">{r.phone}</td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  r.status === "Sent"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : r.status === "Failed"
                                    ? "bg-rose-500/20 text-rose-400"
                                    : "bg-slate-800 text-slate-400"
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
                  className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xl ${
                    isSending
                      ? "bg-amber-600 text-white animate-pulse"
                      : "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-emerald-950"
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
                  <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-[11px] text-slate-300 max-h-[100px] overflow-y-auto space-y-1">
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
          SUB-VIEW C: OMNI-CHANNEL SOCIAL MEDIA AUTO-POSTER
          ========================================================================= */}
      {activeTab === "social" && (
        <main className="max-w-7xl mx-auto mt-6">
          <OmniChannelSocialPublisher currentUserName={currentUser.name} />
        </main>
      )}
        </div>
      </div>
    </div>
  );
}
