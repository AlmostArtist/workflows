'use client';

import { useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';

/**
 * Lottie icon renderer.
 *
 * The catalogue ships 33 animations at 25–85 KB each, so nothing is bundled and nothing
 * loads until the icon is actually near the viewport. Each file is fetched once per
 * session and shared through a module-level cache, and the player itself is imported
 * dynamically so lottie-web never lands in the first-load bundle.
 *
 * Playback follows intent rather than running constantly: `loop` animates forever (used
 * sparingly, for the hero and empty states), `hover` rests on a still frame and plays
 * while pointed at, and `once` plays a single pass when scrolled into view. Under
 * `prefers-reduced-motion` every mode renders a single static frame.
 */

type PlayMode = 'hover' | 'once' | 'loop' | 'static';

const cache = new Map<string, Promise<unknown>>();

function loadAnimation(src: string): Promise<unknown> {
  let p = cache.get(src);
  if (!p) {
    p = fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${src}`);
        return r.json();
      })
      .catch(() => null);
    cache.set(src, p);
  }
  return p;
}

let playerPromise: Promise<typeof import('lottie-web/build/player/lottie_light')> | null = null;
function loadPlayer() {
  // The `_light` build drops expressions and effects, which none of these icons use.
  playerPromise ??= import('lottie-web/build/player/lottie_light');
  return playerPromise;
}

export interface LottieIconProps {
  /** Path under /icons, with or without the .json suffix. */
  name: string;
  size?: number;
  mode?: PlayMode;
  className?: string;
  /** Speed multiplier; 1 is the animation's authored rate. */
  speed?: number;
  /** Plays when this flips true — lets a parent card drive its child icon on hover. */
  active?: boolean;
  /** Decorative by default; pass a label to expose it to assistive tech. */
  label?: string;
}

export function LottieIcon({
  name,
  size = 40,
  mode = 'hover',
  className = '',
  speed = 1,
  active,
  label,
}: LottieIconProps) {
  const host = useRef<HTMLDivElement>(null);
  const anim = useRef<AnimationItem | null>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  const src = `/icons/${name.endsWith('.json') ? name : `${name}.json`}`;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Only fetch once the icon is close to the viewport — a browse grid can hold dozens.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    (async () => {
      const [lottie, data] = await Promise.all([loadPlayer(), loadAnimation(src)]);
      if (cancelled || !host.current || !data) return;

      const autoplay = !reduced && (mode === 'loop' || mode === 'once');
      const item = (lottie.default ?? lottie).loadAnimation({
        container: host.current,
        renderer: 'svg',
        loop: mode === 'loop' && !reduced,
        autoplay,
        animationData: data,
        rendererSettings: { progressiveLoad: true, preserveAspectRatio: 'xMidYMid meet' },
      });
      item.setSpeed(speed);
      anim.current = item;

      if (reduced || mode === 'static' || mode === 'hover') {
        // Rest on a frame with the subject fully drawn rather than an empty first frame.
        item.goToAndStop(Math.floor(item.totalFrames * 0.5), true);
      }
    })();

    return () => {
      cancelled = true;
      anim.current?.destroy();
      anim.current = null;
    };
  }, [visible, src, mode, speed, reduced]);

  // Parent-driven playback for `hover` mode.
  useEffect(() => {
    const item = anim.current;
    if (!item || reduced || mode !== 'hover' || active === undefined) return;
    if (active) {
      item.loop = true;
      item.goToAndPlay(0, true);
    } else {
      item.loop = false;
      item.goToAndStop(Math.floor(item.totalFrames * 0.5), true);
    }
  }, [active, mode, reduced]);

  const selfHover = mode === 'hover' && active === undefined;

  return (
    <div
      ref={host}
      className={className}
      style={{ width: size, height: size, flex: 'none' }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      onMouseEnter={
        selfHover && !reduced
          ? () => {
              const i = anim.current;
              if (i) {
                i.loop = true;
                i.goToAndPlay(0, true);
              }
            }
          : undefined
      }
      onMouseLeave={
        selfHover && !reduced
          ? () => {
              const i = anim.current;
              if (i) {
                i.loop = false;
                i.goToAndStop(Math.floor(i.totalFrames * 0.5), true);
              }
            }
          : undefined
      }
    />
  );
}
