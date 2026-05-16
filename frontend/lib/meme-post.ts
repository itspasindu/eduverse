export type MemePostCaption = {
  kind: "meme";
  feed: string;
  top: string;
  bottom: string;
};

export function parseMemePostCaption(
  caption: string | null | undefined,
): MemePostCaption | null {
  if (!caption?.trim()) return null;
  try {
    const data = JSON.parse(caption) as Record<string, unknown>;
    if (data.kind !== "meme") return null;
    const feed = typeof data.feed === "string" ? data.feed : "";
    const top = typeof data.top === "string" ? data.top : "";
    const bottom = typeof data.bottom === "string" ? data.bottom : "";
    if (!feed && !top && !bottom) return null;
    return { kind: "meme", feed, top, bottom };
  } catch {
    return null;
  }
}

/** Text shown under the post in the feed (not meme overlay lines). */
export function feedCaptionText(caption: string | null | undefined): string | null {
  const meme = parseMemePostCaption(caption);
  if (meme?.feed) return meme.feed;
  return caption?.trim() || null;
}
