# EduVerse AI

A multimodal AI-powered social learning platform built with [fal.ai](https://fal.ai).

EduVerse combines social learning, creator tools, and AI-assisted education—meme generation, tutoring, and image-to-video—in one place for students and content creators.

---

## Core Features

| Feature | Description |
|--------|-------------|
| **Authentication** | JWT-based sign-in and session management |
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
| Database | PostgreSQL (Supabase) |
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
        ▼           ▼           ▼               ▼
   PostgreSQL   PostgreSQL   PostgreSQL    fal.ai / LLM
   (Supabase)   (Supabase)   (Supabase)    Pinecone (vectors)
```

### Modular Services

- **Auth** — Registration, login, JWT issuance, role enforcement
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
- PostgreSQL (or Supabase project)
- Pinecone account
- fal.ai API key
- LLM provider credentials (as configured in the AI Orchestrator)

---

## Environment Variables

Create `.env` files for frontend and backend (do not commit secrets).

**Backend (example)**

```env
DATABASE_URL=postgresql://...
SUPABASE_URL=
SUPABASE_KEY=
JWT_SECRET=
FAL_KEY=
PINECONE_API_KEY=
PINECONE_INDEX=
LLM_API_KEY=
```

**Frontend (example)**

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

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

Open [http://localhost:3000](http://localhost:3000) for the app and [http://localhost:8000/docs](http://localhost:8000/docs) for the FastAPI OpenAPI docs.

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
