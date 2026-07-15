import { useEffect, useState } from 'react';

export const MOBILE_BREAKPOINT_PX = 768;

/** Pure: below the breakpoint, the app switches SideNav for a bottom DrawerNav (#69). */
export function matchesMobileBreakpoint(viewportWidth: number, breakpoint: number = MOBILE_BREAKPOINT_PX): boolean {
  return viewportWidth < breakpoint;
}

export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT_PX): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && matchesMobileBreakpoint(window.innerWidth, breakpoint)
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(matchesMobileBreakpoint(window.innerWidth, breakpoint));
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [breakpoint]);

  return isMobile;
}
