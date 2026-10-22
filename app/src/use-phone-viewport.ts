import { useEffect, useState } from 'react';

function readViewport() {
  const viewport = window.visualViewport;
  return {
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
    top: viewport?.offsetTop ?? 0,
    left: viewport?.offsetLeft ?? 0,
  };
}

// Follow Safari's visible area as its toolbar and native keyboard move.
export function usePhoneViewport(enabled: boolean) {
  const [viewport, setViewport] = useState(readViewport);
  useEffect(() => {
    if (!enabled) return;
    const update = () => setViewport(readViewport());
    update();
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [enabled]);
  return viewport;
}
