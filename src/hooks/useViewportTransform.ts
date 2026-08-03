"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

export type ViewTransform = {
  x: number;
  y: number;
  scale: number;
};

const MIN_SCALE = 0.7;
const MAX_SCALE = 5;

function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Pan / pinch / wheel viewport transform for a touch-friendly map surface. */
export function useViewportTransform(initial: ViewTransform = { x: 0, y: 0, scale: 1 }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewTransform>(initial);
  const viewRef = useRef(view);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const panRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const pinchRef = useRef<{
    distance: number;
    scale: number;
    midX: number;
    midY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const zoomAt = useCallback(
    (factor: number, originX: number, originY: number) => {
      setView((prev) => {
        const nextScale = clampScale(prev.scale * factor);
        if (nextScale === prev.scale) return prev;
        const ratio = nextScale / prev.scale;
        return {
          scale: nextScale,
          x: originX - (originX - prev.x) * ratio,
          y: originY - (originY - prev.y) * ratio,
        };
      });
    },
    [],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const ox = rect ? rect.width / 2 : 0;
      const oy = rect ? rect.height / 2 : 0;
      zoomAt(factor, ox, oy);
    },
    [zoomAt],
  );

  const resetView = useCallback(() => {
    setView({ x: 0, y: 0, scale: 1 });
  }, []);

  function onWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    zoomAt(factor, event.clientX - rect.left, event.clientY - rect.top);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const points = [...pointersRef.current.values()];
    if (points.length === 1) {
      panRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: viewRef.current.x,
        originY: viewRef.current.y,
      };
      pinchRef.current = null;
      return;
    }

    if (points.length >= 2) {
      const [a, b] = points;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = containerRef.current?.getBoundingClientRect();
      pinchRef.current = {
        distance: Math.max(distance, 1),
        scale: viewRef.current.scale,
        midX: (a.x + b.x) / 2 - (rect?.left ?? 0),
        midY: (a.y + b.y) / 2 - (rect?.top ?? 0),
        originX: viewRef.current.x,
        originY: viewRef.current.y,
      };
      panRef.current = null;
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const points = [...pointersRef.current.values()];

    if (points.length >= 2 && pinchRef.current) {
      const [a, b] = points;
      const distance = Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1);
      const factor = distance / pinchRef.current.distance;
      const nextScale = clampScale(pinchRef.current.scale * factor);
      const ratio = nextScale / pinchRef.current.scale;
      const { midX, midY, originX, originY } = pinchRef.current;
      setView({
        scale: nextScale,
        x: midX - (midX - originX) * ratio,
        y: midY - (midY - originY) * ratio,
      });
      suppressClickRef.current = true;
      return;
    }

    const pan = panRef.current;
    if (!pan || points.length !== 1) return;
    const dx = event.clientX - pan.startX;
    const dy = event.clientY - pan.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) suppressClickRef.current = true;
    setView((prev) => ({
      ...prev,
      x: pan.originX + dx,
      y: pan.originY + dy,
    }));
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }

    const points = [...pointersRef.current.values()];
    if (points.length === 1) {
      const [a] = points;
      panRef.current = {
        startX: a.x,
        startY: a.y,
        originX: viewRef.current.x,
        originY: viewRef.current.y,
      };
      pinchRef.current = null;
      return;
    }

    panRef.current = null;
    pinchRef.current = null;
  }

  /** True if the last gesture should cancel a click (pan/pinch). */
  function consumeSuppressedClick(): boolean {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }

  return {
    containerRef,
    view,
    zoomBy,
    resetView,
    consumeSuppressedClick,
    surfaceProps: {
      onWheel,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}
