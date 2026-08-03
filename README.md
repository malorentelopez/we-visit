# We-Visit

Phone-first PWA to search a venue, gather attractions from OpenStreetMap, build an optimized day plan, and follow it **offline** in crowded parks and museums.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- IndexedDB for offline packs / visit progress
- Nominatim + Overpass (proxied, cached, throttled)
- EN / ES UI strings

## Develop

```bash
npm install
cp env.example .env.local   # optional: enable AI smart routes
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### AI smart routes (recommended: Gemini)

For park-guide style ordering, use **Google Gemini 2.5 Flash** (free tier via [Google AI Studio](https://aistudio.google.com/apikey)):

1. Create an API key in AI Studio  
2. Put it in `.env.local` as `GEMINI_API_KEY=...`  
3. Restart `npm run dev`  
4. On prepare, leave **Smart route (AI)** on

If the key is missing or AI fails, the app falls back to the local heuristic planner.

## QA venues

```bash
npm run qa:venues
```

Checks Nominatim + Overpass richness for Parque Warner Madrid, Museo del Prado, and Disneyland Paris.

## Notes

- Progress stays on the device (no accounts).
- Map data © OpenStreetMap contributors.
- Queue-Times enrichment is stubbed for later (`src/lib/park/queueTimes.ts`).
