"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchCharacters,
  fetchMaterials,
  getLessonVideoJob,
  savePost,
  startLessonVideo,
  uploadMaterial,
  type LessonCharacter,
  type LessonMaterial,
  type LessonVideoJob,
  isLessonAudioOnlyUrl,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

function LessonVideoPlayer({
  jobId,
  url,
  poster,
}: {
  jobId: string;
  url: string;
  poster?: string | null;
}) {
  const needsAuthFetch =
    url.includes("/lesson-video/") &&
    (url.includes("/file") || url.includes("/scenes/"));

  const [src, setSrc] = useState<string | null>(needsAuthFetch ? null : url);
  const [loading, setLoading] = useState(needsAuthFetch);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!needsAuthFetch) {
      setSrc(url);
      setLoading(false);
      setLoadError(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError(null);
      setSrc(null);

      const token = await getAccessToken();
      if (!token) {
        if (!cancelled) {
          setLoadError("Sign in again to play this video.");
          setLoading(false);
        }
        return;
      }

      const path = url.includes("/scenes/")
        ? `/api/lesson-video/${jobId}/scenes/0/file`
        : `/api/lesson-video/${jobId}/file`;

      try {
        const res = await fetch(path, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          // #region agent log
          fetch("http://127.0.0.1:7574/ingest/3c6afa58-30ac-4e5e-9854-7a3b8425de96", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "ba63c3",
            },
            body: JSON.stringify({
              sessionId: "ba63c3",
              location: "LessonStudio.tsx:LessonVideoPlayer",
              message: "video fetch failed",
              data: { jobId, path, status: res.status, detail: detail.slice(0, 120) },
              timestamp: Date.now(),
              hypothesisId: "H3-H4",
            }),
          }).catch(() => {});
          // #endregion
          if (!cancelled) {
            setLoadError(
              detail.includes("not ready")
                ? "Video file is still processing. Wait a moment and refresh."
                : `Could not load video (${res.status}).`,
            );
            setLoading(false);
          }
          return;
        }
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setLoadError("Cannot reach the server. Is the backend running?");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [jobId, url, needsAuthFetch]);

  if (loading) {
    return (
      <p className="rounded-lg bg-zinc-900 px-4 py-8 text-center text-sm text-zinc-400">
        Loading lesson video…
      </p>
    );
  }

  if (loadError) {
    return (
      <p className="text-sm text-amber-700 dark:text-amber-300">{loadError}</p>
    );
  }

  if (!src) {
    return null;
  }

  return (
    <video
      src={src}
      poster={poster ?? undefined}
      controls
      playsInline
      preload="metadata"
      className="w-full rounded-lg bg-zinc-900"
    />
  );
}

export default function LessonStudio() {
  const [materials, setMaterials] = useState<LessonMaterial[]>([]);
  const [characters, setCharacters] = useState<LessonCharacter[]>([]);
  const [materialId, setMaterialId] = useState("");
  const [characterId, setCharacterId] = useState("");
  const [job, setJob] = useState<LessonVideoJob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, c] = await Promise.all([fetchMaterials(), fetchCharacters()]);
      setMaterials(m);
      setCharacters(c);
      if (m.length && !materialId) setMaterialId(m[0].id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      setError(msg === "Failed to fetch" ? "Cannot reach the server. Is the backend running?" : msg);
    }
  }, [materialId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return;
    const t = setInterval(async () => {
      try {
        const updated = await getLessonVideoJob(job.job_id);
        setJob(updated);
      } catch {
        /* ignore poll errors */
      }
    }, 3000);
    return () => clearInterval(t);
  }, [job]);

  async function onUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const m = await uploadMaterial(file);
      setMaterials((prev) => [m, ...prev]);
      setMaterialId(m.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg === "Failed to fetch" ? "Cannot reach the server. Is the backend running?" : msg);
    } finally {
      setUploading(false);
    }
  }

  async function onGenerate() {
    if (!materialId) return;
    setGenerating(true);
    setError(null);
    setSaved(false);
    try {
      const started = await startLessonVideo(materialId, characterId || null);
      setJob(started);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  const lessonVideoUrl = job?.playlist_url ?? null;
  const isAudioOnly = isLessonAudioOnlyUrl(lessonVideoUrl);
  const coverImage = job?.cover_image_url ?? null;

  useEffect(() => {
    if (job?.status !== "completed") return;
    // #region agent log
    fetch("http://127.0.0.1:7574/ingest/3c6afa58-30ac-4e5e-9854-7a3b8425de96", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "ba63c3",
      },
      body: JSON.stringify({
        sessionId: "ba63c3",
        location: "LessonStudio.tsx:jobCompleted",
        message: "lesson job completed",
        data: {
          jobId: job.job_id,
          playlist_url: lessonVideoUrl,
          isAudioOnly,
          video_mode: job.video_mode,
          has_cover: Boolean(coverImage),
        },
        timestamp: Date.now(),
        hypothesisId: "H2-H4",
      }),
    }).catch(() => {});
    // #endregion
  }, [job?.status, job?.job_id, job?.video_mode, lessonVideoUrl, isAudioOnly, coverImage]);

  async function onSaveToLibrary() {
    if (!lessonVideoUrl || isAudioOnly) return;
    try {
      await savePost(lessonVideoUrl, job?.title || "Lesson video", "video");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="rounded-2xl border border-indigo-500/20 bg-white/90 p-6 dark:bg-zinc-900/90">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Upload material</h2>
        <p className="mt-1 text-sm text-zinc-500">
          PDF, .txt, .md, or images. Text is read automatically for lesson scripts.
        </p>
        <input
          type="file"
          accept=".pdf,.txt,.md,.markdown,.csv,.json,text/*,image/*"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
          }}
          className="mt-3 block w-full text-sm"
        />
      </section>

      <section className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-700">
        <label className="block text-sm font-medium">Material</label>
        <select
          value={materialId}
          onChange={(e) => setMaterialId(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-zinc-800"
        >
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.filename}
              {m.extracted_text
                ? ` ✓ (${Math.min(m.extracted_text.length, 9999)} chars)`
                : " (no text yet — re-upload or pick another)"}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-sm font-medium">Character (optional)</label>
        <select
          value={characterId}
          onChange={(e) => setCharacterId(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-zinc-800"
        >
          <option value="">No character</option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onGenerate}
          disabled={generating || !materialId}
          className="mt-4 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {generating ? "Starting…" : "Generate lesson video (1–2 min)"}
        </button>
      </section>

      {job && (
        <section className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-700">
          <p className="text-sm font-medium">
            Status: {job.status} · {job.progress}%
          </p>
          {job.phase && job.status === "processing" && (
            <p className="mt-1 text-sm text-zinc-500">{job.phase}</p>
          )}
          {job.status === "processing" && (
            <p className="mt-2 text-xs text-zinc-400">
              Animating your character with AI motion, then merging the full voiceover (about
              3–5 minutes). Requires ffmpeg on the server.
            </p>
          )}
          {job.error && <p className="mt-1 text-sm text-red-600">{job.error}</p>}
          {job.title && (
            <h3 className="mt-2 text-lg font-semibold">{job.title}</h3>
          )}

          {job.status === "completed" && lessonVideoUrl && !isAudioOnly && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                Your lesson video
                {job.video_mode === "animated"
                  ? " (AI animated)"
                  : job.video_mode === "still"
                    ? " (still image — animation was unavailable)"
                    : ""}
              </p>
              <LessonVideoPlayer
                jobId={job.job_id}
                url={lessonVideoUrl}
                poster={coverImage}
              />
            </div>
          )}

          {job.status === "completed" && isAudioOnly && lessonVideoUrl && (
            <div className="mt-4 space-y-3">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Voice only — restart the backend after{" "}
                <code className="text-[11px]">pip install imageio-ffmpeg</code>, then generate
                again for a full video.
              </p>
              {coverImage && (
                <img
                  src={coverImage}
                  alt={job.title || "Lesson artwork"}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700"
                />
              )}
              <audio src={lessonVideoUrl} controls className="w-full" />
            </div>
          )}

          {job.scenes && job.scenes.length > 0 && (
            <div className="mt-6 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Lesson outline
              </p>
              {job.scenes.map((scene, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-700"
                >
                  <p className="font-medium">{scene.title}</p>
                  {scene.narration && (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {scene.narration}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {job.status === "completed" && lessonVideoUrl && !isAudioOnly && (
            <button
              type="button"
              onClick={onSaveToLibrary}
              className="mt-4 text-sm text-indigo-600 hover:underline"
            >
              {saved ? "Saved to library" : "Save lesson to library"}
            </button>
          )}
        </section>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
