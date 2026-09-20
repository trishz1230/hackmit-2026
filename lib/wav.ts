/**
 * Muse Voice Transcribe only reads mono 16-bit PCM WAV at 16 or 24 kHz, but a
 * browser records WebM/Opus. This re-encodes a recording to WAV before it is
 * uploaded, using the Web Audio API — so it works on web only; a phone records
 * WAV itself (see app/capture.tsx).
 */
const TARGET_RATE = 16_000;

type AudioContextClass = typeof AudioContext;

function contexts(): { online: AudioContextClass; offline: typeof OfflineAudioContext } | null {
  const scope = globalThis as unknown as {
    AudioContext?: AudioContextClass;
    webkitAudioContext?: AudioContextClass;
    OfflineAudioContext?: typeof OfflineAudioContext;
    webkitOfflineAudioContext?: typeof OfflineAudioContext;
  };
  const online = scope.AudioContext ?? scope.webkitAudioContext;
  const offline = scope.OfflineAudioContext ?? scope.webkitOfflineAudioContext;
  return online && offline ? { online, offline } : null;
}

function encode(samples: Float32Array, rate: number): Blob {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const ascii = (at: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(at + i, text.charCodeAt(i));
  };

  ascii(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM header length
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true); // bytes per second
  view.setUint16(32, 2, true); // bytes per frame
  view.setUint16(34, 16, true); // bits per sample
  ascii(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, clamped * 0x7fff, true);
  }

  return new Blob([bytes], { type: 'audio/wav' });
}

/** The recording as mono 16 kHz WAV, or null when this platform can't convert. */
export async function toWav(recording: Blob): Promise<Blob | null> {
  const api = contexts();
  if (!api) return null;

  try {
    const decoder = new api.online();
    const decoded = await decoder.decodeAudioData(await recording.arrayBuffer());
    decoder.close();

    const frames = Math.ceil((decoded.duration || 0) * TARGET_RATE);
    if (!frames) return null;

    const room = new api.offline(1, frames, TARGET_RATE);
    const source = room.createBufferSource();
    source.buffer = decoded;
    source.connect(room.destination);
    source.start();

    const mono = await room.startRendering();
    return encode(mono.getChannelData(0), TARGET_RATE);
  } catch {
    return null;
  }
}
