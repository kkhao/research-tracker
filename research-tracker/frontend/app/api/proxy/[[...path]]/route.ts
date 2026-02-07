/**
 * API proxy: forwards requests to backend to avoid CORS when frontend and backend are on different domains.
 * Set NEXT_PUBLIC_USE_PROXY=true and NEXT_PUBLIC_API_URL=https://backend-domain in Railway Variables.
 */
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  const backendUrl = `${BACKEND.replace(/\/$/, "")}/${path}${url.search}`;
  try {
    const headers = new Headers();
    request.headers.forEach((v, k) => {
      if (
        !["host", "connection", "content-length"].includes(k.toLowerCase())
      ) {
        headers.set(k, v);
      }
    });
    const body = method !== "GET" ? await request.text() : undefined;
    const res = await fetch(backendUrl, {
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
    console.error("[proxy]", backendUrl, e);
    return NextResponse.json(
      { error: "Proxy failed", detail: String(e) },
      { status: 502 }
    );
  }
}
