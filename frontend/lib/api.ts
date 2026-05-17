import { getAccessToken } from "@/lib/auth";
import {
  isAccountSuspendedDetail,
  parseApiDetail,
} from "@/lib/moderation-error";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type MemeGenerateResponse = {
  image_url: string;
  prompt: string;
  model: string;
  top_text: string;
  bottom_text: string;
  feed_caption?: string;
  post_caption?: string;
  caption_source?: string;
};

export type Post = {
  id: string;
  user_id: string;
  type: "meme" | "video";
  content_url: string;
  caption: string | null;
  likes: number;
  comments: number;
  liked_by_me?: boolean;
  created_at: string;
};

export type PostComment = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name: string | null;
};

export type LikeToggleResult = {
  post_id: string;
  likes: number;
  liked: boolean;
};

export type AdminOverview = {
  total_users: number;
  total_posts: number;
  users_by_role: Record<string, number>;
  posts_by_type: Record<string, number>;
};

export type AdminUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  moderation_strikes?: number;
  is_suspended?: boolean;
};

export type AdminPostRow = Post & {
  author_email?: string | null;
};

export type TeacherOverview = {
  student_count: number;
  creator_count: number;
  total_posts: number;
  my_announcements: number;
  recent_posts: Post[];
  recent_announcements: Announcement[];
};

export type TeacherStudent = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
};

export type Announcement = {
  id: string;
  author_id: string;
  title: string;
  body: string;
  created_at: string;
};

export type UserProfile = {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  moderation_strikes?: number;
  is_suspended?: boolean;
};

export type SubscriptionPlan = {
  id: string;
  slug: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  price_cents: number;
  billing_period: string;
  features: string[];
  sort_order: number;
};

export type UserSubscription = {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: "pending" | "active" | "cancelled" | "expired";
  starts_at?: string | null;
  ends_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminSubscriptionRow = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  subscription: UserSubscription | null;
};

export type DashboardData = {
  user: UserProfile;
  stats: {
    total_posts: number;
    meme_count: number;
    video_count: number;
    total_likes: number;
  };
  recent_posts: Post[];
};

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function throwApiError(body: unknown, fallback: string): never {
  const detail = (body as { detail?: unknown })?.detail;
  if (isAccountSuspendedDetail(detail) && typeof window !== "undefined") {
    window.location.href = "/suspended";
  }
  throw new Error(parseApiDetail(detail) || fallback);
}

async function parseApiError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) return body.detail.map(String).join("; ");
  } catch {
    /* ignore */
  }
  return fallback;
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(path, init);
  } catch {
    throw new Error(
      "Cannot reach the server. Start the backend (cd backend && uvicorn main:app --reload) and refresh.",
    );
  }
}

export type PresentationSlide = {
  title: string;
  bullets: string[];
  speaker_notes: string;
  image_url?: string | null;
};

export type PresentationResponse = {
  title: string;
  font_style: string;
  slides: PresentationSlide[];
  model: string;
  source: string;
};

export async function generatePresentation(
  notes: string,
  options?: {
    title?: string;
    fontStyle?: string;
    includeImages?: boolean;
  },
): Promise<PresentationResponse> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/ai/presentation`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      notes,
      title: options?.title ?? null,
      font_style: options?.fontStyle ?? "modern-sans",
      include_images: options?.includeImages ?? true,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseApiDetail(body.detail) || "Failed to generate presentation.");
  }

  return res.json();
}

export async function generateMeme(text: string): Promise<MemeGenerateResponse> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/ai/meme`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseApiDetail(body.detail) || "Failed to generate meme. Please try again.");
  }

  return res.json();
}

export type LessonCharacter = {
  id: string;
  owner_id: string;
  name: string;
  personality: string;
  teaching_style: string;
  visual_description: string;
  voice_style: string;
  character_bible?: string | null;
  reference_image_url?: string | null;
  reference_sheet_urls: string[];
  class_tag?: string | null;
  visibility: "personal" | "class";
  created_at: string;
};

export type LessonMaterial = {
  id: string;
  user_id: string;
  filename: string;
  content_type: string;
  file_url: string;
  extracted_text?: string | null;
  created_at: string;
};

export type LessonScene = {
  title: string;
  narration: string;
  visual_prompt: string;
  on_screen_text: string;
  image_url?: string | null;
  audio_url?: string | null;
  video_url?: string | null;
};

export type LessonVideoJob = {
  job_id: string;
  status: string;
  progress: number;
  title: string;
  phase?: string | null;
  scenes: LessonScene[];
  playlist_url?: string | null;
  cover_image_url?: string | null;
  video_mode?: string | null;
  error?: string | null;
};

export function isLessonAudioOnlyUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.includes("/lesson-video/") && (url.includes("/file") || url.includes("/scenes/"))) {
    return false;
  }
  return /\.(mp3|m4a|wav|ogg)(\?|$)/i.test(url) || /_speech|\/speech/i.test(url);
}

export async function fetchCharacters(): Promise<LessonCharacter[]> {
  const token = await getAccessToken();
  if (!token) throw new Error("Sign in to manage characters.");
  const headers = await authHeaders();
  const res = await apiFetch("/api/characters", { headers });
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to load characters"));
  }
  return res.json();
}

export async function createCharacter(payload: {
  name: string;
  personality: string;
  teaching_style: string;
  visual_description: string;
  voice_style?: string;
  visibility?: "personal" | "class";
  class_tag?: string;
  generate_art?: boolean;
}): Promise<LessonCharacter> {
  const token = await getAccessToken();
  if (!token) throw new Error("Sign in to create a character.");
  const headers = await authHeaders();
  const res = await apiFetch("/api/characters", {
    method: "POST",
    headers,
    body: JSON.stringify({
      voice_style: "friendly",
      generate_art: true,
      visibility: "personal",
      ...payload,
    }),
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to create character"));
  }
  return res.json();
}

export async function deleteCharacter(id: string): Promise<void> {
  const headers = await authHeaders();
  const res = await apiFetch(`/api/characters/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error(await parseApiError(res, "Failed to delete character"));
}

export async function fetchMaterials(): Promise<LessonMaterial[]> {
  const token = await getAccessToken();
  if (!token) throw new Error("Sign in to use Lesson Studio.");
  const headers = await authHeaders();
  const res = await apiFetch("/api/materials", { headers });
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to load materials"));
  }
  return res.json();
}

export async function uploadMaterial(file: File): Promise<LessonMaterial> {
  const token = await getAccessToken();
  if (!token) throw new Error("Sign in to upload materials.");
  const form = new FormData();
  form.append("file", file);
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await apiFetch("/api/materials", {
    method: "POST",
    headers,
    body: form,
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Upload failed"));
  }
  return res.json();
}

export async function deleteMaterial(id: string): Promise<void> {
  const headers = await authHeaders();
  const res = await apiFetch(`/api/materials/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error(await parseApiError(res, "Failed to delete material"));
}

export async function startLessonVideo(
  materialId: string,
  characterId?: string | null,
): Promise<LessonVideoJob> {
  const headers = await authHeaders();
  const res = await apiFetch("/api/lesson-video", {
    method: "POST",
    headers,
    body: JSON.stringify({
      material_id: materialId,
      character_id: characterId ?? null,
    }),
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to start lesson video"));
  }
  return res.json();
}

export async function getLessonVideoJob(jobId: string): Promise<LessonVideoJob> {
  const headers = await authHeaders();
  const res = await apiFetch(`/api/lesson-video/${jobId}`, { headers });
  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to load job status"));
  }
  return res.json();
}

export async function savePost(
  contentUrl: string,
  caption?: string,
  type: "meme" | "video" = "meme",
): Promise<Post> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/posts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      type,
      content_url: contentUrl,
      caption: caption ?? null,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? "Failed to save post");
  }

  return res.json();
}

export async function fetchMyPosts(): Promise<Post[]> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/posts/me`, { headers });
  if (!res.ok) throw new Error("Failed to load posts");
  return res.json();
}

export async function fetchFeed(): Promise<Post[]> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/posts/feed`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load feed");
  return res.json();
}

export async function togglePostLike(postId: string): Promise<LikeToggleResult> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/posts/${postId}/like`, {
    method: "POST",
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throwApiError(body, "Failed to update like");
  }
  return res.json();
}

export async function fetchPostComments(postId: string): Promise<PostComment[]> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load comments");
  return res.json();
}

export async function addPostComment(
  postId: string,
  body: string,
): Promise<PostComment> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
    method: "POST",
    headers,
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(parseApiDetail(err.detail) || "Failed to post comment");
  }
  return res.json();
}

export async function deletePost(postId: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/posts/${postId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Failed to delete post");
}

export async function fetchDashboard(): Promise<DashboardData> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/dashboard`, { headers });
  if (!res.ok) throw new Error("Failed to load dashboard");
  return res.json();
}

export async function unsuspendUser(userId: string): Promise<AdminUserRow> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/admin/users/${userId}/unsuspend`, {
    method: "POST",
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseApiDetail(body.detail) || "Failed to restore user");
  }
  return res.json();
}

export async function updateUserRole(
  userId: string,
  role: string,
): Promise<AdminUserRow> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? "Failed to update role");
  }
  return res.json();
}

export async function adminDeletePost(postId: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/admin/posts/${postId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Failed to delete post");
}

export async function createAnnouncement(
  title: string,
  body: string,
): Promise<Announcement> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/teacher/announcements`, {
    method: "POST",
    headers,
    body: JSON.stringify({ title, body }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to publish announcement");
  }
  return res.json();
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/teacher/announcements/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Failed to delete announcement");
}

export async function updateProfile(payload: {
  full_name?: string;
  avatar_url?: string;
}): Promise<UserProfile> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/me`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? "Failed to update profile");
  }
  return res.json();
}

export async function uploadAvatar(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/profile/avatar", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? "Failed to upload photo");
  }
  const data = await res.json();
  return data.url as string;
}

export async function fetchTeacherAnnouncements(): Promise<Announcement[]> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/teacher/announcements`, { headers });
  if (!res.ok) throw new Error("Failed to load announcements");
  return res.json();
}

export type AuditEventRow = {
  id: string;
  actor_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
};

export type ContentReportRow = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  status: string;
  created_at: string;
};

export async function reportContent(payload: {
  target_type: "post" | "comment";
  target_id: string;
  reason?: string;
}): Promise<{ id: string; status: string }> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/reports`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throwApiError(body, "Failed to submit report");
  }
  return res.json();
}

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const res = await fetch(`${API_BASE}/subscriptions/plans`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load plans");
  return res.json();
}

export async function fetchMySubscription(): Promise<UserSubscription | null> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/subscriptions/me`, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load subscription");
  const data = await res.json();
  return data ?? null;
}

export type CheckoutResponse = {
  order_id: string;
  checkout_url: string;
  fields: Record<string, string>;
  amount: string;
  currency: string;
  plan_name: string;
};

export async function createSubscriptionCheckout(
  planSlug: string,
): Promise<CheckoutResponse> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/subscriptions/checkout`, {
    method: "POST",
    headers,
    body: JSON.stringify({ plan_slug: planSlug }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.detail === "string" ? body.detail : "Failed to start PayHere checkout",
    );
  }
  return res.json();
}

export async function fetchPaymentStatus(orderId: string): Promise<{
  order_id: string;
  status: string;
  plan_slug: string;
  subscription_active: boolean;
}> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/subscriptions/payment/${orderId}`, { headers });
  if (!res.ok) throw new Error("Failed to load payment status");
  return res.json();
}

export async function selectSubscriptionPlan(
  planSlug: string,
): Promise<UserSubscription> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/subscriptions/me`, {
    method: "POST",
    headers,
    body: JSON.stringify({ plan_slug: planSlug }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.detail === "string" ? body.detail : "Failed to select plan",
    );
  }
  return res.json();
}

export async function fetchAdminSubscriptions(): Promise<AdminSubscriptionRow[]> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/admin/subscriptions`, { headers });
  if (!res.ok) throw new Error("Failed to load subscriptions");
  return res.json();
}

export async function updateUserSubscription(
  userId: string,
  payload: {
    plan_slug: string;
    status: string;
    notes?: string | null;
    ends_at?: string | null;
  },
): Promise<UserSubscription> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/admin/users/${userId}/subscription`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throwApiError(body, "Failed to update subscription");
  }
  return res.json();
}

export async function fetchAuditEvents(): Promise<AuditEventRow[]> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/admin/audit`, { headers });
  if (!res.ok) throw new Error("Failed to load audit log");
  return res.json();
}

export async function fetchPendingReports(): Promise<ContentReportRow[]> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/admin/reports`, { headers });
  if (!res.ok) throw new Error("Failed to load reports");
  return res.json();
}

export async function reviewReport(
  reportId: string,
  status: "reviewed" | "dismissed",
): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(
    `${API_BASE}/admin/reports/${reportId}?status=${status}`,
    { method: "PATCH", headers },
  );
  if (!res.ok) throw new Error("Failed to update report");
}

export async function exportMyData(): Promise<Record<string, unknown>> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/me/export`, { headers });
  if (!res.ok) throw new Error("Failed to export data");
  return res.json();
}

export async function deleteMyAccount(): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/me`, { method: "DELETE", headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throwApiError(body, "Failed to delete account");
  }
}
