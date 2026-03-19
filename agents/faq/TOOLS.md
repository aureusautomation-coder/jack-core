# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## Notes for FAQ Bot

- This agent has restricted tool access (messaging-only profile).
- It can use `memory_get` and `memory_search` for public knowledge lookups.
- It cannot use exec, write, edit, broadcast, gateway, or cron tools.
- Booking queries go through the `booking-api` skill (connects to simplybook-bot-backend on port 3000).

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.
