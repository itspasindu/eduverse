import { NextResponse } from "next/server";
import { isAllowedImageUrl } from "@/lib/presentation-download";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ detail: "Missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ detail: "Invalid url" }, { status: 400 });
  }

  if (target.protocol !== "https:" || !isAllowedImageUrl(raw)) {
    return NextResponse.json({ detail: "URL not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: { Accept: "image/*" },
      next: { revalidate: 3600 },
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { detail: "Upstream fetch failed" },
        { status: 502 },
      );
    }

    const contentType =
      upstream.headers.get("content-type") ?? "image/jpeg";
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ detail: "Fetch error" }, { status: 502 });
  }
}
