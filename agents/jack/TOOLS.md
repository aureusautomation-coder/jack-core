# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

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
