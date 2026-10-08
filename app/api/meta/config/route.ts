import { NextResponse } from "next/server";
import { fetchUserMetaConfig, saveUserMetaConfig } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "admin_1";

    const cfg = await fetchUserMetaConfig(userId);

    // Mask access token for safety
    const safeConfig = {
      ...cfg,
      hasToken: Boolean(cfg.accessToken && cfg.accessToken.length > 10),
      maskedToken: cfg.accessToken ? `${cfg.accessToken.slice(0, 6)}...${cfg.accessToken.slice(-4)}` : "",
    };

    return NextResponse.json({ success: true, config: safeConfig, userId });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId = "admin_1",
      accessToken,
      phoneNumberId,
      wabaId,
      currentTierLimit,
    } = body;

    const current = await fetchUserMetaConfig(userId);

    const tokenToSave = accessToken !== undefined ? accessToken.trim() : current.accessToken;
    const phoneIdToSave = phoneNumberId !== undefined ? phoneNumberId.trim() : current.phoneNumberId;
    const wabaIdToSave = wabaId !== undefined ? wabaId.trim() : current.wabaId;
    const tierLimitToSave = currentTierLimit !== undefined ? Number(currentTierLimit) : current.currentTierLimit;

    // Direct Live Verification with Meta Graph API if token and phone ID are provided
    let verifiedName = "";
    let displayPhone = "";

    if (tokenToSave && phoneIdToSave) {
      try {
        const verifyRes = await fetch(
          `https://graph.facebook.com/v19.0/${encodeURIComponent(phoneIdToSave)}?fields=id,verified_name,display_phone_number,quality_rating&access_token=${encodeURIComponent(tokenToSave)}`
        );
        const verifyData = await verifyRes.json();

        if (verifyData.error) {
          return NextResponse.json(
            {
              success: false,
              error: `Meta Cloud API Verification Failed: ${verifyData.error.message} (Code: ${verifyData.error.code})`,
            },
            { status: 400 }
          );
        }

        verifiedName = verifyData.verified_name || "";
        displayPhone = verifyData.display_phone_number || "";
      } catch (err: any) {
        return NextResponse.json(
          {
            success: false,
            error: `Meta Cloud API Network Error: ${err.message}`,
          },
          { status: 500 }
        );
      }
    }

    const updatedConfig = {
      ...current,
      accessToken: tokenToSave,
      phoneNumberId: phoneIdToSave,
      wabaId: wabaIdToSave,
      currentTierLimit: tierLimitToSave,
      verifiedName,
      displayPhone,
      verifiedAt: new Date().toISOString(),
    };

    // Save strictly for this user in Supabase
    await saveUserMetaConfig(userId, updatedConfig);

    return NextResponse.json({
      success: true,
      message: verifiedName
        ? `🎉 Meta Cloud API Verified! Registered as '${verifiedName}' (${displayPhone}) & saved to Supabase!`
        : "Meta Cloud API credentials saved to Supabase successfully!",
      config: {
        hasToken: Boolean(tokenToSave),
        phoneNumberId: phoneIdToSave,
        wabaId: wabaIdToSave,
        currentTierLimit: tierLimitToSave,
        verifiedName,
        displayPhone,
      },
      userId,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
