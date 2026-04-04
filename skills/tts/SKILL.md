---
name: text_to_speech
description: Generate voice messages in 7 languages. Use when the user asks for a voice reply, or automatically when they send a voice message.
metadata: {"openclaw":{"requires":{"bins":["curl"]}}}
---

# Text-to-Speech Skill

Generate voice messages via the TTS service on `http://127.0.0.1:18804`.

## Generate a voice message

```bash
curl -s -X POST http://127.0.0.1:18804/speak \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, how are you?", "language": "en"}'
```

Returns:
```json
{"ok": true, "url": "http://SERVER/audio/voice-xxx.mp3", "filename": "voice-xxx.mp3", "format": "mp3", "language": "en"}
```

Send the `url` to the user as the voice message.

## Supported languages

| Language   | Code | Engine   | Voice            |
|------------|------|----------|------------------|
| English    | `en` | Kokoro   | af_bella         |
| Chinese    | `zh` | Edge-TTS | XiaoxiaoNeural   |
| Malay      | `ms` | Edge-TTS | YasminNeural     |
| Tamil      | `ta` | Edge-TTS | PallaviNeural    |
| Japanese   | `ja` | Edge-TTS | NanamiNeural     |
| Korean     | `ko` | Edge-TTS | SunHiNeural      |
| Indonesian | `id` | Edge-TTS | GadisNeural      |

## When to use

- User explicitly asks for a voice reply or voice message
- User sends a voice message → reply with BOTH text + voice in the same language
- User says "say that in Chinese" → generate Chinese voice

## Health check

```bash
curl -s http://127.0.0.1:18804/health
```

## Prerequisites

- `edge-tts` Python package: `pip3 install edge-tts`
- `ffmpeg` for audio conversion
- Replicate API token (for English Kokoro voice)
