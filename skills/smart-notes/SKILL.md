---
name: smart_notes
description: Save, search, and retrieve personal notes. Use this when the user wants to remember something, store information, or recall saved notes.
metadata: {"openclaw":{"requires":{"bins":["curl"]}}}
---

# Smart Notes Skill

You have access to a **personal notes service** running on `http://127.0.0.1:18809`. Use the `exec` tool to run `curl` commands to interact with it. Notes are persisted to disk and survive restarts.

## When to Use

- The user says "remember this", "save this", "note this down", or similar
- The user asks "what did I save about...", "do I have a note on...", or wants to recall something
- The user wants to organize information with tags for later retrieval

## Create a Note

```bash
curl -s -X POST http://127.0.0.1:18809/notes \
  -H "Content-Type: application/json" \
  -d '{"title": "Meeting notes", "content": "Discussed Q2 roadmap with the team. Key decisions: launch by June.", "tags": ["meetings", "roadmap"]}'
```

Returns the created note with its `id`, `createdAt`, and `updatedAt`.

- `title` is optional (defaults to empty string)
- `content` is required
- `tags` is optional (defaults to empty array)

## List All Notes

```bash
curl -s http://127.0.0.1:18809/notes
```

Returns all notes sorted by most recently updated first.

## Search Notes

Search by keyword (case-insensitive, matches title and content):

```bash
curl -s "http://127.0.0.1:18809/notes?search=roadmap"
```

Filter by tag:

```bash
curl -s "http://127.0.0.1:18809/notes?tag=meetings"
```

Combine both:

```bash
curl -s "http://127.0.0.1:18809/notes?search=launch&tag=roadmap"
```

## Get a Single Note

```bash
curl -s http://127.0.0.1:18809/notes/NOTE_ID
```

## Update a Note

```bash
curl -s -X PUT http://127.0.0.1:18809/notes/NOTE_ID \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated title", "content": "Updated content", "tags": ["new-tag"]}'
```

All fields are optional in the update body — only provided fields are changed.

## Delete a Note

```bash
curl -s -X DELETE http://127.0.0.1:18809/notes/NOTE_ID
```

## Health Check

```bash
curl -s http://127.0.0.1:18809/health
```

Returns `{"status": "ok", "service": "smart-notes", "noteCount": N}`.

## Tips for the Agent

- When saving a note for the user, pick a short descriptive `title` and relevant `tags` automatically.
- When the user asks to recall something, try `?search=` first. If no results, try broader terms or list all notes.
- After creating or updating a note, confirm to the user what was saved.
- Keep note content concise but complete enough to be useful later.
