import { NextResponse } from "next/server";

interface GatewayInstance {
  id: string;
  instanceId: string;
  token: string;
  label?: string;
}

const DEFAULT_INSTANCES: GatewayInstance[] = [
  {
    id: "1",
    instanceId: "instance193220",
    token: "sygiaq50docdokoq",
    label: "Primary Instance 1",
  },
];

function formatPhoneNumber(phone: string): string {
  let clean = phone.replace(/[^0-9]/g, "");
  if (clean.length === 10 && (clean.startsWith("9") || clean.startsWith("8") || clean.startsWith("7") || clean.startsWith("6"))) {
    clean = "91" + clean;
  }
  return "+" + clean;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipients, message, attachment, instances } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: "Kripya kam se kam ek recipient number provide karein." },
        { status: 400 }
      );
    }

    // Active Instances Pool (Provided or default)
    const activeInstances: GatewayInstance[] =
      Array.isArray(instances) && instances.length > 0 ? instances : DEFAULT_INSTANCES;

    const results = [];

    // Loop through recipients and rotate across instances
    for (let i = 0; i < recipients.length; i++) {
      const rawPhone = recipients[i];
      const formattedPhone = formatPhoneNumber(String(rawPhone));

      // Round-Robin selection of instance
      const selectedInstance = activeInstances[i % activeInstances.length];
      const instId = selectedInstance.instanceId.trim();
      const instToken = selectedInstance.token.trim();

      try {
        let endpoint = `https://api.ultramsg.com/${instId}/messages/chat`;
        const params = new URLSearchParams();
        params.append("token", instToken);
        params.append("to", formattedPhone);

        if (attachment && attachment.dataUrl) {
          if (attachment.type === "image") {
            endpoint = `https://api.ultramsg.com/${instId}/messages/image`;
            params.append("image", attachment.dataUrl);
            params.append("caption", message || "");
          } else if (attachment.type === "pdf") {
            endpoint = `https://api.ultramsg.com/${instId}/messages/document`;
            params.append("document", attachment.dataUrl);
            params.append("filename", attachment.name || "document.pdf");
            params.append("caption", message || "");
          } else if (attachment.type === "video") {
            endpoint = `https://api.ultramsg.com/${instId}/messages/video`;
            params.append("video", attachment.dataUrl);
            params.append("caption", message || "");
          }
        } else {
          params.append("body", message || "Hello!");
        }

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });

        const data = await response.json();

        if (data.sent === "true" || data.sent === true || data.id) {
          results.push({
            recipient: formattedPhone,
            status: "SUCCESS",
            messageId: data.id ? `ID-${data.id}` : `SENT-${Date.now()}`,
            routedInstance: selectedInstance.label || instId,
            message: data.message || "Delivered",
          });
        } else {
          results.push({
            recipient: formattedPhone,
            status: "FAILED",
            routedInstance: selectedInstance.label || instId,
            error: data.error || data.message || "Failed to send",
          });
        }
      } catch (err: any) {
        results.push({
          recipient: formattedPhone,
          status: "FAILED",
          routedInstance: selectedInstance.label || instId,
          error: err.message || "Network Error",
        });
      }

      // 600ms delay between dispatches
      if (i < recipients.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }

    const successfulCount = results.filter((r) => r.status === "SUCCESS").length;

    return NextResponse.json({
      success: true,
      totalRequested: recipients.length,
      successfulCount,
      instancesUsed: activeInstances.length,
      results,
    });
  } catch (error: any) {
    console.error("Multi-Instance UltraMsg Dispatch Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
