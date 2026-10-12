// Renders the vertical Instagram Reel: voice lines via macOS `say`, frames via headless Chrome, MP4 via AVFoundation.
// Usage: node marketing/reels/render.mjs [script-ru.json | script-ru-v2.json] [--fps 30] [--tts open,filter]
// --theme light renders the light variant of a themed scene into <name>-light.mp4 with the same voice.
// --voice mine takes recordings from marketing/reels/voice/mine/ and renders into <name>-mine.mp4.
// --tts uses the synthetic voice for the listed scenes even when a recording exists (handy before re-recording a line).
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, basename } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2);
const scriptPath = join(root, 'marketing/reels', args.find(a => a.endsWith('.json')) || 'script-ru.json');
const fps = Number(args[args.indexOf('--fps') + 1]) || 30;
const forceTts = new Set(args.includes('--tts') ? args[args.indexOf('--tts') + 1].split(',') : []);
const baseName = basename(scriptPath, '.json').replace('script-', 'reel-');
const themeArg = args.includes('--theme') ? args[args.indexOf('--theme') + 1] : undefined;
const voiceArg = args.includes('--voice') ? args[args.indexOf('--voice') + 1] : undefined;
const name = baseName + (themeArg ? '-' + themeArg : '') + (voiceArg ? '-' + voiceArg : '');
const out = join(root, 'marketing/reels/out'), work = join(out, name), frames = join(work, 'frames'), audio = join(work, 'audio');
const chromeBin = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9333, base = 'http://127.0.0.1:4178';

const script = JSON.parse(await readFile(scriptPath, 'utf8'));
const theme = themeArg || script.theme || 'light';
await rm(work, { recursive: true, force: true });
await mkdir(frames, { recursive: true }); await mkdir(audio, { recursive: true });

// 1. Voice. A custom recording can replace a line: put <id>.m4a/.mp3/.wav/.aiff into marketing/reels/voice/<name>/.
const timing = [], voiceDir = join(root, 'marketing/reels/voice', voiceArg || baseName);
for (const scene of script.scenes) {
  const custom = forceTts.has(scene.id) ? undefined : ['m4a', 'mp3', 'wav', 'aiff'].map(ext => join(voiceDir, `${scene.id}.${ext}`)).find(existsSync);
  const target = join(audio, scene.id + '.m4a');
  if (custom?.endsWith('.m4a')) execFileSync('cp', [custom, target]);
  else if (custom) execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac@44100', '-b', '160000', custom, target]);
  else {
    const aiff = join(audio, scene.id + '.aiff');
    execFileSync('say', ['-v', script.voice, '-r', String(script.rate), '-o', aiff, scene.speech]);
    execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac@44100', '-b', '128000', aiff, target]);
  }
  const info = execFileSync('afinfo', [target], { encoding: 'utf8' });
  timing.push({ id: scene.id, voice: Number(info.match(/estimated duration: ([\d.]+)/)[1]), onsets: await wordOnsets(target) });
}

// Starts of speech after pauses ≥ 0.1 s, in seconds from the start of the recording.
// The scene uses them to land clicks, keys and captions on the spoken words.
async function wordOnsets(file) {
  const wav = file.replace(/\.m4a$/, '.wav');
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@16000', '-c', '1', file, wav]);
  const data = await readFile(wav), at = data.indexOf('data') + 8, pcm = new Int16Array(data.buffer.slice(data.byteOffset + at, data.byteOffset + data.length - ((data.length - at) % 2)));
  const levels = [];
  for (let i = 0; i < pcm.length; i += 160) { let sum = 0; const end = Math.min(i + 160, pcm.length); for (let j = i; j < end; j++) sum += pcm[j] * pcm[j]; levels.push(Math.sqrt(sum / (end - i))); }
  const threshold = Math.max(...levels) * .04, onsets = [];
  let quiet = 0;
  levels.forEach((level, i) => { if (level < threshold) quiet++; else { if (i === quiet || quiet >= 10) onsets.push(+(i / 100).toFixed(2)); quiet = 0; } });
  return onsets;
}

// 2. Preview server and headless Chrome.
let server;
try { await fetch(base + '/marketing/reels/reel.html'); }
catch { server = spawn('node', [join(root, 'marketing/tools/serve.mjs')], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 600)); }
const profile = join(work, 'chrome-profile');
const chrome = spawn(chromeBin, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1080,1920', '--force-color-profile=srgb', 'about:blank'], { stdio: 'ignore' });
let target;
for (let i = 0; i < 50 && !target; i++) {
  await new Promise(r => setTimeout(r, 200));
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch {}
}
if (!target) throw new Error('Chrome did not start');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let nextId = 1; const pending = new Map(), events = [];
ws.onmessage = ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result); }
  else if (msg.method) events.push(msg.method);
};
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = nextId++; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};

try {
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme === 'dark' ? 'dark' : 'light' }] });
  await send('Page.navigate', { url: base + `/marketing/reels/${script.page || 'reel.html'}?capture&theme=${theme}` });
  for (let i = 0; i < 100 && !events.includes('Page.loadEventFired'); i++) await new Promise(r => setTimeout(r, 100));
  const captions = Object.fromEntries(script.scenes.map(s => [s.id, s.caption]));
  const { scenes, total } = await evaluate(`reel.ready.then(() => reel.init(${JSON.stringify(timing)}, ${JSON.stringify(script.page ? script : captions)}))`);

  // 3. Frames.
  const count = Math.ceil(total * fps);
  for (let i = 0; i < count; i++) {
    await evaluate(`reel.seek(${i / fps}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
    const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: 1080, height: 1920, scale: 1 } });
    await writeFile(join(frames, String(i).padStart(5, '0') + '.jpg'), Buffer.from(data, 'base64'));
    if (i % fps === 0) process.stdout.write(`\rFrames ${i}/${count}`);
  }
  process.stdout.write(`\rFrames ${count}/${count}\n`);

  // 4. Encode: one version with voice, one silent for recording another voice over it.
  const clips = scenes.map(s => ({ file: join(audio, s.id + '.m4a'), start: s.voiceStart }));
  await writeFile(join(work, 'audio.json'), JSON.stringify(clips, null, 2));
  await writeFile(join(work, 'empty.json'), '[]');
  const swift = join(root, 'marketing/reels/encode-reel.swift');
  execFileSync('swift', [swift, frames, String(fps), join(work, 'audio.json'), join(out, name + '.mp4')], { stdio: 'inherit' });
  execFileSync('swift', [swift, frames, String(fps), join(work, 'empty.json'), join(out, name + '-silent.mp4')], { stdio: 'inherit' });

  // Timing sheet for a human voice-over or another TTS.
  const fmt = s => s.toFixed(1).padStart(5);
  const sheet = scenes.map((s, i) => `${fmt(s.voiceStart)}–${fmt(s.end)} с  [${s.id}]  ${script.scenes[i].caption || script.scenes[i].speech}\n           ≈ ${s.voice.toFixed(1)} с речи`).join('\n\n');
  await writeFile(join(out, name + '-timing.txt'), `Общая длительность: ${total.toFixed(1)} с\n\n${sheet}\n`);
  console.log(`Done: marketing/reels/out/${name}.mp4 (${total.toFixed(1)} s)`);
} finally {
  ws.close(); chrome.kill(); server?.kill();
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
