# MedAI — Medical AI Expert System

AI-powered medical diagnostic system combining **Google Gemini AI** (generative text + vision) and **CLIPS Expert System** (rule-based inference) for intelligent healthcare analysis.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)

---

## Features

- **Dual-Engine Diagnosis** — Symptom analysis via CLIPS rule engine + Gemini AI side-by-side
- **Medical Image Scanner** — Drag-and-drop X-rays/CT scans for Gemini Vision AI analysis
- **Interactive Analytics** — Gradient area charts and pie charts with Recharts
- **Glassmorphism UI** — Translucent cards, backdrop blur, spring animations
- **Fully Responsive** — Mobile-first design with animated sidebar navigation

## Tech Stack

| Layer     | Technology                                      |
| --------- | ----------------------------------------------- |
| Frontend  | Next.js 16 (App Router), TypeScript, Tailwind CSS v4 |
| UI/Motion | Framer Motion, Lucide Icons, Recharts           |
| Backend   | Python FastAPI, Uvicorn                         |
| AI Engine | Google Gemini 1.5 Flash (text + vision)         |
| Rules     | CLIPS Expert System via clipspy                 |

## Project Structure

```
medical-ai/
├── frontend/          # Next.js App Router
│   ├── src/app/       # Pages (dashboard, diagnosis, scanner, analytics)
│   ├── src/components # Reusable UI components
│   ├── src/lib/       # API client, constants
│   └── src/types/     # TypeScript interfaces
├── backend/           # Python FastAPI
│   ├── routers/       # API endpoints (gemini, clips)
│   ├── services/      # Business logic
│   └── rules/         # CLIPS .clp rule files
└── plan.md            # Original specification
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# → http://localhost:8000
```

### Environment Variables

**`backend/.env`**
```
GEMINI_API_KEY=your_google_gemini_api_key
```

**`frontend/.env.local`**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Pages

| Route        | Description                                |
| ------------ | ------------------------------------------ |
| `/`          | Dashboard with stats, hero, quick actions  |
| `/diagnosis` | Patient form → CLIPS + Gemini analysis     |
| `/scanner`   | Image upload → Gemini Vision AI results    |
| `/analytics` | Interactive charts and visualizations      |

## Notes

- **CLIPS fallback**: If `clipspy` is not installed, the backend uses a Python-based simulation of the CLIPS rules for development convenience.
- **Medical Disclaimer**: This is an educational/hobby project. AI outputs should not be used for actual medical decisions.
