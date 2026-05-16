# EduVerse AI

A multimodal AI-powered social learning platform built with [fal.ai](https://fal.ai).

EduVerse combines social learning, creator tools, and AI-assisted education—meme generation, tutoring, and image-to-video—in one place for students and content creators.

---

## Core Features

| Feature | Description |
|--------|-------------|
| **Authentication** | Supabase Auth (email/password) + API session sync |
| **Dashboard** | Role-aware workspace with stats, library, and quick actions |
| **Roles** | Student, creator, and admin with role-based access |
| **AI Meme Generation** | Text prompts → images via fal.ai |
| **AI Tutor** | LLM-powered Q&A and learning assistance |
| **Image-to-Video** | Turn static images into short videos |
| **Social Feed** | Posts, likes, and comments |
| **Recommendations** | Personalized content discovery |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js, Tailwind CSS |
| Backend | FastAPI |
| AI | fal.ai APIs, LLM |
| Database | Supabase (Auth + Postgres via API) |
| Vector DB | Pinecone |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                         │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST / API
┌───────────────────────────▼─────────────────────────────────┐
│                      FastAPI Backend                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────────┐  │
│  │  Auth   │ │ Content │ │ Social  │ │  AI Orchestrator │  │
│  │ Service │ │ Service │ │ Service │ │  (fal.ai + LLM)  │  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────────┬─────────┘  │
└───────┼───────────┼───────────┼───────────────┼────────────┘
        │           │           │               │
        │           │           │               │
        └───────────┴───────────┴───────────────┘
                            │
                            ▼
                      Supabase
                   (Auth + Database)
                            │
                            ▼
                      fal.ai / LLM
```

### Modular Services

- **Auth** — Supabase Auth sessions, profile sync, role enforcement
- **Content** — Posts, media metadata, creator workflows
- **Social** — Feed, likes, comments, engagement
- **AI Orchestrator** — Single entry point for meme generation, tutor chat, image-to-video, and embedding/indexing for recommendations

The AI Orchestrator centralizes all external AI calls (fal.ai, LLM providers) so services stay decoupled and rate limits, retries, and logging can be handled in one place.

---

## Roles

| Role | Capabilities |
|------|----------------|
| **Student** | Browse feed, interact (like/comment), use AI tutor, view recommendations |
| **Creator** | Publish content, generate memes and videos, manage own posts |
| **Admin** | User moderation, platform configuration, analytics |

---

## Project Structure (planned)

```
eduverse/
├── frontend/          # Next.js + Tailwind
├── backend/           # FastAPI
│   ├── services/
│   │   ├── auth/
│   │   ├── content/
│   │   ├── social/
│   │   └── ai/        # AI Orchestrator
│   └── ...
├── README.md
└── ...
```

---

## Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase project (database + auth)
- Pinecone account
- fal.ai API key
- LLM provider credentials (as configured in the AI Orchestrator)

---

## Environment Variables

Create `.env` files for frontend and backend (do not commit secrets).

**Backend (example)**

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
FAL_KEY=your-fal-key
```

The backend uses the **Supabase Python client** (service role) for all database access — no local PostgreSQL, SQLite, or `DATABASE_URL` required.

**Frontend (example)**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Supabase setup**

1. Create a project at [supabase.com](https://supabase.com)
2. Enable **Email** auth under Authentication → Providers
3. Run **`supabase/migrations/001_initial_schema.sql`** in the Supabase **SQL Editor** (creates `profiles` and `posts` tables). If you see `Could not find the table public.profiles`, this step was skipped.
4. Copy **Project URL**, **anon key**, and **JWT secret** (Settings → API) into your `.env` files
5. Set `SUPABASE_JWT_SECRET` in the backend `.env` so the API accepts Supabase session tokens

---

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the marketing page, [http://localhost:3000/register](http://localhost:3000/register) to create an account, and [http://localhost:3000/dashboard](http://localhost:3000/dashboard) after sign-in. API docs: [http://localhost:8000/docs](http://localhost:8000/docs).

Copy `frontend/.env.example` and `backend/.env.example` to `.env.local` / `.env` and fill in your Supabase credentials before signing up.

---

## AI Flows

1. **Meme generation** — Client → Content/Social API → AI Orchestrator → fal.ai text-to-image → stored URL in Supabase
2. **AI tutor** — Client → AI Orchestrator → LLM → streamed or structured response
3. **Image-to-video** — Client → AI Orchestrator → fal.ai image-to-video → media attached to post
4. **Recommendations** — Embeddings via Orchestrator → Pinecone similarity → ranked feed items

---

## License

Specify your license here (e.g. MIT, proprietary).

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit changes and open a pull request

---

Built with fal.ai for multimodal AI workloads.
