import type { PostComment } from "@/lib/api";

export type FeedWsMessage =
  | {
      type: "like_update";
      post_id: string;
      likes: number;
      liked: boolean;
      user_id: string;
    }
  | {
      type: "comment_added";
      post_id: string;
      comments: number;
      comment: PostComment;
    }
  | { type: "pong" };

export function feedWebSocketUrl(token: string): string {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const wsBase = api.replace(/^http/, "ws");
  return `${wsBase}/ws/feed?token=${encodeURIComponent(token)}`;
}
