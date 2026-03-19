# browser-automation skill

Persistent Playwright-based browser automation for Openclaw agents. Runs as an HTTP service on port 18800.

## Features
- Persistent browser session (cookies/logins survive between tasks)
- Approval gates before payments or form submissions
- OTP/2FA support
- Audit trail with screenshots
- Policy guardrails (budget cap, domain allowlist, time windows)

## Deploy

```bash
npm install
npm run build
npm start   # or Openclaw registers it via skill runner
```

> **Note:** The compiled TypeScript source (`dist/`) is the runtime. Copy `dist/` from the reference VPS (Pageant Lashes, 100.88.179.46) for a working build, or rebuild from source if you have the TypeScript files.

## Usage

See `SKILL.md` for full API documentation and action types.
