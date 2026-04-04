---
name: weekly_report
description: Generate a weekly business report as a PDF. Aggregates expenses, calendar events, and notes into a professional report. Use when the owner asks for a business report, weekly summary, or performance overview.
metadata: {"openclaw":{"requires":{"bins":["curl"]}}}
---

# Weekly Business Report Skill

Generates a professional PDF report with expenses, calendar, and notes data.

**Port:** 18812

## Generate a report

```bash
curl -s http://127.0.0.1:18812/report
```

Returns a JSON response with aggregated data + a PDF URL:
```json
{
  "week": { "start": "2026-03-31", "end": "2026-04-06", "label": "..." },
  "sections": { "expenses": {...}, "calendar": {...}, "notes": {...} },
  "pdf": { "ok": true, "url": "http://95.111.247.198/pdfs/weekly-report-xxx.pdf" }
}
```

Send the `pdf.url` to the owner as the weekly report.

## Configure report settings

```bash
curl -s -X POST http://127.0.0.1:18812/report/config \
  -H "Content-Type: application/json" \
  -d '{"companyName": "Aureus Automation", "ownerName": "Philip", "accentColor": "#f59e0b"}'
```

## Get current config

```bash
curl -s http://127.0.0.1:18812/report/config
```

## When to use

- Owner asks "give me my weekly report" or "business summary"
- Every Monday morning (can be triggered via cron for automated delivery)
- Owner asks "how did the business do this week?"

## Health check

```bash
curl -s http://127.0.0.1:18812/health
```
