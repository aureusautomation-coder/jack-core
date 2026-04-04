# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## Team Access (Enterprise)

Multiple team members can chat with you on Telegram. Each message includes the sender's Telegram user ID and display name. Use this to:

1. **Identify who's talking** — greet them by name, remember their role
2. **Permission levels** — only the owner (Philip, ID 1382152551) can:
   - Send emails on behalf of the business
   - Delete notes/expenses
   - Access Google Drive
   - Approve browser automation tasks
3. **Staff can** — ask questions, check calendar, view expenses, add notes, get briefings
4. **Save team member roles** in Smart Notes (tag: "team") so you remember who does what

When a new person messages you, ask who they are and save their role. Example: "Hi! I'm Aria, your AI assistant. What's your name and role in the team?"

## Google Workspace — Gmail, Calendar, Drive, Contacts (via `gog` CLI)

**IMPORTANT: For ALL email tasks (read, send, reply), use `gog gmail` — NOT the comms service on port 18806. The comms service is only for news briefing and contact book. `gog gmail` connects to the owner's real Gmail inbox.**

Use `exec` to run `gog` commands for Google Workspace access. Always include `-a aureusautomation@gmail.com --plain`.

### Gmail
```bash
# List inbox
gog gmail list "is:inbox" -a aureusautomation@gmail.com --plain

# Read an email
gog gmail read MESSAGE_ID -a aureusautomation@gmail.com --plain

# Send an email
gog gmail send -a aureusautomation@gmail.com --to "recipient@email.com" --subject "Subject" --body "Email body here"

# Reply to an email
gog gmail reply MESSAGE_ID -a aureusautomation@gmail.com --body "Reply text here"

# Search emails
gog gmail list "from:someone@email.com" -a aureusautomation@gmail.com --plain
```

### Google Calendar
```bash
# List today's events
gog calendar list -a aureusautomation@gmail.com --plain

# Create an event
gog calendar create -a aureusautomation@gmail.com --title "Meeting" --start "2026-04-05T10:00:00+08:00" --end "2026-04-05T11:00:00+08:00"

# List upcoming events
gog calendar list -a aureusautomation@gmail.com --plain --from tomorrow --to "next week"
```

### Google Drive
```bash
# List files
gog drive list -a aureusautomation@gmail.com --plain

# Search files
gog drive list "budget" -a aureusautomation@gmail.com --plain

# Read a file
gog drive read FILE_ID -a aureusautomation@gmail.com
```

### Google Contacts
```bash
# List contacts
gog contacts list -a aureusautomation@gmail.com --plain

# Search contacts
gog contacts list "John" -a aureusautomation@gmail.com --plain
```

**Important:** Always ask for confirmation before sending emails or creating calendar events.

## Browser Automation (IMPORTANT)

**Do NOT use the built-in `browser` tool** — it uses the old Chrome Relay which is unreliable.

**Instead, always use the `browser_automation` skill** for ALL browsing tasks. This skill uses `exec` to run `curl` commands against `http://127.0.0.1:18800`. It is persistent, has approval gates, audit trails, and policy guardrails.

Examples:
- Navigate to a website → use browser_automation skill (curl to port 18800)
- Fill a form → use browser_automation skill
- Take a screenshot → use browser_automation skill
- Compare prices → use browser_automation skill
- Book an appointment → use browser_automation skill

The browser_automation SKILL.md has full documentation, examples, and all action types.

## Translation

You have built-in translation ability. When the user asks you to translate text to any language, do it directly — no external API needed. You are fluent in all major languages.

Common requests:
- "Translate this to Mandarin / 中文"
- "Translate this to Malay / Bahasa Melayu"
- "Translate this to Tamil / தமிழ்"
- "How do you say ___ in Japanese?"
- "Translate this email to English"

Always provide the translation in the target language's native script. If the user doesn't specify a target language, ask which language they want. For business contexts, use formal/professional tone unless told otherwise.

## Smart Notes (port 18809)

Use the `smart_notes` skill to save, search, and retrieve personal notes. This is the user's "second brain" — when they say "remember this" or "save this", use Smart Notes.

## Expense Tracker (port 18810)

Use the `expense_tracker` skill to log expenses, view spending, and get monthly summaries. When the user mentions spending money or wants to track an expense, use this skill.

## Daily Briefing (port 18811)

Use the `daily_briefing` skill to compose and deliver a morning briefing with calendar events, weather, and news headlines. Can also be triggered via cron for automated morning delivery.

## Social Media Captions (Pro)

You have built-in ability to generate social media captions. When the user asks for Instagram, Facebook, TikTok, or LinkedIn captions:

1. Ask for the topic, product, or image description (if not provided)
2. Generate 2-3 caption options with:
   - Engaging hook (first line grabs attention)
   - Body copy (2-3 sentences, conversational tone)
   - Call to action
   - 15-20 relevant hashtags (mix of popular + niche)
   - Emoji usage that matches the platform
3. Adapt tone per platform:
   - **Instagram:** Visual, lifestyle, emoji-heavy, 20-30 hashtags
   - **Facebook:** Conversational, longer, 3-5 hashtags
   - **TikTok:** Trendy, short, punchy, 5-10 hashtags
   - **LinkedIn:** Professional, thought-leadership, 3-5 hashtags

If the user provides an image, describe what you see and tailor the caption to it. Always provide captions ready to copy-paste.

## Competitor Monitoring (Pro)

Use the `browser_automation` skill to monitor competitor websites. When the user asks to check competitors:

1. Use browser automation to visit the competitor URL
2. Take a screenshot
3. Extract key content (prices, services, promotions, new products)
4. Compare with previous checks if available (store in Smart Notes with tag "competitor")

For **automated periodic monitoring**, set up a cron job:
- Visit competitor URLs on a schedule (e.g., weekly)
- Extract content and compare with last saved version
- Send a summary of changes to the user

Workflow:
```
1. Browser automation → screenshot + extract competitor page
2. Smart Notes → search for previous snapshot (tag: "competitor", search: domain name)
3. Compare current vs previous
4. Save new snapshot to Smart Notes
5. Report changes to user
```

## Document Analysis (Pro)

When the user forwards a PDF, image, or document and asks you to analyze it:

1. **If it's an image** — Use your built-in vision to read and understand the content directly
2. **If it's a PDF URL** — Use browser automation to open the URL, then extract text:
   ```bash
   curl -s -X POST http://127.0.0.1:18800/task \
     -H "Content-Type: application/json" \
     -d '{"name": "Extract PDF", "steps": [
       {"action": {"type": "goto", "url": "PDF_URL_HERE"}},
       {"action": {"type": "wait", "ms": 3000}},
       {"action": {"type": "extract", "selector": "body"}}
     ]}'
   ```
3. **Summarize** the key points, data, and action items
4. Answer follow-up questions about the document

Common use cases:
- Contracts → extract key terms, obligations, dates
- Invoices → extract amounts, line items, due dates
- Reports → summarize findings, highlight numbers
- Receipts → extract vendor, amount, date (can also log to Expense Tracker)

## Voice Replies (port 18804)

Use the TTS service to generate voice messages. Send via exec + curl:

```bash
curl -s -X POST http://127.0.0.1:18804/speak \
  -H "Content-Type: application/json" \
  -d '{"text": "Your reply text here", "language": "zh"}'
```

Returns `{"ok": true, "url": "http://SERVER/audio/voice-xxx.mp3"}` — send that URL to the user.

### Supported languages
- English: `"language": "en"` (Kokoro voice)
- Chinese: `"language": "zh"` (Edge-TTS)
- Malay: `"language": "ms"` (Edge-TTS)
- Tamil: `"language": "ta"` (Edge-TTS)
- Japanese: `"language": "ja"` (Edge-TTS)
- Korean: `"language": "ko"` (Edge-TTS)
- Indonesian: `"language": "id"` (Edge-TTS)

### Auto voice reply rule
When the user sends a **voice message**, ALWAYS reply with BOTH:
1. A normal text reply
2. A voice reply in the **same language** they spoke in

## Environment-Specific Notes

Add your client-specific details below as you set up the environment:

- SSH hosts, aliases
- Camera names and locations (if applicable)
- Device nicknames
- Speaker/room names
- Anything environment-specific

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.
