"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addPostComment,
  fetchPostComments,
  reportContent,
  togglePostLike,
  type Post,
  type PostComment,
} from "@/lib/api";
import { isAllowedImageUrl } from "@/lib/allowed-image-url";
import MemeCard from "@/components/MemeCard";
import { mergeCommentsById } from "@/lib/merge-comments";
import { feedCaptionText, parseMemePostCaption } from "@/lib/meme-post";

type Props = {
  post: Post;
  currentUserId: string | null;
  onPostUpdate: (postId: string, patch: Partial<Post>) => void;
  remoteComment?: PostComment;
  onConsumeRemoteComment?: (postId: string) => void;
};

export default function FeedPostCard({
  post,
  currentUserId,
  onPostUpdate,
  remoteComment,
  onConsumeRemoteComment,
}: Props) {
  const [liked, setLiked] = useState(post.liked_by_me ?? false);
  const [likes, setLikes] = useState(post.likes);
  const [commentsCount, setCommentsCount] = useState(post.comments);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsFetched, setCommentsFetched] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [liking, setLiking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayComments = useMemo(
    () => mergeCommentsById(comments),
    [comments],
  );

  const memeMeta = useMemo(
    () => (post.type === "meme" ? parseMemePostCaption(post.caption) : null),
    [post.type, post.caption],
  );
  const feedCaption = useMemo(
    () => feedCaptionText(post.caption),
    [post.caption],
  );
  const safeImageUrl = useMemo(
    () => (isAllowedImageUrl(post.content_url) ? post.content_url : null),
    [post.content_url],
  );

  useEffect(() => {
    if (safeImageUrl || post.type !== "video") return;
    // #region agent log
    fetch("http://127.0.0.1:7574/ingest/3c6afa58-30ac-4e5e-9854-7a3b8425de96", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "ba63c3",
      },
      body: JSON.stringify({
        sessionId: "ba63c3",
        location: "FeedPostCard.tsx:imageUnavailable",
        message: "feed post has no displayable image",
        data: {
          postId: post.id,
          postType: post.type,
          content_url: post.content_url?.slice(0, 120),
          allowed: isAllowedImageUrl(post.content_url),
        },
        timestamp: Date.now(),
        hypothesisId: "H5",
      }),
    }).catch(() => {});
    // #endregion
  }, [post.id, post.type, post.content_url, safeImageUrl]);

  useEffect(() => {
    setLiked(post.liked_by_me ?? false);
    setLikes(post.likes);
    setCommentsCount(post.comments);
  }, [post.liked_by_me, post.likes, post.comments]);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    setError(null);
    try {
      const rows = await fetchPostComments(post.id);
      setComments(mergeCommentsById(rows));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load comments");
    } finally {
      setCommentsFetched(true);
      setLoadingComments(false);
    }
  }, [post.id]);

  useEffect(() => {
    if (!showComments) {
      setCommentsFetched(false);
      setComments([]);
    }
  }, [showComments]);

  useEffect(() => {
    if (showComments && !commentsFetched && !loadingComments) {
      void loadComments();
    }
  }, [showComments, commentsFetched, loadingComments, loadComments]);

  useEffect(() => {
    if (!remoteComment) return;
    setComments((prev) => mergeCommentsById(prev, [remoteComment]));
    onConsumeRemoteComment?.(post.id);
  }, [remoteComment, post.id, onConsumeRemoteComment]);

  async function handleLike() {
    if (liking) return;
    setLiking(true);
    setError(null);
    const prevLiked = liked;
    const prevLikes = likes;
    setLiked(!prevLiked);
    setLikes(prevLiked ? Math.max(0, prevLikes - 1) : prevLikes + 1);

    try {
      const result = await togglePostLike(post.id);
      setLiked(result.liked);
      setLikes(result.likes);
      onPostUpdate(post.id, { likes: result.likes, liked_by_me: result.liked });
    } catch (err) {
      setLiked(prevLiked);
      setLikes(prevLikes);
      setError(err instanceof Error ? err.message : "Like failed");
    } finally {
      setLiking(false);
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    const body = commentText.trim();
    if (!body || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const created = await addPostComment(post.id, body);
      setCommentText("");
      setComments((prev) => mergeCommentsById(prev, [created]));
      const nextCount = commentsCount + 1;
      setCommentsCount(nextCount);
      onPostUpdate(post.id, { comments: nextCount });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comment failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-xs font-semibold text-white">
          E
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            EduVerse learner
          </p>
          <p className="text-xs capitalize text-zinc-400">{post.type}</p>
        </div>
      </header>

      {memeMeta?.top || memeMeta?.bottom ? (
        <MemeCard
          imageUrl={safeImageUrl ?? ""}
          topText={memeMeta.top}
          bottomText={memeMeta.bottom}
          alt={feedCaption ?? "Meme"}
        />
      ) : safeImageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={safeImageUrl}
          alt={feedCaption ?? "Community post"}
          className="aspect-square w-full object-cover"
        />
      ) : (
        <div className="flex aspect-square items-center justify-center bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-800">
          Image unavailable
        </div>
      )}

      <section className="px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleLike}
            disabled={liking || !currentUserId}
            className={`text-2xl transition disabled:opacity-50 ${
              liked ? "scale-110" : "hover:scale-105"
            }`}
            aria-label={liked ? "Unlike" : "Like"}
            aria-pressed={liked}
          >
            {liked ? "❤️" : "🤍"}
          </button>
          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            className="text-2xl transition hover:scale-105"
            aria-label="Toggle comments"
            aria-expanded={showComments}
          >
            💬
          </button>
          {currentUserId && (
            <button
              type="button"
              className="ml-auto text-xs text-zinc-400 hover:text-red-600"
              onClick={async () => {
                const reason = window.prompt("Why are you reporting this post?");
                if (reason === null) return;
                try {
                  await reportContent({
                    target_type: "post",
                    target_id: post.id,
                    reason: reason || undefined,
                  });
                  setError(null);
                  alert("Report submitted. Thank you.");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Report failed");
                }
              }}
            >
              Report
            </button>
          )}
        </div>

        <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {likes} {likes === 1 ? "like" : "likes"}
        </p>

        {feedCaption && (
          <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
            <span className="font-semibold">Caption </span>
            {feedCaption}
          </p>
        )}

        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="mt-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          {showComments
            ? "Hide comments"
            : `View all ${commentsCount} comment${commentsCount === 1 ? "" : "s"}`}
        </button>

        {error && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{error}</p>
        )}

        {showComments && (
          <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            {loadingComments ? (
              <p className="text-xs text-zinc-500">Loading comments…</p>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-y-auto">
                {displayComments.map((c) => (
                  <li key={c.id} className="text-sm">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {c.author_name ?? "Learner"}
                    </span>{" "}
                    <span className="text-zinc-700 dark:text-zinc-300">{c.body}</span>
                  </li>
                ))}
                {!displayComments.length && (
                  <li className="text-xs text-zinc-500">No comments yet.</li>
                )}
              </ul>
            )}

            <form onSubmit={handleSubmitComment} className="mt-3 flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={submitting || !currentUserId}
                placeholder="Add a comment…"
                maxLength={2000}
                className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
              <button
                type="submit"
                disabled={submitting || !commentText.trim() || !currentUserId}
                className="shrink-0 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Post
              </button>
            </form>
          </div>
        )}
      </section>
    </article>
  );
}
