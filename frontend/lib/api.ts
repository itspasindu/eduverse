import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type MemeGenerateResponse = {
  image_url: string;
  prompt: string;
  model: string;
  top_text: string;
  bottom_text: string;
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
  created_at: string;
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

export type PresentationSlide = {
  title: string;
  bullets: string[];
  speaker_notes: string;
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
  options?: { title?: string; fontStyle?: string },
): Promise<PresentationResponse> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/ai/presentation`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      notes,
      title: options?.title ?? null,
      font_style: options?.fontStyle ?? "modern-sans",
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail =
      typeof body.detail === "string"
        ? body.detail
        : res.status === 403
          ? "Slide Studio is for Creator accounts. Register as a creator or ask an admin to upgrade your role."
          : "Failed to generate presentation.";
    throw new Error(detail);
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
    const detail =
      typeof body.detail === "string"
        ? body.detail
        : "Failed to generate meme. Please try again.";
    throw new Error(detail);
  }

  return res.json();
}

export async function savePost(
  contentUrl: string,
  caption?: string,
): Promise<Post> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/posts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      type: "meme",
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
  const res = await fetch(`${API_BASE}/posts/feed`);
  if (!res.ok) throw new Error("Failed to load feed");
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
