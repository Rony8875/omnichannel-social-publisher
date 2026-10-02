import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CONFIG_FILE = path.join(process.cwd(), "data", "meta_config.json");

function getConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveConfig(cfg: any) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8");
}

function formatPhone(p: string): string {
  let clean = p.replace(/[^0-9]/g, "");
  if (clean.length === 10 && ["9", "8", "7", "6"].includes(clean[0])) {
    clean = "91" + clean;
  }
  return clean;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipients, message, templateName, languageCode } = body;

    const config = getConfig();

    if (!config.accessToken || !config.phoneNumberId) {
      return NextResponse.json(
        {
          success: false,
          error: "Meta API Credentials missing! Kripya Admin Panel me Meta Access Token aur Phone Number ID save karein.",
        },
        { status: 400 }
      );
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: "Recipients list is required." },
        { status: 400 }
      );
    }

    // Check Meta 24-hour Tier Limit policy
    const tierLimit = config.currentTierLimit || 250;
    if (recipients.length > tierLimit) {
      return NextResponse.json(
        {
          success: false,
          error: `Meta Policy Restriction: Aapka current Meta Tier limit ${tierLimit} conversations/24h hai. Aap ${recipients.length} messages bhej rahe hain. Kripya batch size kam karein ya Meta Business Verification se Tier badhwayein.`,
        },
        { status: 400 }
      );
    }

    const results = [];
    const graphUrl = `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`;

    for (let i = 0; i < recipients.length; i++) {
      const phone = formatPhone(String(recipients[i]));

      let payload: any;
      if (templateName) {
        // Official template message
        payload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phone,
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode || "en_US" },
          },
        };
      } else {
        // Text message
        payload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phone,
          type: "text",
          text: {
            preview_url: false,
            body: message || "Hello from WhatsApp Business",
          },
        };
      }

      try {
        const metaRes = await fetch(graphUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.accessToken}`,
          },
          body: JSON.stringify(payload),
        });

        const metaData = await metaRes.json();

        if (metaRes.ok && metaData.messages && metaData.messages[0]) {
          results.push({
            recipient: phone,
            status: "SUCCESS",
            messageId: metaData.messages[0].id,
            metaContactId: metaData.contacts?.[0]?.wa_id || phone,
          });
        } else {
          const errDetail =
            metaData.error?.message ||
            metaData.error?.error_user_msg ||
            "Meta rejected message";
          results.push({
            recipient: phone,
            status: "FAILED",
            error: errDetail,
          });
        }
      } catch (callErr: any) {
        results.push({
          recipient: phone,
          status: "FAILED",
          error: callErr.message || "Network Error",
        });
      }

      // Small delay between calls
      if (i < recipients.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    const successCount = results.filter((r) => r.status === "SUCCESS").length;

    // Track free tier usage
    config.freeTierUsed = (config.freeTierUsed || 0) + successCount;
    saveConfig(config);

    return NextResponse.json({
      success: true,
      mode: "META_CLOUD_API",
      totalRequested: recipients.length,
      successfulCount: successCount,
      freeTierUsed: config.freeTierUsed,
      freeTierRemaining: Math.max(0, (config.freeTierTotal || 1000) - config.freeTierUsed),
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
