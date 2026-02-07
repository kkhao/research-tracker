/**
 * API proxy: forwards requests to backend to avoid CORS when frontend and backend are on different domains.
 * Set NEXT_PUBLIC_USE_PROXY=true and NEXT_PUBLIC_API_URL=https://backend-domain in Railway Variables.
 */
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  return proxy(request, await params, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  return proxy(request, await params, "POST");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  return proxy(request, await params, "PATCH");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  return proxy(request, await params, "DELETE");
}

async function proxy(
  request: NextRequest,
  params: { path?: string[] },
  method: string
) {
  const path = params.path?.join("/") || "";
  const url = new URL(request.url);
  const backend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const base = backend.replace(/\/$/, "");
  const targetUrl = path ? `${base}/${path}${url.search}` : `${base}${url.search}`;

  if (!process.env.BACKEND_URL && !process.env.NEXT_PUBLIC_API_URL && backend.includes("localhost")) {
    console.warn("[proxy] BACKEND_URL and NEXT_PUBLIC_API_URL not set; using localhost. Set them in Railway Variables for production.");
  }

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "ResearchTracker-Proxy/1.0",
    };
    if (method !== "GET") {
      const ct = request.headers.get("Content-Type");
      if (ct) headers["Content-Type"] = ct;
    }
    const body = method !== "GET" ? await request.text() : undefined;
    const res = await fetch(targetUrl, {
      method,
      headers,
      body: body || undefined,
      signal: AbortSignal.timeout(90000),
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      statusText: res.statusText,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (e) {
    console.error("[proxy]", targetUrl, e);
    const hint =
      !backend || backend.includes("localhost")
        ? "Set BACKEND_URL and NEXT_PUBLIC_API_URL in Railway frontend Variables to your backend URL (e.g. https://xxx.up.railway.app)."
        : "Backend unreachable. Check BACKEND_URL and that the backend service is running.";
    return NextResponse.json(
      { error: "Proxy failed", detail: String(e), hint },
      { status: 502 }
    );
  }
}
