---
name: browser_automation
description: Persistent browser automation with approval gates, audit trails, and policy guardrails. Navigate websites, fill forms, extract data, compare prices, and complete multi-step workflows — with human approval before any payments or submissions.
metadata: {"openclaw":{"requires":{"config":["browser.enabled"],"bins":["curl"]}}}
---

# Browser Automation Skill

You have access to a **persistent browser automation service** running on `http://127.0.0.1:18800`. Use the `exec` tool to run `curl` commands to interact with it. The browser maintains cookies and login sessions between tasks.

## Important Safety Rules

1. **NEVER submit a payment or booking** without setting `requiresApproval: true` on that step. Always require boss approval before committing money.
2. **NEVER enter passwords** unless the boss explicitly provides them for that specific site.
3. **Always include a screenshot step** before and after important actions so the boss can verify what happened.
4. **Stay within allowed domains** — set an `allowedDomains` policy to prevent accidental navigation to unauthorized sites.

## How to Submit a Browser Task

Use `exec` to POST a JSON task to the API. The task contains a `name`, an array of `steps`, and an optional `policy`.

### Basic Example — Visit a site and screenshot

```bash
curl -s -X POST http://127.0.0.1:18800/task \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Check business website",
    "steps": [
      { "action": { "type": "goto", "url": "https://www.example.com" } },
      { "action": { "type": "wait", "ms": 2000 } },
      { "action": { "type": "screenshot" } }
    ]
  }'
```

This returns `{"taskId": "task_xxx", "state": "queued"}`. The task runs immediately in the background.

### Check Task Result

```bash
curl -s http://127.0.0.1:18800/task/TASK_ID
```

Returns the full task with `state` (done/failed/running/etc.), `audit` trail, `result.screenshots`, and any extracted data.

### Full Example — Form fill with approval gate

```bash
curl -s -X POST http://127.0.0.1:18800/task \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Book appointment",
    "steps": [
      { "action": { "type": "goto", "url": "https://booking-site.com" } },
      { "action": { "type": "fill", "selector": "#name", "value": "Customer Name" } },
      { "action": { "type": "fill", "selector": "#phone", "value": "+6512345678" } },
      { "action": { "type": "screenshot" }, "description": "Review filled form" },
      {
        "action": { "type": "click", "selector": "#submit" },
        "requiresApproval": true,
        "description": "Submit booking — review before confirming"
      }
    ],
    "policy": {
      "maxBudget": 200,
      "allowedDomains": ["booking-site.com"]
    }
  }'
```

When the task reaches the approval step, it pauses in `waiting_approval` state. Show the boss the screenshot and step description, then wait for their decision.

## API Endpoints

All on `http://127.0.0.1:18800`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/task` | Create and execute a task (JSON body with name, steps, policy) |
| `GET` | `/task/:id` | Get task status, result, audit trail, and screenshots |
| `GET` | `/tasks` | List all tasks |
| `POST` | `/task/:id/approve` | Approve or reject: `{"approved": true}` or `{"approved": false, "reason": "too expensive"}` |
| `POST` | `/task/:id/otp` | Provide OTP code: `{"otp": "123456"}` |
| `POST` | `/task/:id/cancel` | Cancel a running task |
| `GET` | `/health` | Service health check |

## Action Types

| Action | Parameters | Description |
|--------|-----------|-------------|
| `goto` | `url` | Navigate to a URL |
| `click` | `selector` | Click an element by CSS selector |
| `clicktext` | `text` | Click an element by its visible text |
| `fill` | `selector`, `value` | Clear and fill an input field |
| `select` | `selector`, `value` | Choose a dropdown option |
| `screenshot` | — | Take a screenshot (path returned in results) |
| `wait` | `ms` | Wait for specified milliseconds |
| `waitfor` | `text`, `timeout?` | Wait for text to appear on page |
| `keyboard` | `key` | Press a keyboard key (Enter, Tab, Escape, etc.) |
| `scroll` | `direction`, `amount` | Scroll up or down by pixel amount |
| `evaluate` | `script` | Run JavaScript in the page |
| `extract` | `selector`, `attribute?` | Get text or attribute from an element |
| `otp` | `selector`, `prompt?` | Pause for OTP code, then fill into selector |

## Step Options

- `requiresApproval: true` — Pauses the task for boss approval before this step executes
- `description` — Human-readable description (shown in approval requests and audit trail)
- `retries` — Number of retry attempts if this step fails (default: 0)
- `timeout` — Timeout in milliseconds for this step

## Policy Options

- `maxBudget` — Maximum spend allowed (dollars)
- `allowedDomains` — Only these domains can be visited
- `blockedDomains` — These domains are always blocked (including subdomains)
- `timeWindowStart` / `timeWindowEnd` — SGT time window (e.g., "09:00" / "17:00")
- `maxRetries` — Default retry count for all steps

## Handling OTP / 2FA

When a task has an `otp` action, it pauses in `otp_required` state. Ask the boss for the verification code, then provide it:

```bash
curl -s -X POST http://127.0.0.1:18800/task/TASK_ID/otp \
  -H "Content-Type: application/json" \
  -d '{"otp": "284719"}'
```

## Handling Approval Gates

When a task reaches a step with `requiresApproval: true`, it pauses in `waiting_approval` state. Show the boss the screenshot and step description, wait for their decision:

```bash
# Approve — task continues
curl -s -X POST http://127.0.0.1:18800/task/TASK_ID/approve \
  -H "Content-Type: application/json" \
  -d '{"approved": true}'

# Reject — task is cancelled
curl -s -X POST http://127.0.0.1:18800/task/TASK_ID/approve \
  -H "Content-Type: application/json" \
  -d '{"approved": false, "reason": "Too expensive"}'
```

## Task States

- **queued** — Waiting to start
- **running** — Currently executing steps
- **waiting_approval** — Paused, waiting for boss to approve
- **otp_required** — Paused, waiting for OTP/verification code
- **done** — Completed successfully
- **failed** — An error occurred
- **cancelled** — Cancelled by boss or policy violation

## Build & Deploy Notes

- This skill is written in **TypeScript + Playwright-core**
- Runs on **port 18800**
- Build: `npm install && npm run build`
- Start: `npm start` (or via Openclaw skill runner)
- The compiled `dist/` is what runs — TypeScript source is in `src/`
- Requires `browser.enabled: true` in openclaw.json
