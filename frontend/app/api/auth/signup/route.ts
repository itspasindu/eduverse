import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigError } from "@/lib/supabase/env";
import {
  createRouteHandlerClient,
  friendlyAuthMessage,
} from "@/lib/supabase/route-handler";

export async function POST(request: Request) {
  const ip = clientIp(request);

  if (!checkRateLimit(`signup:${ip}`, 10, 60_000)) {
    return NextResponse.json(
      { detail: "Too many signup attempts. Try again later." },
      { status: 429 },
    );
  }

  try {
    const configErr = supabaseConfigError();
    if (configErr) {
      return NextResponse.json({ detail: configErr }, { status: 500 });
    }

    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.full_name ?? "").trim();
    const role = body.role === "creator" ? "creator" : "student";

    if (!email || !password) {
      return NextResponse.json(
        { detail: "Email and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { detail: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const supabase = await createRouteHandlerClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });

    if (error) {
      return NextResponse.json(
        { detail: friendlyAuthMessage(error.message), code: error.code },
        { status: 400 },
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { detail: "Registration failed. Check Supabase Auth settings." },
        { status: 400 },
      );
    }

    if (data.session) {
      return NextResponse.json({ ok: true });
    }

    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          detail:
            "Account created. Check your email to confirm your address, then sign in.",
          needs_confirmation: true,
        },
        { status: 400 },
      );
    }

    // Development only: auto-confirm via service role when email confirmation is enabled
    try {
      const admin = createAdminClient();
      await admin.auth.admin.updateUserById(data.user.id, {
        email_confirm: true,
      });

      const { data: signIn, error: signInError } =
        await admin.auth.signInWithPassword({ email, password });

      if (signInError || !signIn.session) {
        return NextResponse.json(
          {
            detail:
              "Account created. Check your email to confirm, then sign in.",
            needs_confirmation: true,
          },
          { status: 400 },
        );
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: signIn.session.access_token,
        refresh_token: signIn.session.refresh_token,
      });

      if (sessionError) {
        return NextResponse.json(
          { detail: friendlyAuthMessage(sessionError.message) },
          { status: 400 },
        );
      }

      return NextResponse.json({ ok: true });
    } catch (adminErr) {
      const msg =
        adminErr instanceof Error ? adminErr.message : "Confirmation failed";
      if (msg.includes("SUPABASE_SERVICE_ROLE_KEY")) {
        return NextResponse.json(
          {
            detail:
              "Account may be created but SUPABASE_SERVICE_ROLE_KEY is missing in .env.local. Add it from Supabase → API → service_role, or disable email confirmation in Auth settings.",
          },
          { status: 500 },
        );
      }
      return NextResponse.json(
        {
          detail:
            "Account created. Please sign in with your email and password.",
          needs_confirmation: true,
        },
        { status: 400 },
      );
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
