import { useEffect, useState } from 'react';

const QUERY = '(pointer: coarse)';

export function usePointerCoarse(): boolean {
  const [coarse, setCoarse] = useState(() => window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setCoarse(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return coarse;
}
