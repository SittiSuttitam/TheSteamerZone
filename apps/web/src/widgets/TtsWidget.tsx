import { useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useRoomChannel } from '../hooks/useRoomChannel';
import { speakWebSpeech } from '../lib/ttsWebSpeech';

/** OBS overlay — เล่น TTS จาก broadcast `tts_play` (คิวเดียวต่อครั้ง) */
export function TtsWidget() {
  const { roomId } = useParams<{ roomId: string }>();
  const [search] = useSearchParams();
  const token = search.get('token');
  const queueRef = useRef<string[]>([]);
  const playingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function playNext() {
    if (playingRef.current || !queueRef.current.length) return;
    playingRef.current = true;
    const raw = queueRef.current.shift()!;
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      playingRef.current = false;
      playNext();
      return;
    }

    const text = String(payload.text ?? '');
    const audioUrl = payload.audioUrl as string | null | undefined;
    const voiceId = String(payload.voiceId ?? '');
    const rate = Number(payload.rate ?? 1);
    const pitch = Number(payload.pitch ?? 1);
    const volume = Number(payload.volume ?? 1);

    const done = () => {
      playingRef.current = false;
      void playNext();
    };

    if (audioUrl) {
      try {
        const a = audioRef.current ?? new Audio();
        audioRef.current = a;
        a.volume = Math.min(1, Math.max(0, volume));
        a.onended = done;
        a.onerror = () => {
          if (text) speakWebSpeech(text, { voiceId, rate, pitch, volume });
          setTimeout(done, text.length * 80 + 500);
        };
        a.src = audioUrl;
        await a.play();
        return;
      } catch {
        /* fall through */
      }
    }

    if (text) {
      speakWebSpeech(text, { voiceId, rate, pitch, volume });
      setTimeout(done, Math.min(15000, text.length * 90 + 800));
    } else {
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
