import { backendUrl } from "@/lib/api-proxy";

type RouteContext = { params: Promise<{ jobId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const auth = request.headers.get("authorization");
  if (!auth) {
    return new Response("Sign in required", { status: 401 });
  }

  try {
    const res = await fetch(backendUrl(`/ai/lesson-video/${jobId}/file`), {
      headers: { Authorization: auth },
    });
    if (!res.ok) {
      return new Response(await res.text(), { status: res.status });
    }
    const body = res.body;
    if (!body) {
      return new Response("Empty video", { status: 502 });
    }
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "video/mp4",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Cannot reach API server", { status: 503 });
  }
}
