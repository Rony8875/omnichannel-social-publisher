import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CONFIG_FILE = path.join(process.cwd(), "data", "meta_config.json");

function getConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return {
      accessToken: "",
      phoneNumberId: "",
      wabaId: "",
      freeTierTotal: 1000,
      freeTierUsed: 0,
      currentTierLimit: 250,
      ratePerMessageINR: 0.85,
    };
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveConfig(cfg: any) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8");
}

export async function GET() {
  const cfg = getConfig();
  // Mask access token for safety
  const safeConfig = {
    ...cfg,
    hasToken: Boolean(cfg.accessToken && cfg.accessToken.length > 10),
    maskedToken: cfg.accessToken ? `${cfg.accessToken.slice(0, 6)}...${cfg.accessToken.slice(-4)}` : "",
  };
  return NextResponse.json({ success: true, config: safeConfig });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accessToken, phoneNumberId, wabaId, currentTierLimit } = body;

    const current = getConfig();
    if (accessToken !== undefined) current.accessToken = accessToken.trim();
    if (phoneNumberId !== undefined) current.phoneNumberId = phoneNumberId.trim();
    if (wabaId !== undefined) current.wabaId = wabaId.trim();
    if (currentTierLimit !== undefined) current.currentTierLimit = Number(currentTierLimit);

    saveConfig(current);

    return NextResponse.json({
      success: true,
      message: "Meta Cloud API credentials saved successfully!",
      config: {
        hasToken: Boolean(current.accessToken),
        phoneNumberId: current.phoneNumberId,
        wabaId: current.wabaId,
        currentTierLimit: current.currentTierLimit,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
