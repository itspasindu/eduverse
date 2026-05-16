import { NextResponse } from "next/server";
import {
  createRouteHandlerClient,
  friendlyAuthMessage,
} from "@/lib/supabase/route-handler";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { detail: "Email and password are required" },
        { status: 400 },
      );
    }

    const supabase = await createRouteHandlerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return NextResponse.json(
        {
          detail: friendlyAuthMessage(
            error?.message ?? "Invalid email or password",
          ),
          code: error?.code,
        },
        { status: 401 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sign-in failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
