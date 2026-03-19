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
