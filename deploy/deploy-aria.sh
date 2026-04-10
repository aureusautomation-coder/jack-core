#!/bin/bash
# ============================================================================
# Aria AI — Automated Client Deployment Script
# Aureus Automation Pte Ltd
#
# Usage: bash deploy-aria.sh config.env
#
# This script sets up a complete Aria AI instance on a fresh Ubuntu VPS.
# Takes ~15-20 minutes to run end-to-end.
# ============================================================================

set -e

# ── Load config ──────────────────────────────────────────────────────────────
if [ -z "$1" ]; then
  echo "Usage: bash deploy-aria.sh <config.env>"
  echo "Example: bash deploy-aria.sh clients/jasmine.env"
  exit 1
fi

source "$1"

# ── Validate required vars ───────────────────────────────────────────────────
REQUIRED_VARS="CLIENT_NAME BOT_NAME ANTHROPIC_API_KEY OWNER_TELEGRAM_ID OWNER_DISPLAY_NAME TIMEZONE"
for var in $REQUIRED_VARS; do
  if [ -z "${!var}" ]; then
    echo "ERROR: $var is not set in config file"
    exit 1
  fi
done

echo "============================================"
echo "  Aria AI — Automated Deployment"
echo "  Client: $CLIENT_NAME"
echo "  Bot Name: $BOT_NAME"
echo "  Timezone: $TIMEZONE"
echo "============================================"
echo ""

# ── Defaults ─────────────────────────────────────────────────────────────────
OPENCLAW_PORT=${OPENCLAW_PORT:-18789}
BROWSER_PORT=${BROWSER_PORT:-18800}
MEDIA_PORT=${MEDIA_PORT:-18801}
PDF_PORT=${PDF_PORT:-18802}
CALENDAR_PORT=${CALENDAR_PORT:-18803}
TTS_PORT=${TTS_PORT:-18804}
UTILS_PORT=${UTILS_PORT:-18805}
COMMS_PORT=${COMMS_PORT:-18806}
SMART_NOTES_PORT=${SMART_NOTES_PORT:-18809}
EXPENSE_TRACKER_PORT=${EXPENSE_TRACKER_PORT:-18810}
DAILY_BRIEFING_PORT=${DAILY_BRIEFING_PORT:-18811}
WEEKLY_REPORT_PORT=${WEEKLY_REPORT_PORT:-18812}
WEBCHAT_PORT=${WEBCHAT_PORT:-18808}
CLAUDE_MODEL=${CLAUDE_MODEL:-"anthropic/claude-haiku-4-5-20251001"}
SERVER_HOST=${SERVER_HOST:-"http://$(hostname -I | awk '{print $1}')"}
GATEWAY_PASSWORD=${GATEWAY_PASSWORD:-$(openssl rand -hex 24)}
PERSONALITY=${PERSONALITY:-"Warm, clear, practical. No fluff, just useful help."}
ADDRESS_AS=${ADDRESS_AS:-$OWNER_DISPLAY_NAME}

echo "Step 1/10: System packages..."
# ── Step 1: System packages ──────────────────────────────────────────────────
apt-get update -qq
apt-get install -y -qq curl wget git unzip htop ffmpeg python3 python3-pip ufw fail2ban nginx certbot python3-certbot-nginx > /dev/null 2>&1

# Firewall
ufw allow OpenSSH > /dev/null 2>&1
ufw allow 80/tcp > /dev/null 2>&1
ufw allow 443/tcp > /dev/null 2>&1
ufw allow $OPENCLAW_PORT/tcp > /dev/null 2>&1
ufw allow $BROWSER_PORT/tcp > /dev/null 2>&1
echo "y" | ufw enable > /dev/null 2>&1

# Fail2ban
systemctl enable fail2ban > /dev/null 2>&1
systemctl start fail2ban > /dev/null 2>&1

# Edge-TTS for multi-language voice
pip3 install --break-system-packages edge-tts > /dev/null 2>&1

# Set timezone
timedatectl set-timezone "$TIMEZONE" 2>/dev/null || true

echo "  Done."

echo "Step 2/10: Node.js v22..."
# ── Step 2: Node.js ──────────────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash > /dev/null 2>&1
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  nvm install 22 > /dev/null 2>&1
  nvm use 22 > /dev/null 2>&1
fi

NODE_BIN=$(which node)
NODE_DIR=$(dirname "$NODE_BIN")
echo "  Node: $(node --version) at $NODE_BIN"

echo "Step 3/10: OpenClaw..."
# ── Step 3: OpenClaw ─────────────────────────────────────────────────────────
if ! command -v openclaw &> /dev/null; then
  npm install -g openclaw@latest > /dev/null 2>&1
fi
echo "  OpenClaw: $(openclaw --version 2>/dev/null | head -1 || echo 'installed')"

echo "Step 4/10: OpenClaw config..."
# ── Step 4: OpenClaw configuration ───────────────────────────────────────────
OPENCLAW_DIR="$HOME/.openclaw"
WORKSPACE="$OPENCLAW_DIR/workspace"
AGENT_DIR="$WORKSPACE/agents/${BOT_NAME,,}"
SKILLS_DIR="$WORKSPACE/skills"

mkdir -p "$AGENT_DIR" "$SKILLS_DIR"
mkdir -p /var/www/{screenshots,pdfs,audio,qrcodes}

cat > "$OPENCLAW_DIR/openclaw.json" << OCEOF
{
  "auth": {
    "profiles": {
      "anthropic:default": {
        "provider": "anthropic",
        "mode": "api_key"
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "$CLAUDE_MODEL"
      },
      "models": {
        "anthropic/claude-haiku-4-5-20251001": { "alias": "haiku" },
        "anthropic/claude-sonnet-4-6": { "alias": "sonnet", "params": { "cacheRetention": "long" } }
      },
      "workspace": "$WORKSPACE",
      "contextPruning": { "mode": "cache-ttl", "ttl": "1h" },
      "compaction": { "mode": "safeguard" },
      "timeoutSeconds": 120,
      "maxConcurrent": 1,
      "subagents": { "maxConcurrent": 8 }
    },
    "list": [
      {
        "id": "${BOT_NAME,,}",
        "workspace": "$AGENT_DIR",
        "tools": { "profile": "full" }
      }
    ]
  },
  "tools": {
    "web": { "search": { "enabled": true }, "fetch": { "enabled": true } }
  },
  "bindings": [
    {
      "agentId": "${BOT_NAME,,}",
      "match": { "channel": "telegram" }
    }
  ],
  "commands": {
    "native": "auto",
    "nativeSkills": "auto",
    "restart": true,
    "ownerAllowFrom": ["*"],
    "ownerDisplay": "raw"
  },
  "session": { "dmScope": "per-channel-peer" },
  "channels": {
    "telegram": {
      "enabled": ${TELEGRAM_BOT_TOKEN:+true}${TELEGRAM_BOT_TOKEN:-false},
      "botToken": "${TELEGRAM_BOT_TOKEN:-__PLACEHOLDER__}",
      "dmPolicy": "open",
      "groupPolicy": "allowlist",
      "streaming": "partial",
      "allowFrom": ["*"]
    }
  },
  "gateway": {
    "port": $OPENCLAW_PORT,
    "mode": "local",
    "bind": "loopback",
    "auth": {
      "mode": "password",
      "password": "$GATEWAY_PASSWORD"
    },
    "controlUi": {
      "allowedOrigins": ["http://127.0.0.1:$OPENCLAW_PORT"],
      "dangerouslyDisableDeviceAuth": true
    }
  },
  "plugins": {},
  "meta": {}
}
OCEOF

# Anthropic credentials
mkdir -p "$OPENCLAW_DIR/credentials"
cat > "$OPENCLAW_DIR/credentials/default.json" << CREDEOF
{
  "anthropic:default": {
    "apiKey": "$ANTHROPIC_API_KEY"
  }
}
CREDEOF
chmod 600 "$OPENCLAW_DIR/credentials/default.json"

echo "  Config written."

echo "Step 5/10: Agent personality..."
# ── Step 5: Agent files ──────────────────────────────────────────────────────
cat > "$AGENT_DIR/SOUL.md" << SOULEOF
# SOUL.md - $BOT_NAME (Owner PA)

You are **$BOT_NAME**, an AI Chief of Staff — the main personal assistant for $OWNER_DISPLAY_NAME.

## Identity
- Name: $BOT_NAME
- Role: AI Chief of Staff / Personal Assistant
- Channels: Telegram
- Vibe: $PERSONALITY

## Your Owner
- **Name:** $OWNER_DISPLAY_NAME
- **Telegram ID:** $OWNER_TELEGRAM_ID
- IMPORTANT: The person messaging you on Telegram IS your owner. Always treat them as your boss.

## Responsibilities
- Help with business operations, calendar, email, research, notes, expenses
- Customer communication drafts and refinement
- Personal tasks: notes, scheduling, content planning
- Browser automation: screenshots, forms, competitor research
- Maintain and use internal context from MEMORY

## Behavior
- Address your owner as "$ADDRESS_AS"
- Prioritize the owner's intent and preferences
- Be honest and direct; avoid generic filler
- Keep replies concise — this is messaging, not email

## Voice Messages
When the owner asks for a voice message or to "say something", use the TTS service via exec + curl to generate an MP3 file and send them the URL.

### Auto voice reply rule
When the owner sends you a **voice message** (audio/transcribed), ALWAYS reply with BOTH:
1. A normal text reply
2. A voice reply in the **same language** they spoke in

Supported TTS languages: English (en), Chinese (zh), Malay (ms), Tamil (ta), Japanese (ja), Korean (ko), Indonesian (id). See TOOLS.md for curl examples.

## Model Switching (Cost Optimization)
You run on **Claude Haiku** by default to keep costs low. For complex tasks (deep analysis, strategy, creative writing), suggest the owner type /model sonnet. After completing, suggest /model haiku to switch back.
SOULEOF

# Copy TOOLS.md template from jack-core if available, else create minimal
if [ -f "/tmp/jack-core-tools.md" ]; then
  cp /tmp/jack-core-tools.md "$AGENT_DIR/TOOLS.md"
else
  cat > "$AGENT_DIR/TOOLS.md" << TOOLSEOF
# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for specifics unique to this setup.

## Voice Replies (port $TTS_PORT)

Use the TTS service to generate voice messages:
\`\`\`bash
curl -s -X POST http://127.0.0.1:$TTS_PORT/speak \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Your reply", "language": "en"}'
\`\`\`

Languages: en, zh, ms, ta, ja, ko, id

## Smart Notes (port $SMART_NOTES_PORT)
Use smart_notes skill to save, search, and retrieve notes.

## Expense Tracker (port $EXPENSE_TRACKER_PORT)
Use expense_tracker skill to log expenses and get monthly summaries.

## Daily Briefing (port $DAILY_BRIEFING_PORT)
Use daily_briefing skill for morning briefing with calendar + weather + news.

## Weekly Report (port $WEEKLY_REPORT_PORT)
Use weekly_report skill to generate PDF business reports.
TOOLSEOF
fi

cat > "$AGENT_DIR/USER.md" << USEREOF
# USER.md
Owner: $OWNER_DISPLAY_NAME
Business: $CLIENT_NAME
USEREOF

cat > "$AGENT_DIR/AGENTS.md" << AGENTSEOF
# AGENTS.md
Single agent mode. $BOT_NAME handles all conversations.
AGENTSEOF

touch "$AGENT_DIR/MEMORY.md"

echo "  Agent '$BOT_NAME' created."

echo "Step 6/10: Deploying skills..."
# ── Step 6: Deploy skill servers ─────────────────────────────────────────────
JACK_CORE_URL="https://github.com/aureusautomation-coder/jack-core.git"

# Clone jack-core to get skill source code
if [ ! -d "/tmp/jack-core" ]; then
  git clone --depth 1 "$JACK_CORE_URL" /tmp/jack-core > /dev/null 2>&1
fi

# Copy all skills
for skill in smart-notes expense-tracker daily-briefing tts weekly-report; do
  if [ -d "/tmp/jack-core/skills/$skill" ]; then
    cp -r "/tmp/jack-core/skills/$skill" "$SKILLS_DIR/$skill"
    echo "  Copied: $skill"
  fi
done

# Install browser automation (Playwright)
echo "  Installing Playwright + Chromium (this takes a few minutes)..."
if [ -d "/tmp/jack-core/skills/browser-automation" ]; then
  cp -r "/tmp/jack-core/skills/browser-automation" "$SKILLS_DIR/browser-automation"
fi

# Create browser automation server if not from jack-core
if [ ! -f "$SKILLS_DIR/browser-automation/server.mjs" ]; then
  mkdir -p "$SKILLS_DIR/browser-automation"
  cat > "$SKILLS_DIR/browser-automation/package.json" << BPEOF
{"name":"browser-automation","version":"1.0.0","type":"module","scripts":{"start":"node server.mjs"},"dependencies":{"express":"^4.18.0","playwright":"^1.40.0"}}
BPEOF
fi

# Install npm deps for skills that need them
for skill_dir in "$SKILLS_DIR"/*/; do
  if [ -f "$skill_dir/package.json" ] && [ -f "$skill_dir/server.mjs" ]; then
    if [ ! -d "$skill_dir/node_modules" ]; then
      cd "$skill_dir"
      npm install --production > /dev/null 2>&1 || true
      cd -  > /dev/null
    fi
  fi
done

# Install Playwright browsers
npx playwright install chromium > /dev/null 2>&1 || true

echo "  Skills deployed."

echo "Step 7/10: Systemd services..."
# ── Step 7: Systemd services ────────────────────────────────────────────────

create_service() {
  local name=$1
  local port=$2
  local dir=$3
  local desc=$4
  local extra_env=$5

  cat > "/etc/systemd/system/$name.service" << SVCEOF
[Unit]
Description=$desc
After=network.target

[Service]
Type=simple
WorkingDirectory=$dir
ExecStart=$NODE_BIN server.mjs
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=SERVER_HOST=$SERVER_HOST
$extra_env

[Install]
WantedBy=multi-user.target
SVCEOF
}

# Gateway service
cat > "/etc/systemd/system/openclaw-gateway.service" << GWEOF
[Unit]
Description=OpenClaw Gateway ($BOT_NAME AI)
After=network.target

[Service]
Type=simple
Environment=HOME=$HOME
Environment=PATH=$NODE_DIR:/usr/local/bin:/usr/bin:/bin
Environment=ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
Environment=GOG_KEYRING_PASSWORD=${GOG_KEYRING_PASSWORD:-aria2026}
ExecStart=$(which openclaw) gateway
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
GWEOF

# Skill services
create_service "smart-notes" "$SMART_NOTES_PORT" "$SKILLS_DIR/smart-notes" "Smart Notes (port $SMART_NOTES_PORT)"
create_service "expense-tracker" "$EXPENSE_TRACKER_PORT" "$SKILLS_DIR/expense-tracker" "Expense Tracker (port $EXPENSE_TRACKER_PORT)"
create_service "daily-briefing" "$DAILY_BRIEFING_PORT" "$SKILLS_DIR/daily-briefing" "Daily Briefing (port $DAILY_BRIEFING_PORT)"
create_service "weekly-report" "$WEEKLY_REPORT_PORT" "$SKILLS_DIR/weekly-report" "Weekly Report (port $WEEKLY_REPORT_PORT)"
create_service "tts" "$TTS_PORT" "$SKILLS_DIR/tts" "Text-to-Speech (port $TTS_PORT)" "Environment=REPLICATE_API_TOKEN=${REPLICATE_API_TOKEN:-}"

if [ -f "$SKILLS_DIR/browser-automation/server.mjs" ]; then
  create_service "browser-automation" "$BROWSER_PORT" "$SKILLS_DIR/browser-automation" "Browser Automation (port $BROWSER_PORT)"
fi

# Enable and start all services
systemctl daemon-reload
for svc in openclaw-gateway smart-notes expense-tracker daily-briefing weekly-report tts; do
  systemctl enable "$svc" > /dev/null 2>&1
  systemctl start "$svc" 2>/dev/null || true
done

if [ -f "$SKILLS_DIR/browser-automation/server.mjs" ]; then
  systemctl enable browser-automation > /dev/null 2>&1
  systemctl start browser-automation 2>/dev/null || true
fi

echo "  Services started."

echo "Step 8/10: Nginx..."
# ── Step 8: Nginx configuration ─────────────────────────────────────────────
cat > "/etc/nginx/sites-available/${BOT_NAME,,}-landing" << NGXEOF
server {
    listen 80;
    server_name _;

    root /var/www/${BOT_NAME,,}-landing;
    index index.html;

    location /screenshots/ { alias /var/www/screenshots/; expires 1d; }
    location /pdfs/ { alias /var/www/pdfs/; expires 1d; }
    location /audio/ { alias /var/www/audio/; expires 1d; }
    location /qrcodes/ { alias /var/www/qrcodes/; expires 1d; }

    location / {
        try_files \$uri \$uri/ =404;
    }
}
NGXEOF

ln -sf "/etc/nginx/sites-available/${BOT_NAME,,}-landing" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t > /dev/null 2>&1 && systemctl reload nginx

mkdir -p "/var/www/${BOT_NAME,,}-landing"
echo "<h1>$BOT_NAME AI — Coming Soon</h1>" > "/var/www/${BOT_NAME,,}-landing/index.html"

echo "  Nginx configured."

echo "Step 9/10: Health checks..."
# ── Step 9: Health checks ───────────────────────────────────────────────────
sleep 5
CHECKS_PASSED=0
CHECKS_TOTAL=0

check_service() {
  local name=$1
  local port=$2
  CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
  if curl -s "http://127.0.0.1:$port/health" > /dev/null 2>&1; then
    echo "  ✓ $name (port $port)"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    echo "  ✗ $name (port $port) — NOT RESPONDING"
  fi
}

check_service "Smart Notes" "$SMART_NOTES_PORT"
check_service "Expense Tracker" "$EXPENSE_TRACKER_PORT"
check_service "Daily Briefing" "$DAILY_BRIEFING_PORT"
check_service "Weekly Report" "$WEEKLY_REPORT_PORT"
check_service "TTS" "$TTS_PORT"

if systemctl is-active --quiet browser-automation 2>/dev/null; then
  check_service "Browser Automation" "$BROWSER_PORT"
fi

echo "  $CHECKS_PASSED/$CHECKS_TOTAL services healthy."

echo "Step 10/10: Summary..."
# ── Step 10: Summary ────────────────────────────────────────────────────────
VPS_IP=$(hostname -I | awk '{print $1}')

cat << SUMMARY

============================================
  DEPLOYMENT COMPLETE
============================================

Client:          $CLIENT_NAME
Bot Name:        $BOT_NAME
VPS IP:          $VPS_IP
Model:           $CLAUDE_MODEL
Gateway Port:    $OPENCLAW_PORT
Gateway Password: $GATEWAY_PASSWORD

Services Running:
  - OpenClaw Gateway  : $OPENCLAW_PORT
  - Smart Notes       : $SMART_NOTES_PORT
  - Expense Tracker   : $EXPENSE_TRACKER_PORT
  - Daily Briefing    : $DAILY_BRIEFING_PORT
  - Weekly Report     : $WEEKLY_REPORT_PORT
  - TTS (7 languages) : $TTS_PORT
  - Browser Automation: $BROWSER_PORT

Static Files:
  - Screenshots: $SERVER_HOST/screenshots/
  - PDFs:        $SERVER_HOST/pdfs/
  - Audio:       $SERVER_HOST/audio/

REMAINING MANUAL STEPS:
  1. Connect Telegram: Set TELEGRAM_BOT_TOKEN in openclaw.json
  2. Connect WhatsApp: Add WhatsApp plugin config
  3. Google Workspace: Install gog CLI + OAuth dance
  4. SSL Certificate:  certbot --nginx -d yourdomain.com
  5. Custom domain:    Update Nginx server_name + DNS
  6. Test all skills via Telegram

GATEWAY PASSWORD (save this):
  $GATEWAY_PASSWORD

============================================
SUMMARY
