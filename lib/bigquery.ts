import { BigQuery } from "@google-cloud/bigquery";
import fs from "fs";
import path from "path";

// Dataset Name
export const DATASET_ID = process.env.BIGQUERY_DATASET || "social_publisher";

export const DEFAULT_PLATFORMS = [
  {
    id: "facebook",
    platform: "Facebook",
    name: "Facebook Business Page",
    handle: "",
    connected: false,
    icon: "facebook",
    pageId: "",
    token: "",
  },
  {
    id: "instagram",
    platform: "Instagram",
    name: "Instagram Business",
    handle: "",
    connected: false,
    icon: "instagram",
    accountId: "",
    token: "",
  },
  {
    id: "linkedin",
    platform: "LinkedIn",
    name: "LinkedIn Company Page",
    handle: "",
    connected: false,
    icon: "linkedin",
    orgId: "",
    token: "",
  },
  {
    id: "twitter",
    platform: "X / Twitter",
    name: "X (Twitter) Profile",
    handle: "",
    connected: false,
    icon: "twitter",
    apiKey: "",
  },
  {
    id: "whatsapp",
    platform: "WhatsApp",
    name: "WhatsApp Status & Broadcast",
    handle: "",
    connected: false,
    icon: "whatsapp",
  },
  {
    id: "telegram",
    platform: "Telegram",
    name: "Telegram Announcement Channel",
    handle: "",
    connected: false,
    icon: "telegram",
    channelId: "",
    botToken: "",
  },
];

// Singleton BigQuery Client
let bigqueryInstance: BigQuery | null = null;

export function getBigQueryClient(): BigQuery | null {
  if (bigqueryInstance) return bigqueryInstance;

  const projectId =
    process.env.BIGQUERY_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID;

  // 1. Direct JSON Credentials in env var (Best for Cloud/Production)
  if (process.env.BIGQUERY_CREDENTIALS_JSON) {
    try {
      const credentials = JSON.parse(process.env.BIGQUERY_CREDENTIALS_JSON);
      bigqueryInstance = new BigQuery({
        projectId: projectId || credentials.project_id,
        credentials,
      });
      return bigqueryInstance;
    } catch (e) {
      console.error("Failed to parse BIGQUERY_CREDENTIALS_JSON:", e);
    }
  }

  // 2. Service Account Key File Path
  const keyFilePath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.BIGQUERY_KEY_FILE ||
    path.join(process.cwd(), "credentials", "bigquery-sa-key.json");

  if (fs.existsSync(/*turbopackIgnore: true*/ keyFilePath)) {
    try {
      bigqueryInstance = new BigQuery({
        projectId,
        keyFilename: keyFilePath,
      });
      return bigqueryInstance;
    } catch (e) {
      console.error("Failed to initialize BigQuery with key file:", e);
    }
  }

  // 3. Fallback to default Google Cloud SDK auth if projectId is provided
  if (projectId) {
    try {
      bigqueryInstance = new BigQuery({ projectId });
      return bigqueryInstance;
    } catch (e) {
      console.error("Failed to initialize BigQuery with default auth:", e);
    }
  }

  return null;
}

/**
 * Initialize Dataset and Tables in Google BigQuery
 */
export async function initializeBigQuerySchema() {
  const bq = getBigQueryClient();
  if (!bq) {
    throw new Error(
      "BigQuery client not configured. Kripya .env me BIGQUERY_PROJECT_ID aur credentials set karein."
    );
  }

  // 1. Create Dataset if not exists
  const [datasets] = await bq.getDatasets();
  const datasetExists = datasets.some((d) => d.id === DATASET_ID);

  if (!datasetExists) {
    console.log(`Creating BigQuery Dataset: ${DATASET_ID}`);
    await bq.createDataset(DATASET_ID, {
      location: process.env.BIGQUERY_LOCATION || "US",
    });
  }

  const dataset = bq.dataset(DATASET_ID);

  // 2. Define Table Schemas with Multi-Tenant userId
  const tables = [
    {
      id: "social_accounts",
      schema: [
        { name: "userId", type: "STRING", mode: "REQUIRED" },
        { name: "id", type: "STRING", mode: "REQUIRED" },
        { name: "platform", type: "STRING", mode: "REQUIRED" },
        { name: "name", type: "STRING", mode: "NULLABLE" },
        { name: "handle", type: "STRING", mode: "NULLABLE" },
        { name: "connected", type: "BOOLEAN", mode: "NULLABLE" },
        { name: "icon", type: "STRING", mode: "NULLABLE" },
        { name: "pageId", type: "STRING", mode: "NULLABLE" },
        { name: "accountId", type: "STRING", mode: "NULLABLE" },
        { name: "orgId", type: "STRING", mode: "NULLABLE" },
        { name: "channelId", type: "STRING", mode: "NULLABLE" },
        { name: "token", type: "STRING", mode: "NULLABLE" },
        { name: "apiKey", type: "STRING", mode: "NULLABLE" },
        { name: "botToken", type: "STRING", mode: "NULLABLE" },
        { name: "updated_at", type: "TIMESTAMP", mode: "NULLABLE" },
      ],
    },
    {
      id: "social_posts",
      schema: [
        { name: "id", type: "STRING", mode: "REQUIRED" },
        { name: "userId", type: "STRING", mode: "NULLABLE" },
        { name: "author", type: "STRING", mode: "NULLABLE" },
        { name: "caption", type: "STRING", mode: "NULLABLE" },
        { name: "mediaUrl", type: "STRING", mode: "NULLABLE" },
        { name: "mediaType", type: "STRING", mode: "NULLABLE" },
        { name: "platforms", type: "STRING", mode: "REPEATED" },
        { name: "status", type: "STRING", mode: "NULLABLE" },
        { name: "createdAt", type: "TIMESTAMP", mode: "NULLABLE" },
        { name: "scheduledTime", type: "TIMESTAMP", mode: "NULLABLE" },
        { name: "platformSchedules", type: "STRING", mode: "NULLABLE" },
      ],
    },
    {
      id: "post_delivery_logs",
      schema: [
        { name: "logId", type: "STRING", mode: "REQUIRED" },
        { name: "postId", type: "STRING", mode: "REQUIRED" },
        { name: "userId", type: "STRING", mode: "NULLABLE" },
        { name: "platform", type: "STRING", mode: "REQUIRED" },
        { name: "platformName", type: "STRING", mode: "NULLABLE" },
        { name: "handle", type: "STRING", mode: "NULLABLE" },
        { name: "status", type: "STRING", mode: "REQUIRED" },
        { name: "platformPostId", type: "STRING", mode: "NULLABLE" },
        { name: "error", type: "STRING", mode: "NULLABLE" },
        { name: "publishedAt", type: "TIMESTAMP", mode: "NULLABLE" },
      ],
    },
    {
      id: "templates",
      schema: [
        { name: "id", type: "STRING", mode: "REQUIRED" },
        { name: "userId", type: "STRING", mode: "NULLABLE" },
        { name: "title", type: "STRING", mode: "REQUIRED" },
        { name: "category", type: "STRING", mode: "NULLABLE" },
        { name: "text", type: "STRING", mode: "REQUIRED" },
        { name: "platforms", type: "STRING", mode: "REPEATED" },
        { name: "created_at", type: "TIMESTAMP", mode: "NULLABLE" },
      ],
    },
    {
      id: "users",
      schema: [
        { name: "id", type: "STRING", mode: "REQUIRED" },
        { name: "username", type: "STRING", mode: "REQUIRED" },
        { name: "password", type: "STRING", mode: "REQUIRED" },
        { name: "name", type: "STRING", mode: "NULLABLE" },
        { name: "role", type: "STRING", mode: "NULLABLE" },
        { name: "created_at", type: "TIMESTAMP", mode: "NULLABLE" },
      ],
    },
  ];

  const [existingTables] = await dataset.getTables();
  const existingTableIds = new Set(existingTables.map((t) => t.id));

  for (const tableDef of tables) {
    if (!existingTableIds.has(tableDef.id)) {
      console.log(`Creating BigQuery Table: ${DATASET_ID}.${tableDef.id}`);
      await dataset.createTable(tableDef.id, {
        schema: tableDef.schema,
      });
    } else {
      console.log(`Table already exists: ${DATASET_ID}.${tableDef.id}`);
    }
  }

  return { success: true, dataset: DATASET_ID, tables: tables.map((t) => t.id) };
}

/**
 * Upload / Append rows to BigQuery table using Batch Load Jobs.
 * Works 100% FREE in BigQuery Sandbox without ANY billing or credit card!
 */
export async function uploadRowsToBigQuery(
  tableName: string,
  rows: any[],
  truncate: boolean = false
): Promise<boolean> {
  const bq = getBigQueryClient();
  if (!bq || !rows || rows.length === 0) return false;

  try {
    const dataset = bq.dataset(DATASET_ID);
    const table = dataset.table(tableName);

    const ndjson = rows.map((r) => JSON.stringify(r)).join("\n");
    const tempFile = path.join(
      process.cwd(),
      `temp_${tableName}_${Date.now()}.ndjson`
    );

    fs.writeFileSync(tempFile, ndjson + "\n", "utf-8");

    await table.load(tempFile, {
      sourceFormat: "NEWLINE_DELIMITED_JSON",
      writeDisposition: truncate ? "WRITE_TRUNCATE" : "WRITE_APPEND",
    });

    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    return true;
  } catch (err: any) {
    console.error(`BigQuery batch upload error on ${tableName}:`, err.message);
    return false;
  }
}

/**
 * Fetch Social Accounts for a SPECIFIC USER
 * Only the owner user can access their own accounts.
 */
export async function fetchUserSocialAccounts(userId: string) {
  const cleanUserId = userId || "admin_1";

  // 1. Try fetching from BigQuery
  const bq = getBigQueryClient();
  if (bq) {
    try {
      const dataset = bq.dataset(DATASET_ID);
      const table = dataset.table("social_accounts");
      const [allRows] = await table.getRows();
      const userRows = (allRows || []).filter(
        (r: any) => r.userId === cleanUserId
      );

      if (userRows.length > 0) {
        return userRows;
      }
    } catch (e: any) {
      console.warn("BigQuery user accounts fetch notice:", e.message);
    }
  }

  // 2. Fallback to local JSON
  const localFile = path.join(process.cwd(), "data", "social_accounts.json");
  let localAccounts: any[] = [];
  if (fs.existsSync(localFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(localFile, "utf-8"));
      localAccounts = raw.accounts || [];
      const userLocal = localAccounts.filter(
        (a: any) => (a.userId || "admin_1") === cleanUserId
      );
      if (userLocal.length > 0) return userLocal;
    } catch {}
  }

  // 3. If user has no accounts yet, generate fresh clean default platforms for this user
  const initialUserAccounts = DEFAULT_PLATFORMS.map((p) => ({
    ...p,
    userId: cleanUserId,
  }));

  // Save to local & BigQuery
  await saveUserSocialAccounts(cleanUserId, initialUserAccounts);
  return initialUserAccounts;
}

/**
 * Save / Update Social Accounts for a SPECIFIC USER
 */
export async function saveUserSocialAccounts(userId: string, userAccounts: any[]) {
  const cleanUserId = userId || "admin_1";
  const localFile = path.join(process.cwd(), "data", "social_accounts.json");

  // Read existing accounts for all other users
  let allAccounts: any[] = [];
  if (fs.existsSync(localFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(localFile, "utf-8"));
      allAccounts = raw.accounts || [];
    } catch {}
  }

  // Replace or add accounts for this specific user
  const otherUsersAccounts = allAccounts.filter(
    (a: any) => (a.userId || "admin_1") !== cleanUserId
  );
  const formattedUserAccounts = userAccounts.map((a: any) => ({
    ...a,
    userId: cleanUserId,
    updated_at: new Date().toISOString(),
  }));

  const updatedAll = [...otherUsersAccounts, ...formattedUserAccounts];
  fs.writeFileSync(
    localFile,
    JSON.stringify({ accounts: updatedAll }, null, 2),
    "utf-8"
  );

  // Sync to BigQuery (Replace all accounts table with full updated multi-tenant accounts)
  const bqFormatted = updatedAll.map((a: any) => ({
    userId: a.userId || "admin_1",
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

  uploadRowsToBigQuery("social_accounts", bqFormatted, true).catch(() => {});
  return formattedUserAccounts;
}

/**
 * Fetch Social Posts for a SPECIFIC USER
 */
export async function fetchUserSocialPosts(userId: string) {
  const cleanUserId = userId || "admin_1";

  // Try BigQuery first
  const bq = getBigQueryClient();
  if (bq) {
    try {
      const dataset = bq.dataset(DATASET_ID);
      const table = dataset.table("social_posts");
      const [allPosts] = await table.getRows();
      if (allPosts && allPosts.length > 0) {
        return allPosts.filter(
          (p: any) => (p.userId || "admin_1") === cleanUserId
        );
      }
    } catch (e: any) {
      console.warn("BigQuery posts fetch notice:", e.message);
    }
  }

  // Local fallback
  const postsFile = path.join(process.cwd(), "data", "social_posts.json");
  if (fs.existsSync(postsFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(postsFile, "utf-8"));
      const posts = raw.posts || [];
      return posts.filter(
        (p: any) => (p.userId || "admin_1") === cleanUserId
      );
    } catch {}
  }

  return [];
}
