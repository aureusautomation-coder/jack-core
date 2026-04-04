import express from 'express';
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const app = express();
app.use(express.json());

const AUDIO_DIR = '/var/www/audio';
const SERVER_HOST = process.env.SERVER_HOST || 'http://95.111.247.198';
if (!existsSync(AUDIO_DIR)) mkdirSync(AUDIO_DIR, { recursive: true });

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || '';
const KOKORO_VERSION = 'f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13';

// Edge-TTS voices for non-English (free, runs locally)
const EDGE_VOICES = {
  zh: 'zh-CN-XiaoxiaoNeural',
  ms: 'ms-MY-YasminNeural',
  ta: 'ta-IN-PallaviNeural',
  ja: 'ja-JP-NanamiNeural',
  ko: 'ko-KR-SunHiNeural',
  id: 'id-ID-GadisNeural',
};

async function runReplicate(version, input, maxPollSecs = 60) {
  const createRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ version, input }),
  });
  if (!createRes.ok) throw new Error(`Replicate: ${await createRes.text()}`);
  let prediction = await createRes.json();
  for (let i = 0; i < maxPollSecs / 2; i++) {
    if (prediction.status === 'succeeded') return prediction;
    if (prediction.status === 'failed' || prediction.status === 'canceled')
      throw new Error(`TTS ${prediction.status}: ${prediction.error || 'unknown'}`);
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` },
    });
    prediction = await pollRes.json();
  }
  throw new Error('TTS timed out');
}

function edgeTts(text, voice, outPath) {
  const escaped = text.replace(/"/g, '\\"').slice(0, 2000);
  execSync(`edge-tts --text "${escaped}" --voice ${voice} --write-media "${outPath}" 2>/dev/null`, { timeout: 30000 });
}

app.post('/speak', async (req, res) => {
  try {
    const { text, language = 'en' } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });

    const edgeVoice = EDGE_VOICES[language];
    const filename = `voice-${Date.now()}.mp3`;
    const outPath = join(AUDIO_DIR, filename);

    if (edgeVoice) {
      // Use Edge-TTS for non-English (free, local, no API cost)
      console.log(`🔊 TTS edge (${language}, ${edgeVoice}): "${text.slice(0, 80)}..."`);
      edgeTts(text, edgeVoice, outPath);
    } else {
      // Use Kokoro via Replicate for English
      console.log(`🔊 TTS kokoro (${language}, af_bella): "${text.slice(0, 80)}..."`);
      const prediction = await runReplicate(KOKORO_VERSION, {
        text: text.slice(0, 2000),
        speed: 1.0,
        voice: 'af_bella',
      }, 60);

      const audioUrl = prediction.output;
      if (!audioUrl) throw new Error('No audio output');
      const url = Array.isArray(audioUrl) ? audioUrl[0] : audioUrl;
      const audioRes = await fetch(url);
      const buffer = Buffer.from(await audioRes.arrayBuffer());
      const ext = url.includes('.wav') ? 'wav' : url.includes('.flac') ? 'flac' : 'wav';
      const rawFile = join(AUDIO_DIR, `voice-${Date.now()}.${ext}`);
      writeFileSync(rawFile, buffer);
      // Convert to mp3
      const mp3Path = rawFile.replace(/\.(wav|flac)$/, '.mp3');
      try {
        execSync(`ffmpeg -i "${rawFile}" -codec:a libmp3lame -qscale:a 2 "${mp3Path}" -y 2>/dev/null`);
        unlinkSync(rawFile);
      } catch {}
      const localUrl = `${SERVER_HOST}/audio/${mp3Path.split('/').pop()}`;
      console.log(`✅ Voice: ${localUrl}`);
      return res.json({ ok: true, url: localUrl, filename: mp3Path.split('/').pop(), format: 'mp3', language });
    }

    const localUrl = `${SERVER_HOST}/audio/${filename}`;
    console.log(`✅ Voice: ${localUrl}`);
    res.json({ ok: true, url: localUrl, filename, format: 'mp3', language });
  } catch (err) {
    console.error('TTS error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'tts', tokenSet: !!REPLICATE_TOKEN, languages: ['en', ...Object.keys(EDGE_VOICES)] });
});

const PORT = process.env.TTS_PORT || 18804;
app.listen(PORT, () => console.log(`🔊 TTS on port ${PORT} — EN (Kokoro) + ZH/MS/TA/JA/KO/ID (Edge-TTS, free)`));
