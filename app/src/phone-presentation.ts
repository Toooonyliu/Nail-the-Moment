type PhoneEnvironment = {
  search: string;
  touchPoints: number;
  coarsePointer: boolean;
  screenWidth: number;
  screenHeight: number;
};

export function prefersPhonePresentation(environment: PhoneEnvironment): boolean {
  const preference = new URLSearchParams(environment.search).get('phone');
  if (preference === '1') return true;
  if (preference === '0') return false;
  return environment.touchPoints > 0 && environment.coarsePointer &&
    Math.min(environment.screenWidth, environment.screenHeight) <= 600;
}

export function isPhonePresentation(): boolean {
  return typeof window !== 'undefined' && prefersPhonePresentation({
    search: window.location.search,
    touchPoints: navigator.maxTouchPoints,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  });
}

export function hasNativeKeyboard(layoutHeight: number, viewportHeight: number, hasFocusedField: boolean): boolean {
  return hasFocusedField && layoutHeight - viewportHeight > 120;
}
