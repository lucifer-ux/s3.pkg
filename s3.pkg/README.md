# 🛍️ AI Shopping Assistant

> A conversational, voice-enabled mobile shopping assistant that helps users discover, compare, and purchase products — powered by Claude and real-time web research.

---

## ✨ Overview

AI Shopping Assistant reimagines the retail experience on mobile. Instead of browsing endless category pages, users simply talk — or type — and an AI guide helps them find the best product, compare options with real-time web-sourced specs, and add to inventory in one fluid flow.

Key design principles:
- **Conversation first** — every interaction starts with natural language, text or voice
- **Research-backed comparisons** — specs are fetched live from the web, normalized, and cached
- **Merchant-aware** — inventory, pricing, discounts, and priority SKUs are baked into the AI context
- **Voice-native** — users can speak freely; the AI responds in natural conversational speech

---

## 🎯 Features

| Feature | Description |
|---|---|
| 💬 Conversational UI | LLM-driven chat with inline quick-reply chips and clarifying questions |
| 🎤 Voice agent | Speak your query; AI responds in spoken natural language |
| 🔍 Smart product discovery | AI asks budget and preference questions, returns 4–5 ranked results |
| ⚖️ Side-by-side comparison | Select up to 4 models; per-spec winner badges + summary verdict |
| 💡 Better deal nudge | If a higher-value SKU exists at the same price, the AI flags it with a Swap button |
| 🔌 Accessory pairing | After device selection, AI recommends compatible accessories |
| 🗂️ Save for later | Persist comparisons and shortlists across sessions |
| 🛒 Inventory cart | Confirm selections and push directly to merchant inventory |

---

## 🖼️ Screen Flow

```
Landing (chat)
    │
    ├── Voice input active
    │
    └── Clarifying questions (budget, features)
            │
            └── Product grid (2-col cards, select to compare)
                    │
                    ├── Side-by-side comparison → Winner verdict
                    │
                    └── Product detail
                            │
                            ├── Better deal nudge → Swap / Keep
                            │
                            └── Accessory pairing
                                    │
                                    └── Cart → Confirm & add to inventory
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile Frontend                       │
│         (React Native / PWA — Tailwind + shadcn)        │
└────────────────────┬────────────────────────────────────┘
                     │ REST / WebSocket
┌────────────────────▼────────────────────────────────────┐
│                  Backend API (Node.js)                   │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Voice Layer │  │LLM Orchestr. │  │  Web Research  │  │
│  │             │  │              │  │                │  │
│  │ Web Speech  │  │ Claude API   │  │ Claude +       │  │
│  │ (STT)       │  │ Streaming    │  │ web_search     │  │
│  │ ElevenLabs  │  │ Session mem  │  │ Spec scraping  │  │
│  │ (TTS)       │  │ (Redis)      │  │ Cache (24h)    │  │
│  │ VAD silence │  │ Tool calls   │  │ Spec JSON norm │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Comparison Engine                      │ │
│  │  Merchant inventory + pricing + discounts           │ │
│  │  Per-spec winner scoring · Swap suggestion logic    │ │
│  │  Accessory compatibility matching                   │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                Merchant Data Layer                       │
│        Inventory DB · Pricing API · Discount Rules       │
└─────────────────────────────────────────────────────────┘
```

---

## 🧠 How the AI Works

### Intent & Conversation
Every user message goes to Claude with a system prompt that contains:
- Merchant inventory snapshot (refreshed daily)
- Active discounts and priority SKUs
- User's session history and stated preferences

Claude returns structured JSON tool calls that the backend resolves against the product catalog.

### Voice Agent
```
User speaks → Web Speech API (STT) → Live transcript → Claude
Claude responds → Short conversational text (≤2 sentences) → ElevenLabs TTS → Streamed audio
```

The system prompt instructs Claude: *"Respond in natural conversational speech. Maximum two sentences. No bullet points or markdown."*

Voice activity detection (VAD) auto-stops the mic after 1.5 s of silence so the experience feels hands-free.

### Web Research for Comparisons
When a comparison is triggered:

1. Backend fires a Claude API call with `web_search` tool enabled
2. Claude fetches specs from sources like GSMArena, NDTV Gadgets, and manufacturer pages
3. Raw HTML is normalized into a structured spec JSON object:
   ```json
   {
     "battery": "5000mAh",
     "camera_main": "50MP f/1.8",
     "ram": "8GB",
     "storage": "128GB",
     "display": "6.7\" AMOLED 120Hz"
   }
   ```
4. Spec objects are cached in Redis with a 24 h TTL
5. A second Claude call sees both spec JSONs + merchant pricing and generates the winner verdict

### Better Deal Swap Logic
After device selection, the comparison engine:
- Finds all SKUs within ±10% of the selected device's price
- Scores them against the user's stated preference weights (camera, battery, RAM, etc.)
- If a higher-scoring SKU exists, flags it as a swap suggestion
- Claude writes the natural language explanation for the swap

---

## 🗂️ Project Structure

```
/
├── apps/
│   ├── mobile/              # React Native / PWA frontend
│   │   ├── screens/
│   │   │   ├── Chat.tsx
│   │   │   ├── ProductGrid.tsx
│   │   │   ├── Compare.tsx
│   │   │   ├── ProductDetail.tsx
│   │   │   ├── Accessories.tsx
│   │   │   └── Cart.tsx
│   │   └── components/
│   │       ├── VoiceInput/
│   │       ├── ProductCard/
│   │       ├── CompareTable/
│   │       ├── SwapBanner/
│   │       └── CompareTray/
│   └── api/                 # Node.js backend
│       ├── routes/
│       ├── services/
│       │   ├── llm.ts       # Claude orchestration
│       │   ├── voice.ts     # STT/TTS integration
│       │   ├── research.ts  # Web research + spec normalization
│       │   ├── compare.ts   # Comparison engine
│       │   └── merchant.ts  # Inventory + discount rules
│       └── cache/           # Redis session + spec cache
├── prompts/                 # System prompt templates
│   ├── merchant-context.md
│   ├── comparison-verdict.md
│   └── voice-persona.md
└── docs/
    └── screen-designs/      # Stitch design exports
```

---

## 🚀 Phased Build Plan

### Phase 1 — Core chat & catalog (~3 weeks)
- [ ] Conversational chat UI with Claude
- [ ] Intent extraction and clarifying question chips
- [ ] Merchant system prompt integration (inventory, pricing, discounts)
- [ ] Product grid with AI reasoning snippets
- [ ] Basic buy now → cart → inventory confirm flow

### Phase 2 — Comparison engine (~3 weeks)
- [ ] Web research pipeline (Claude + web_search)
- [ ] Spec scraping and normalization
- [ ] Redis caching layer (24 h TTL)
- [ ] Side-by-side comparison UI
- [ ] Per-spec winner badges and summary verdict

### Phase 3 — Voice + swap nudge (~2 weeks)
- [ ] Web Speech API STT integration
- [ ] ElevenLabs TTS with audio streaming
- [ ] Voice waveform UI + live transcript strip
- [ ] VAD silence detection
- [ ] Better deal swap suggestion engine + swap UI

### Phase 4 — Accessories, saved lists, polish (~2 weeks)
- [ ] Accessory pairing (LLM-based compatibility matching)
- [ ] Save for later / session persistence
- [ ] Cross-category comparison support
- [ ] Offer and discount badge rules engine
- [ ] Analytics events + performance tuning

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Mobile frontend | React Native + Expo (or PWA with Next.js) |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Node.js + Express / Fastify |
| AI / LLM | Anthropic Claude API (streaming) |
| Voice STT | Web Speech API (on-device) |
| Voice TTS | ElevenLabs (streaming audio) |
| Web research | Claude with `web_search` tool |
| Session cache | Redis |
| Spec cache | Redis (24 h TTL) |
| Database | PostgreSQL (inventory + orders) |

---

## ⚙️ Getting Started

### Prerequisites
- Node.js 20+
- Redis
- Anthropic API key
- ElevenLabs API key (for voice TTS)

### Installation

```bash
git clone https://github.com/your-org/ai-shopping-assistant.git
cd ai-shopping-assistant
npm install
```

### Environment Variables

```env
# .env
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://...
MERCHANT_ID=...
```

### Run locally

```bash
# Start backend API
npm run dev:api

# Start mobile / PWA frontend
npm run dev:mobile
```

---

## 🎨 Design

Screen designs were prototyped in **Google Stitch** across three batches:

- **Batch 1** — Conversational landing, voice input active, clarifying questions
- **Batch 2** — Product grid, side-by-side comparison, better deal nudge
- **Batch 3** — Accessory pairing, saved comparisons, inventory cart

Design language: minimal white + deep indigo/teal accent, generous padding, rounded pill chips, floating action bars.

---

## 📄 License

MIT © your-org