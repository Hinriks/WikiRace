import { useState, useRef, useCallback, useEffect } from 'react';

export function useTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    if (startTimeRef.current !== null) {
      setElapsed((performance.now() - startTimeRef.current) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    }
  }, []);

  const start = useCallback(() => {
    startTimeRef.current = performance.now();
    setRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stop = useCallback((): number => {
    let finalElapsed = 0;
    if (startTimeRef.current !== null) {
      finalElapsed = (performance.now() - startTimeRef.current) / 1000;
      setElapsed(finalElapsed);
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setRunning(false);
    return finalElapsed;
  }, []);

  const reset = useCallback(() => {
    stop();
    startTimeRef.current = null;
    setElapsed(0);
  }, [stop]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return { elapsed, running, start, stop, reset };
}
