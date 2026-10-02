import { NextResponse, NextRequest } from "next/server";

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  const resolvedParams = await Promise.resolve(context.params);
  const pathSegments = resolvedParams?.path || [];
  const endpoint = pathSegments.join("/");

  const { searchParams } = new URL(request.url);
  const engineUrlParam = searchParams.get("engineUrl");
  const targetEngine =
    engineUrlParam || process.env.NEXT_PUBLIC_ENGINE_URL || "http://localhost:5001";

  // Build target query string without engineUrl
  const forwardParams = new URLSearchParams();
  searchParams.forEach((val, key) => {
    if (key !== "engineUrl") {
      forwardParams.append(key, val);
    }
  });
  const queryString = forwardParams.toString() ? `?${forwardParams.toString()}` : "";
  const targetUrl = `${targetEngine.replace(/\/$/, "")}/api/${endpoint}${queryString}`;

  const headers: Record<string, string> = {
    "Bypass-Tunnel-Reminder": "true",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  };

  const method = request.method;
  let body: any = undefined;
  if (method !== "GET" && method !== "HEAD") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        body = JSON.stringify(await request.json());
        headers["Content-Type"] = "application/json";
      } catch (e) {
        // empty body or invalid json
      }
    }
  }

  try {
    const res = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } else {
      const text = await res.text();
      return new NextResponse(text, {
        status: res.status,
        headers: { "Content-Type": contentType || "text/plain" },
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: `Could not connect to WhatsApp Engine at ${targetEngine}: ${err.message}`,
        sessions: [],
      },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: any) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: any) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: any) {
  return proxyRequest(request, context);
}
