export default async function handler(req) {
  // #region agent log
  fetch("http://127.0.0.1:7702/ingest/798fffa1-a47e-44a4-9eec-58aba336e417", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0e14a3" },
    body: JSON.stringify({
      sessionId: "0e14a3",
      runId: "pre-fix",
      hypothesisId: "H1",
      location: "frontend/netlify/functions/health.js:handler",
      message: "Netlify function invoked",
      data: {
        method: req?.method ?? null,
        url: req?.url ?? null,
        netlify: Boolean(process.env.NETLIFY),
        context: process.env.CONTEXT ?? null,
        urlEnv: process.env.URL ?? null,
        deployUrl: process.env.DEPLOY_URL ?? null,
        siteUrl: process.env.SITE_URL ?? null
      },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion agent log

  return new Response(
    JSON.stringify({
      ok: true,
      netlify: Boolean(process.env.NETLIFY),
      context: process.env.CONTEXT ?? null,
      url: process.env.URL ?? null,
      deployUrl: process.env.DEPLOY_URL ?? null,
      siteUrl: process.env.SITE_URL ?? null
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

export default async function handler(req) {
  // #region agent log
  fetch("http://127.0.0.1:7702/ingest/798fffa1-a47e-44a4-9eec-58aba336e417", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0e14a3" },
    body: JSON.stringify({
      sessionId: "0e14a3",
      runId: "pre-fix",
      hypothesisId: "H1",
      location: "frontend/netlify/functions/health.js:handler",
      message: "Netlify function invoked",
      data: {
        method: req?.method ?? null,
        url: req?.url ?? null,
        netlify: Boolean(process.env.NETLIFY),
        context: process.env.CONTEXT ?? null,
        urlEnv: process.env.URL ?? null,
        deployUrl: process.env.DEPLOY_URL ?? null,
        siteUrl: process.env.SITE_URL ?? null,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion agent log

  return new Response(
    JSON.stringify({
      ok: true,
      netlify: Boolean(process.env.NETLIFY),
      context: process.env.CONTEXT ?? null,
      url: process.env.URL ?? null,
      deployUrl: process.env.DEPLOY_URL ?? null,
      siteUrl: process.env.SITE_URL ?? null,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

