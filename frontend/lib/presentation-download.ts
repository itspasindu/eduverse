import type { PresentationResponse } from "@/lib/api";

const ALLOWED_IMAGE_HOSTS = [
  "picsum.photos",
  "fal.media",
  "fal.run",
  "supabase.co",
];

export function sanitizeFilename(name: string): string {
  return (
    name
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) || "presentation"
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function isAllowedImageUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return ALLOWED_IMAGE_HOSTS.some(
      (h) => host === h || host.endsWith(`.${h}`),
    );
  } catch {
    return false;
  }
}

export async function fetchImageBlob(url: string): Promise<Blob> {
  if (!isAllowedImageUrl(url)) {
    throw new Error("Image host is not allowed for download.");
  }

  const res = await fetch(
    `/api/presentation/image?url=${encodeURIComponent(url)}`,
  );
  if (!res.ok) {
    throw new Error("Could not download image.");
  }
  return res.blob();
}

export function downloadPresentationJson(deck: PresentationResponse) {
  const base = sanitizeFilename(deck.title);
  const blob = new Blob([JSON.stringify(deck, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, `${base}.json`);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function imageToDataUrl(url: string): Promise<string | null> {
  try {
    const blob = await fetchImageBlob(url);
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadPresentationHtml(deck: PresentationResponse) {
  const base = sanitizeFilename(deck.title);
  const slidesHtml: string[] = [];

  for (let i = 0; i < deck.slides.length; i++) {
    const s = deck.slides[i];
    const imgSrc = s.image_url
      ? (await imageToDataUrl(s.image_url)) ?? s.image_url
      : "";
    const bullets = s.bullets
      .map((b) => `<li>${escapeHtml(b)}</li>`)
      .join("");
    const notes = s.speaker_notes
      ? `<p class="notes">${escapeHtml(s.speaker_notes)}</p>`
      : "";

    slidesHtml.push(`
      <section class="slide">
        ${imgSrc ? `<img src="${imgSrc}" alt="" />` : ""}
        <div class="content">
          <p class="meta">Slide ${i + 1} of ${deck.slides.length}</p>
          <h2>${escapeHtml(s.title)}</h2>
          <ul>${bullets}</ul>
          ${notes}
        </div>
      </section>`);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(deck.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; padding: 2rem; background: #f4f4f5; color: #18181b; }
    h1 { text-align: center; margin-bottom: 2rem; }
    .slide { display: grid; gap: 1rem; max-width: 960px; margin: 0 auto 2rem; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    @media (min-width: 768px) { .slide { grid-template-columns: 1fr 1fr; } }
    .slide img { width: 100%; aspect-ratio: 16/10; object-fit: cover; display: block; }
    .content { padding: 1.5rem 2rem; }
    .meta { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; }
    h2 { margin: 0.5rem 0 1rem; font-size: 1.5rem; }
    ul { margin: 0; padding-left: 1.25rem; line-height: 1.6; }
    .notes { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e4e4e7; font-size: 0.875rem; font-style: italic; color: #52525b; }
  </style>
</head>
<body>
  <h1>${escapeHtml(deck.title)}</h1>
  ${slidesHtml.join("\n")}
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  downloadBlob(blob, `${base}.html`);
}

export async function downloadSlideImage(
  imageUrl: string,
  deckTitle: string,
  slideIndex: number,
) {
  const blob = await fetchImageBlob(imageUrl);
  const ext = blob.type.includes("png") ? "png" : "jpg";
  const base = sanitizeFilename(deckTitle);
  downloadBlob(blob, `${base}-slide-${String(slideIndex + 1).padStart(2, "0")}.${ext}`);
}

export async function downloadAllSlideImages(
  deck: PresentationResponse,
): Promise<{ downloaded: number; skipped: number }> {
  const base = sanitizeFilename(deck.title);
  let downloaded = 0;
  let skipped = 0;

  for (let i = 0; i < deck.slides.length; i++) {
    const url = deck.slides[i].image_url;
    if (!url) {
      skipped += 1;
      continue;
    }
    try {
      const blob = await fetchImageBlob(url);
      const ext = blob.type.includes("png") ? "png" : "jpg";
      downloadBlob(
        blob,
        `${base}-slide-${String(i + 1).padStart(2, "0")}.${ext}`,
      );
      downloaded += 1;
      await new Promise((r) => setTimeout(r, 300));
    } catch {
      skipped += 1;
    }
  }

  return { downloaded, skipped };
}
