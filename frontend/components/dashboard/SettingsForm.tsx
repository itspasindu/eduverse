"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { updateProfile, uploadAvatar } from "@/lib/api";
import { roleLabel, type AppRole } from "@/lib/roles";

type Props = {
  email: string;
  fullName: string;
  role: string;
  avatarUrl: string | null;
};

function initials(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export default function SettingsForm({
  email,
  fullName: initialName,
  role,
  avatarUrl: initialAvatar,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatar);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPickPhoto(file: File) {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadAvatar(file);
      setAvatarUrl(url);
      await updateProfile({ avatar_url: url });
      setMessage("Profile photo updated.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateProfile({ full_name: fullName.trim() });
      setMessage("Profile saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const abbr = initials(fullName, email);
  const appRole = role as AppRole;

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Profile photo
        </h2>
        <div className="mt-4 flex items-center gap-4">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={72}
              height={72}
              className="h-[72px] w-[72px] rounded-full object-cover ring-2 ring-violet-200 dark:ring-violet-900"
              unoptimized
            />
          ) : (
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-xl font-bold text-white ring-2 ring-violet-200 dark:ring-violet-900">
              {abbr}
            </span>
          )}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPickPhoto(file);
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {uploading ? "Uploading…" : "Change photo"}
            </button>
            <p className="mt-2 text-xs text-zinc-400">JPEG, PNG, WebP or GIF · max 2 MB</p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
          <input
            readOnly
            value={email}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Display name
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Your name"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Role
          <input
            readOnly
            value={roleLabel(appRole)}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>

        {message && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </section>

      <p className="text-xs text-zinc-400">
        Role changes are managed by administrators in the Admin Console.
      </p>
    </form>
  );
}
