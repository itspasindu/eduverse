import type { PostComment } from "@/lib/api";

/** Merge comment lists; keeps first occurrence of each id. */
export function mergeCommentsById(
  existing: PostComment[],
  incoming: PostComment[] = [],
): PostComment[] {
  const merged: PostComment[] = [];
  const ids = new Set<string>();
  for (const c of [...existing, ...incoming]) {
    const id = String(c.id);
    if (!ids.has(id)) {
      merged.push(c);
      ids.add(id);
    }
  }
  return merged;
}
