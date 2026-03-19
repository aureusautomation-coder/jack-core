# Jack Core — CLAUDE.md

## Project Overview
Openclaw configuration templates, agent workspace templates, and skills for the Jack AI service.
Used to deploy new Jack AI clients on fresh VPS instances.

## Folder Structure
```
jack-core/
  agents/
    jack/         ← Owner PA agent template (SOUL.md, USER.md, TOOLS.md, AGENTS.md)
    faq/          ← Customer FAQ agent template
    marketing/    ← Marketing/content agent template
  skills/
    browser-automation/   ← Mark's Playwright browser automation skill
    booking-api/          ← SimplyBook API skill
  openclaw.json.example   ← Config template
```

## Deployment Steps (New Client)
1. Provision VPS (DigitalOcean, min 4GB RAM)
2. Install Tailscale on VPS
3. `npm install -g openclaw@latest && openclaw onboard --install-daemon`
4. Copy openclaw.json.example → ~/.openclaw/openclaw.json, fill in tokens
5. Copy agent workspaces → ~/.openclaw/workspace/agents/
6. Customise SOUL.md, USER.md, FAQ rules per client
7. Copy browser-automation skill → npm install → npm run build (Enterprise only)
8. Deploy simplybook-bot-backend if needed (Add-on)
9. Connect WhatsApp (scan QR) + Slack
10. Test all agents end-to-end

## Reference VPS (Jack/Pageant Lashes)
- Tailscale IP: 100.88.179.46
- SSH: `plink -ssh remote@100.88.179.46 -pw "27db3c2396f0db2a725a2128" -hostkey "SHA256:ZoQp9NwrcihB96K7EwaFJ+D/JE6pWcGsYWXIEkKH7Xo" "COMMAND"`
- Openclaw config: ~/openclaw.json
- Agent workspaces: ~/.openclaw/workspace/agents/
- Skills: ~/.openclaw/workspace/skills/
- SimplyBook backend: ~/simplybook-bot-backend/

## Key Notes
- Openclaw uses Baileys for WhatsApp (not whatsapp-web.js/Puppeteer)
- AI model: openai-codex/gpt-5.1 (OAuth) on reference VPS — can switch to Claude
- browser-automation skill runs on port 18800 (Playwright-based, built by Mark)
- booking-api skill connects to simplybook-bot-backend on port 3000
- Jack's TOOLS.md must instruct to use browser_automation skill, NOT built-in browser tool
- No PM2 — Openclaw runs as systemd daemon (openclaw-gateway process)
- GitHub repo: https://github.com/aureusautomation-coder/jack-core
