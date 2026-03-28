# CardWise AI

**Hackathon project — GDG NYC 2026**

An AI-powered personal credit card and financial advisor built with Gemini Live API (Native Audio 2.5).

## What it does

- **AI Advisor** — Chat or voice conversations with a Gemini-powered advisor that knows your cards, benefits, and spending
- **Live Voice** — Real-time bidirectional voice using Gemini Live Native Audio (multimodal: voice + camera)
- **Receipt / Media Analysis** — Upload a photo or video of a receipt and get a card recommendation
- **Card ROI Calculator** — See which cards earn the most based on your actual spending
- **Spend Guide** — Look up any merchant and see which card to swipe
- **Benefits Tracker** — Auto-tracks credits from Plaid-linked transactions
- **Wealth & Affordability** — Net worth tracker + 10x rule affordability check ("Can I afford an iPhone?")

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Backend | FastAPI (Python), Google GenAI SDK |
| AI | Gemini 2.5 Flash, Gemini Live Native Audio 2.5 |
| Deployment | Google Cloud Run |

## Project structure

```
cardwise/
  backend/     FastAPI server (card data, ROI, AI chat, live voice)
  frontend/    Next.js app
```

## Running locally

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
echo "GEMINI_API_KEY=your_key_here" > .env
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Google Cloud Run)

```bash
# Backend
cd backend
gcloud run deploy cardwise-backend --source . --region us-central1 --allow-unauthenticated --port 8080

# Frontend
cd frontend
gcloud run deploy cardwise-frontend --source . --region us-central1 --allow-unauthenticated --port 3000 \
  --set-build-env-vars NEXT_PUBLIC_API_URL=https://<your-backend-url>
```

## Hackathon track

Built for the **Live Agent** track — leverages Gemini Live API for real-time voice + vision conversations that maintain context across turns.
