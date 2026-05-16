import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getSupabaseUrl } from "@/lib/supabase/env";
import { NextResponse } from "next/server";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ detail: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { detail: "Use JPEG, PNG, WebP, or GIF" },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ detail: "Max file size is 2 MB" }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { detail: "Server storage not configured" },
      { status: 500 },
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const admin = createClient(getSupabaseUrl(), serviceKey);

  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      {
        detail:
          uploadError.message.includes("Bucket not found")
            ? "Avatars bucket missing. Run supabase/migrations/006_avatars_storage.sql"
            : uploadError.message,
      },
      { status: 500 },
    );
  }

  const { data: publicUrl } = admin.storage.from("avatars").getPublicUrl(path);

  return NextResponse.json({ url: publicUrl.publicUrl });
}
