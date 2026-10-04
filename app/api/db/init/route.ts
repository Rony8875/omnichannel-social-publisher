import { NextResponse } from "next/server";
import {
  getBigQueryClient,
  initializeBigQuerySchema,
  uploadRowsToBigQuery,
  DATASET_ID,
} from "@/lib/bigquery";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const bq = getBigQueryClient();
    if (!bq) {
      return NextResponse.json({
        success: false,
        connected: false,
        error:
          "Google BigQuery configured nahi hai. Kripya .env.local me credentials check karein.",
      });
    }

    const dataset = bq.dataset(DATASET_ID);
    const [datasetExists] = await dataset.exists();

    if (!datasetExists) {
      return NextResponse.json({
        success: true,
        connected: true,
        projectId: bq.projectId,
        dataset: DATASET_ID,
        datasetExists: false,
        stats: { accounts: 0, posts: 0, templates: 0 },
      });
    }

    // Get row counts safely
    let accountsCount = 0;
    let postsCount = 0;
    let templatesCount = 0;

    try {
      const [accRows] = await dataset.table("social_accounts").getRows({ maxResults: 100 });
      accountsCount = accRows.length;
    } catch {}

    try {
      const [postRows] = await dataset.table("social_posts").getRows({ maxResults: 500 });
      postsCount = postRows.length;
    } catch {}

    try {
      const [tmplRows] = await dataset.table("templates").getRows({ maxResults: 100 });
      templatesCount = tmplRows.length;
    } catch {}

    return NextResponse.json({
      success: true,
      connected: true,
      projectId: bq.projectId,
      dataset: DATASET_ID,
      datasetExists: true,
      stats: {
        accounts: accountsCount,
        posts: postsCount,
        templates: templatesCount,
      },
      lastChecked: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      connected: false,
      error: error.message || "BigQuery connection failed",
    });
  }
}

export async function POST() {
  try {
    const bq = getBigQueryClient();
    if (!bq) {
      return NextResponse.json(
        {
          success: false,
          error: "Google BigQuery client not initialized. Check your credentials.",
        },
        { status: 400 }
      );
    }

    // 1. Initialize dataset and tables if missing
    await initializeBigQuerySchema();

    const dataDir = path.join(process.cwd(), "data");
    let syncedAccounts = 0;
    let syncedPosts = 0;
    let syncedTemplates = 0;

    // 2. Sync Social Accounts
    const accountsFile = path.join(dataDir, "social_accounts.json");
    if (fs.existsSync(accountsFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(accountsFile, "utf-8"));
        const accounts = raw.accounts || [];
        if (accounts.length > 0) {
          const formatted = accounts.map((a: any) => ({
            id: a.id,
            platform: a.platform || a.id,
            name: a.name || null,
            handle: a.handle || null,
            connected: !!a.connected,
            icon: a.icon || null,
            pageId: a.pageId || null,
            accountId: a.accountId || null,
            orgId: a.orgId || null,
            channelId: a.channelId || null,
            token: a.token || null,
            apiKey: a.apiKey || null,
            botToken: a.botToken || null,
            updated_at: new Date().toISOString(),
          }));
          await uploadRowsToBigQuery("social_accounts", formatted, true);
          syncedAccounts = formatted.length;
        }
      } catch (e: any) {
        console.warn("Accounts sync notice:", e.message);
      }
    }

    // 3. Sync Social Posts
    const postsFile = path.join(dataDir, "social_posts.json");
    if (fs.existsSync(postsFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(postsFile, "utf-8"));
        const posts = raw.posts || [];
        if (posts.length > 0) {
          const formatted = posts.map((p: any) => ({
            id: p.id,
            caption: p.caption || "",
            mediaUrl: p.mediaUrl || null,
            mediaType: p.mediaType || "text",
            platforms: p.platforms || [],
            status: p.status || "Published",
            createdAt: p.createdAt || new Date().toISOString(),
            scheduledTime: p.scheduledTime || null,
            author: p.author || "Admin",
            platformSchedules: p.platformSchedules
              ? JSON.stringify(p.platformSchedules)
              : null,
          }));
          await uploadRowsToBigQuery("social_posts", formatted, true);
          syncedPosts = formatted.length;
        }
      } catch (e: any) {
        console.warn("Posts sync notice:", e.message);
      }
    }

    // 4. Sync Templates
    const templatesFile = path.join(dataDir, "templates.json");
    if (fs.existsSync(templatesFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(templatesFile, "utf-8"));
        const templates = Array.isArray(raw) ? raw : raw.templates || [];
        if (templates.length > 0) {
          const formatted = templates.map((t: any) => ({
            id: t.id,
            title: t.name || t.title || "Template",
            category: t.category || "General",
            text: t.message || t.text || "",
            platforms: t.columns || t.platforms || [],
            created_at: new Date().toISOString(),
          }));
          await uploadRowsToBigQuery("templates", formatted, true);
          syncedTemplates = formatted.length;
        }
      } catch (e: any) {
        console.warn("Templates sync notice:", e.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Google BigQuery Cloud Database successfully synchronized!",
      stats: {
        syncedAccounts,
        syncedPosts,
        syncedTemplates,
      },
      projectId: bq.projectId,
      dataset: DATASET_ID,
      syncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("BigQuery Sync Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to sync with BigQuery" },
      { status: 500 }
    );
  }
}
