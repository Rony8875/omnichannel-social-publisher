"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ChannelScheduleQueuePage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();

  const channelId = (params?.channelId as string) || "default_channel";
  const [activeTab, setActiveTab] = useState<string>("queue");
  const [successToast, setSuccessToast] = useState<{
    show: boolean;
    title: string;
    description: string;
  }>({
    show: false,
    title: "",
    description: "",
  });

  // 1. Buffer-Style Callback & Query Parameters Handling
  useEffect(() => {
    const isSuccess = searchParams.get("channelConnectionSuccess") === "true";
    const queriedChannelId = searchParams.get("channelId") || channelId;
    const tabParam = searchParams.get("tab") || "queue";
    const isAiAssisted = searchParams.get("aiAssisted") === "true";

    if (tabParam) {
      setActiveTab(tabParam);
    }

    if (isSuccess) {
      setSuccessToast({
        show: true,
        title: "Channel Connected Successfully!",
        description: `Channel ID: ${queriedChannelId} is now linked. ${
          isAiAssisted ? "AI Queue optimizer enabled." : "Posting queue is live."
        }`,
      });

      // Clean query params from the browser address bar without reload
      const cleanPath = window.location.pathname + `?tab=${tabParam}`;
      window.history.replaceState({}, "", cleanPath);

      // Auto-dismiss toast after 5 seconds
      const timer = setTimeout(() => {
        setSuccessToast((prev) => ({ ...prev, show: false }));
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [searchParams, channelId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-8">
      {/* Top Floating Success Notification (Buffer Pattern) */}
      {successToast.show && (
        <div className="fixed top-5 right-5 z-50 max-w-md w-full bg-slate-900 border border-emerald-500/50 rounded-2xl p-4 shadow-2xl shadow-emerald-950/50 flex items-start justify-between gap-3 animate-in slide-in-from-top duration-300">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-lg shrink-0">
              ✓
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">{successToast.title}</h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                {successToast.description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast((prev) => ({ ...prev, show: false }))}
            className="text-slate-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-300 hover:text-white transition flex items-center gap-1.5"
            >
              <span>←</span>
              <span>Dashboard</span>
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Publish Queue & Schedule</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full font-mono">
                  LIVE
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Channel ID: <span className="font-mono text-indigo-400 font-semibold">{channelId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-indigo-950/50 flex items-center gap-1.5"
            >
              <span>✍️</span>
              <span>Create New Post</span>
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-800 text-xs font-semibold pb-2">
          {["queue", "sent", "settings"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl transition capitalize cursor-pointer ${
                activeTab === tab
                  ? "bg-slate-800 text-white border border-slate-700 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab === "queue" ? "📅 Schedule Queue" : tab === "sent" ? "✅ Sent Posts" : "⚙️ Channel Settings"}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "queue" && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-3">
              <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-2xl mx-auto">
                🕒
              </div>
              <h3 className="text-sm font-bold text-white">Queue is Ready for Automation</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Aapka channel link ho chuka hai. Schedule kiye gaye posts yahan timeline ke mutabiq auto-publish honge.
              </p>
              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
                >
                  <span>Schedule First Post</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === "sent" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center text-xs text-slate-400">
            Pichhle publish kiye gaye posts ka archive yahan show hoga.
          </div>
        )}

        {activeTab === "settings" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white">Channel Security & Tokens</h3>
            <p className="text-slate-400">
              Access Token: <span className="font-mono text-emerald-400">Encrypted (AES-256-GCM)</span>
            </p>
            <p className="text-slate-400">
              OAuth Callback: <span className="font-mono text-slate-300">/api/auth/callback/facebook</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
