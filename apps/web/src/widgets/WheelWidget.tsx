import { useCallback, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useRoomChannel } from '../hooks/useRoomChannel';
import { connectorUrl, api } from '../lib/connector';
import { legacySamplePath } from '../lib/legacySamples';
import './wheel-widget.css';

interface WheelItem {
  label: string;
  weight?: number;
  action?: string;
  value?: number;
  effect?: string;
}

interface SpinPayload {
  items?: WheelItem[];
  selectedItem?: WheelItem;
  selectedIndex?: number;
  spinMs?: number;
  resultMs?: number;
  scale?: number;
  playSpinSound?: boolean;
  playResultSound?: boolean;
  requestId?: string;
  count?: number;
}

function effectClass(effect?: string) {
  if (effect === 'good') return 'good';
  if (effect === 'bad') return 'bad';
  return 'neutral';
}

function waitLayout() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function WheelWidget() {
  const { roomId } = useParams<{ roomId: string }>();
  const [search] = useSearchParams();
  const token = search.get('token');
  const scaleParam = parseFloat(search.get('scale') || '1') || 1;

  const [visible, setVisible] = useState(false);
  const [queueLen, setQueueLen] = useState(0);
  const [resultText, setResultText] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [fx, setFx] = useState<'good' | 'bad' | null>(null);
  const [stripItems, setStripItems] = useState<WheelItem[]>([]);

  const trackRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const spinningRef = useRef(false);
  const queueRef = useRef<SpinPayload[]>([]);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processQueueRef = useRef<() => void>(() => undefined);

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const measureTarget = useCallback((landIndex: number) => {
    const track = trackRef.current;
    const itemsEl = itemsRef.current;
    if (!track || !itemsEl) return 0;
    const landEl = itemsEl.children[landIndex] as HTMLElement | undefined;
    if (!landEl) return 0;
    const trackRect = track.getBoundingClientRect();
    const r = landEl.getBoundingClientRect();
    const landCenter = r.left + r.width / 2;
    const trackCenter = trackRect.left + trackRect.width / 2;
    return Math.round(landCenter - trackCenter);
  }, []);

  const runSpin = useCallback(
    async (payload: SpinPayload) => {
      if (spinningRef.current) return;
      spinningRef.current = true;
      clearHideTimer();
      setShowResult(false);
      setFx(null);

      const baseList =
        payload.items?.length
          ? payload.items
          : [{ label: 'WIN', action: 'none', value: 0, effect: 'neutral' }];
      const spinMs = payload.spinMs ?? 5000;
      const resultMs = payload.resultMs ?? 5000;
      const scale = scaleParam || payload.scale || 1;
      const repeatCount = 14;
      const baseLen = baseList.length;
      const selectedIndex =
        typeof payload.selectedIndex === 'number'
          ? payload.selectedIndex % baseLen
          : 0;
      const landIndex = baseLen * Math.floor(repeatCount / 2) + selectedIndex;

      const rendered: WheelItem[] = [];
      for (let r = 0; r < repeatCount; r++) rendered.push(...baseList);

      document.documentElement.style.setProperty('--wheel-scale', String(scale));
      setStripItems(rendered);
      setVisible(true);

      await waitLayout();
      await waitLayout();

      const itemsEl = itemsRef.current;
      if (!itemsEl) {
        spinningRef.current = false;
        processQueueRef.current();
        return;
      }

      itemsEl.style.transition = 'none';
      itemsEl.style.transform = 'translateX(0)';
      void itemsEl.offsetWidth;
      await waitLayout();

      const target = measureTarget(landIndex);

      if (payload.playSpinSound) {
        try {
          const a = new Audio(legacySamplePath('increment.mp3'));
          a.volume = 0.35;
          void a.play();
        } catch {
          /* ignore */
        }
      }

      itemsEl.style.transition = `transform ${spinMs}ms cubic-bezier(0.08, 0.48, 0.08, 1)`;
      itemsEl.style.transform = `translateX(-${target}px)`;

      hideTimerRef.current = setTimeout(() => {
        const result =
          payload.selectedItem ?? baseList[selectedIndex] ?? baseList[0];
        const valText =
          result.action === 'win' && !Number.isNaN(Number(result.value))
            ? ` (${Number(result.value) >= 0 ? '+' : ''}${result.value})`
            : '';
        setResultText(`${result.label || 'ผลลัพธ์'}${valText}`);
        setShowResult(true);
        setFx(
          result.effect === 'good'
            ? 'good'
            : result.effect === 'bad'
              ? 'bad'
              : null
        );

        if (payload.playResultSound) {
          try {
            const a = new Audio(legacySamplePath('decrement.mp3'));
            a.volume = 0.45;
            void a.play();
          } catch {
            /* ignore */
          }
        }

        void api(`${connectorUrl()}/api/wheel/result`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item: result,
            requestId: payload.requestId,
            count: payload.count ?? 1,
          }),
        }).catch((e) => console.warn('[wheel] result', e));

        const holdMs = Math.max(resultMs, 2800);
        hideTimerRef.current = setTimeout(() => {
          if (queueRef.current.length > 0) {
            setShowResult(false);
            itemsEl.style.transition = 'none';
            itemsEl.style.transform = 'translateX(0)';
            spinningRef.current = false;
            processQueueRef.current();
          } else {
            setVisible(false);
            setShowResult(false);
            setStripItems([]);
            itemsEl.style.transition = 'none';
            itemsEl.style.transform = 'translateX(0)';
            spinningRef.current = false;
            setQueueLen(0);
          }
        }, holdMs);
      }, spinMs);
    },
    [measureTarget, scaleParam]
  );

  processQueueRef.current = () => {
    if (spinningRef.current || !queueRef.current.length) return;
    const next = queueRef.current.shift()!;
    setQueueLen(queueRef.current.length);
    void runSpin(next);
  };

  const enqueue = useCallback((payload: SpinPayload) => {
    queueRef.current.push(payload);
    setQueueLen(queueRef.current.length);
    processQueueRef.current();
  }, []);

  useRoomChannel(roomId, token, {
    wheel_spin: (p) => {
      enqueue({
        items: p.items as WheelItem[] | undefined,
        selectedItem: p.selectedItem as WheelItem | undefined,
        selectedIndex:
          typeof p.selectedIndex === 'number' ? p.selectedIndex : undefined,
        spinMs: typeof p.spinMs === 'number' ? p.spinMs : undefined,
        resultMs: typeof p.resultMs === 'number' ? p.resultMs : undefined,
        scale: typeof p.scale === 'number' ? p.scale : undefined,
        playSpinSound: !!p.playSpinSound,
        playResultSound: !!p.playResultSound,
        requestId: typeof p.requestId === 'string' ? p.requestId : undefined,
        count: typeof p.count === 'number' ? p.count : undefined,
      });
    },
  });

  return (
    <div className="wheel-root">
      <div className={`wheel-wrap${visible ? ' visible' : ''}`}>
        <div className={`wheel-fx-good${fx === 'good' ? ' active' : ''}`} />
        <div className={`wheel-fx-bad${fx === 'bad' ? ' active' : ''}`} />
        <div className="wheel-pointer" />
        {queueLen > 0 && <div className="wheel-queue">คิว: {queueLen}</div>}
        <div className="wheel-track" ref={trackRef}>
          <div className="wheel-items" ref={itemsRef}>
            {stripItems.map((it, i) => {
              const valText =
                it.action === 'win' && !Number.isNaN(Number(it.value))
                  ? `${Number(it.value) >= 0 ? '+' : ''}${it.value}`
                  : '';
              return (
                <div
                  key={`${it.label}-${i}`}
                  className={`wheel-item ${effectClass(it.effect)}`}
                  style={{ minWidth: 120 }}
                >
                  <div>{it.label}</div>
                  {valText ? <div className="wheel-item-val">{valText}</div> : null}
                </div>
              );
            })}
          </div>
        </div>
        {showResult && <div className="wheel-result">{resultText}</div>}
      </div>
    </div>
  );
}
