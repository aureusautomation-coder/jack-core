---
name: daily_briefing
description: Get a morning daily briefing with today's calendar events, weather forecast, and news headlines. Use when the user asks for their daily briefing or morning summary.
metadata: {"openclaw":{"requires":{"bins":["curl"]}}}
---

# Daily Briefing Skill

Aggregates data from local calendar, weather, and news services into a single structured morning briefing.

**Port:** 18811

## Endpoints

### GET /briefing

Compose and return today's briefing. Each section is fetched independently; if a source is down the briefing still returns with that section marked `available: false`.

Query parameters:

| Param      | Default          | Description              |
|------------|------------------|--------------------------|
| `city`     | `Singapore`      | City for weather lookup  |
| `timezone` | `Asia/Singapore` | IANA timezone for dates  |

```bash
# Full briefing with defaults
curl http://127.0.0.1:18811/briefing

# Specify city and timezone
curl "http://127.0.0.1:18811/briefing?city=Tokyo&timezone=Asia/Tokyo"
```

Response:

```json
{
  "date": "Friday, 4 April 2026",
  "greeting": "Good morning! Here's your daily briefing.",
  "sections": {
    "calendar": { "available": true, "events": [] },
    "weather": { "available": false, "summary": "...", "note": "..." },
    "news": { "available": true, "headlines": [] }
  },
  "generated_at": "2026-04-04T07:00:00.000Z"
}
```

### POST /briefing/config

Save briefing preferences to `./data/config.json`.

```bash
curl -X POST http://127.0.0.1:18811/briefing/config \
  -H "Content-Type: application/json" \
  -d '{"city":"Singapore","timezone":"Asia/Singapore","news_topics":["technology","singapore"],"briefing_time":"07:00"}'
```

### GET /briefing/config

Retrieve the current configuration.

```bash
curl http://127.0.0.1:18811/briefing/config
```

### GET /health

Health check.

```bash
curl http://127.0.0.1:18811/health
```

## Upstream Services

| Service  | URL                                   | Status      |
|----------|---------------------------------------|-------------|
| Calendar | `http://127.0.0.1:18803/events/today` | Optional    |
| News     | `http://127.0.0.1:18806/news?limit=5` | Optional    |
| Weather  | Placeholder (needs API key)           | Placeholder |

All upstream calls have a 5-second timeout. A failing upstream never breaks the briefing response.
