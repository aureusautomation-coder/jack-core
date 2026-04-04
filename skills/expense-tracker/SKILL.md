---
name: expense_tracker
description: Track daily expenses, view spending by category, and get monthly summaries. Use when the user mentions spending money, wants to log an expense, or asks about their spending.
metadata: {"openclaw":{"requires":{"bins":["curl"]}}}
---

# Expense Tracker Skill

Base URL: `http://localhost:18810`

## Endpoints

### Log an expense

```bash
curl -s -X POST http://localhost:18810/expenses \
  -H "Content-Type: application/json" \
  -d '{"amount": 45.50, "category": "transport", "description": "Grab to Changi Airport"}'
```

Fields:
- `amount` (required) — numeric amount
- `currency` — defaults to `"SGD"`
- `category` — defaults to `"general"` (normalized to lowercase)
- `description` — free text
- `date` — `YYYY-MM-DD`, defaults to today

### List expenses

```bash
# All expenses (default limit 50)
curl -s http://localhost:18810/expenses

# Filter by month
curl -s "http://localhost:18810/expenses?month=2026-04"

# Filter by category
curl -s "http://localhost:18810/expenses?category=transport"

# Filter by month and category with limit
curl -s "http://localhost:18810/expenses?month=2026-04&category=food&limit=10"
```

### Monthly summary

```bash
# Current month summary
curl -s http://localhost:18810/expenses/summary

# Specific month
curl -s "http://localhost:18810/expenses/summary?month=2026-04"
```

Returns total spending, count, breakdown by category, and the list of expenses for that month.

### Delete an expense

```bash
curl -s -X DELETE http://localhost:18810/expenses/EXPENSE_ID
```

### Health check

```bash
curl -s http://localhost:18810/health
```
