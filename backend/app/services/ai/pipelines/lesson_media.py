"""Download fal assets and mux silent video + TTS into one MP4 (requires ffmpeg)."""

from __future__ import annotations

import asyncio
import logging
import shutil
import subprocess
from pathlib import Path

import httpx

from app.config import Settings

logger = logging.getLogger(__name__)


def ffmpeg_executable() -> str | None:
    path = shutil.which("ffmpeg")
    if path:
        return path
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def ffmpeg_available() -> bool:
    return ffmpeg_executable() is not None


def scene_render_path(settings: Settings, job_id: str, scene_index: int) -> Path:
    root = settings.lesson_data_dir / "renders" / job_id
    root.mkdir(parents=True, exist_ok=True)
    return root / f"scene_{scene_index}.mp4"


def lesson_render_path(settings: Settings, job_id: str) -> Path:
    root = settings.lesson_data_dir / "renders" / job_id
    root.mkdir(parents=True, exist_ok=True)
    return root / "lesson.mp4"


def scene_render_url(settings: Settings, job_id: str, scene_index: int) -> str:
    base = settings.api_public_url.rstrip("/")
    return f"{base}/ai/lesson-video/{job_id}/scenes/{scene_index}/file"


def lesson_render_url(settings: Settings, job_id: str) -> str:
    base = settings.api_public_url.rstrip("/")
    return f"{base}/ai/lesson-video/{job_id}/file"


async def _download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        dest.write_bytes(resp.content)


def _mux_files(
    video_path: Path,
    audio_path: Path,
    output_path: Path,
    *,
    loop_video: bool = False,
    max_duration_sec: float | None = None,
) -> None:
    ffmpeg = ffmpeg_executable()
    if not ffmpeg:
        raise RuntimeError("ffmpeg not available")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    cmd: list[str] = [ffmpeg, "-y"]
    if loop_video:
        cmd.extend(["-stream_loop", "-1"])
    cmd.extend(["-i", str(video_path), "-i", str(audio_path)])
    if loop_video:
        cmd.extend(["-map", "0:v:0", "-map", "1:a:0"])
    cmd.extend(
        [
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-shortest",
        ]
    )
    if max_duration_sec and max_duration_sec > 0:
        cmd.extend(["-t", str(max_duration_sec)])
    cmd.extend(["-movflags", "+faststart", str(output_path)])

    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or proc.stdout or "ffmpeg failed")[:400])


def _image_ext_from_url(url: str) -> str:
    lower = url.lower().split("?")[0]
    for ext in (".png", ".webp", ".jpeg", ".jpg"):
        if lower.endswith(ext):
            return ext.lstrip(".")
    return "jpg"


def _build_from_image_and_audio(
    image_path: Path,
    audio_path: Path,
    output_path: Path,
    *,
    max_duration_sec: float | None = None,
) -> None:
    """Still image + narration → MP4 (works when fal animation or mux fails)."""
    ffmpeg = ffmpeg_executable()
    if not ffmpeg:
        raise RuntimeError("ffmpeg not available")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    vf = (
        "scale=1280:720:force_original_aspect_ratio=decrease,"
        "pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p"
    )
    cmd: list[str] = [
        ffmpeg,
        "-y",
        "-loop",
        "1",
        "-i",
        str(image_path),
        "-i",
        str(audio_path),
        "-vf",
        vf,
        "-c:v",
        "libx264",
        "-tune",
        "stillimage",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
    ]
    if max_duration_sec and max_duration_sec > 0:
        cmd.extend(["-t", str(max_duration_sec)])
    cmd.extend(["-movflags", "+faststart", str(output_path)])

    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or proc.stdout or "ffmpeg failed")[:400])


async def build_lesson_video_from_image_and_audio(
    *,
    job_id: str,
    image_url: str,
    audio_url: str,
    settings: Settings,
) -> str | None:
    """Build a full lesson MP4 from scene artwork + voice (reliable fallback)."""
    if not ffmpeg_available():
        logger.warning("ffmpeg not found — cannot build lesson from image+audio")
        return None

    work = settings.lesson_data_dir / "renders" / job_id / "_work_lesson"
    work.mkdir(parents=True, exist_ok=True)
    ext = _image_ext_from_url(image_url)
    img_in = work / f"cover.{ext}"
    a_in = work / "narration.mp3"
    out = lesson_render_path(settings, job_id)

    try:
        await _download(image_url, img_in)
        await _download(audio_url, a_in)
        await asyncio.to_thread(
            _build_from_image_and_audio,
            img_in,
            a_in,
            out,
            max_duration_sec=settings.lesson_scene_target_seconds,
        )
        return lesson_render_url(settings, job_id)
    except Exception as exc:
        logger.warning("Image+audio lesson build failed for job %s: %s", job_id, exc)
        return None
    finally:
        for p in (img_in, a_in):
            try:
                p.unlink(missing_ok=True)
            except OSError:
                pass


async def build_lesson_video_with_voice(
    *,
    job_id: str,
    video_url: str,
    audio_url: str,
    settings: Settings,
) -> str | None:
    """
    Merge fal silent clip + full narration into one lesson MP4.
    Loops the short AI clip under the voice track (typical output: 1–2 minutes).
    """
    if not ffmpeg_available():
        logger.warning("ffmpeg not found — cannot mux voice into video")
        return None

    work = settings.lesson_data_dir / "renders" / job_id / "_work_lesson"
    work.mkdir(parents=True, exist_ok=True)
    v_in = work / "clip.mp4"
    a_in = work / "narration.mp3"
    out = lesson_render_path(settings, job_id)

    try:
        await _download(video_url, v_in)
        await _download(audio_url, a_in)
        await asyncio.to_thread(
            _mux_files,
            v_in,
            a_in,
            out,
            loop_video=True,
            max_duration_sec=settings.lesson_scene_target_seconds,
        )
        return lesson_render_url(settings, job_id)
    except Exception as exc:
        logger.warning("Mux lesson job %s failed: %s", job_id, exc)
        return None
    finally:
        for p in (v_in, a_in):
            try:
                p.unlink(missing_ok=True)
            except OSError:
                pass


async def build_scene_video_with_voice(
    *,
    job_id: str,
    scene_index: int,
    video_url: str,
    audio_url: str,
    settings: Settings,
) -> str | None:
    """Legacy per-scene mux (kept for older jobs)."""
    if not ffmpeg_available():
        logger.warning("ffmpeg not found — cannot mux voice into video")
        return None

    work = settings.lesson_data_dir / "renders" / job_id / f"_work_{scene_index}"
    work.mkdir(parents=True, exist_ok=True)
    v_in = work / "clip.mp4"
    a_in = work / "narration.mp3"
    out = scene_render_path(settings, job_id, scene_index)

    try:
        await _download(video_url, v_in)
        await _download(audio_url, a_in)
        await asyncio.to_thread(_mux_files, v_in, a_in, out)
        return scene_render_url(settings, job_id, scene_index)
    except Exception as exc:
        logger.warning("Mux scene %s job %s failed: %s", scene_index, job_id, exc)
        return None
    finally:
        for p in (v_in, a_in):
            try:
                p.unlink(missing_ok=True)
            except OSError:
                pass
