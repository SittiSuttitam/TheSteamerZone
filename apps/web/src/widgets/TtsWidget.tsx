import { useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useRoomChannel } from '../hooks/useRoomChannel';
import { speakWebSpeech } from '../lib/ttsWebSpeech';

/** OBS overlay — เล่น TTS จาก broadcast `tts_play` (Web Speech ฟรี) */
export function TtsWidget() {
  const { roomId } = useParams<{ roomId: string }>();
  const [search] = useSearchParams();
  const token = search.get('token');
  const queueRef = useRef<string[]>([]);
  const playingRef = useRef(false);

  async function playNext() {
    if (playingRef.current || !queueRef.current.length) return;
    playingRef.current = true;
    const raw = queueRef.current.shift()!;
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      playingRef.current = false;
      void playNext();
      return;
    }

    const text = String(payload.text ?? '').trim();
    const voiceId = String(payload.voiceId ?? '');
    const systemVoiceUri = String(payload.systemVoiceUri ?? '') || undefined;
    const rate = Number(payload.rate ?? 1);
    const pitch = Number(payload.pitch ?? 0);
    const volume = Number(payload.volume ?? 1);

    const done = () => {
      playingRef.current = false;
      void playNext();
    };

    if (!text) {
      done();
      return;
    }

    try {
      await speakWebSpeech(text, { voiceId, systemVoiceUri, rate, pitch, volume });
    } catch (e) {
      console.warn('[TtsWidget]', e instanceof Error ? e.message : e);
    } finally {
      done();
    }
  }

  useRoomChannel(roomId, token, {
    tts_play: (p) => {
      queueRef.current.push(JSON.stringify(p));
      void playNext();
    },
  });

  return (
    <div
      className="pointer-events-none fixed bottom-0 right-0 h-px w-px overflow-hidden opacity-0"
      aria-hidden
    />
  );
}
