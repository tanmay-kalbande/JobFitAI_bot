import { useEffect } from 'react';

const EDITABLE_SELECTOR = 'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]';
const MOBILE_WIDTH_QUERY = '(max-width: 900px)';
const KEYBOARD_OPEN_THRESHOLD = 120;

function isEditableElement(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement && target.matches(EDITABLE_SELECTOR);
}

export function useMobileKeyboardGuard() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const viewport = window.visualViewport;
    let frameId = 0;
    let focusTimeoutId: number | null = null;
    let blurTimeoutId: number | null = null;

    const applyKeyboardState = () => {
      frameId = 0;

      if (!window.matchMedia(MOBILE_WIDTH_QUERY).matches) {
        root.style.setProperty('--mobile-keyboard-offset', '0px');
        root.dataset.mobileKeyboard = 'closed';
        return;
      }

      const layoutViewportHeight = window.innerHeight;
      const visualViewportHeight = viewport?.height ?? layoutViewportHeight;
      const visualViewportOffsetTop = viewport?.offsetTop ?? 0;
      const keyboardOffset = Math.max(
        0,
        Math.round(layoutViewportHeight - visualViewportHeight - visualViewportOffsetTop)
      );
      const keyboardOpen = keyboardOffset > KEYBOARD_OPEN_THRESHOLD && isEditableElement(document.activeElement);

      root.style.setProperty('--mobile-keyboard-offset', `${keyboardOpen ? keyboardOffset : 0}px`);
      root.dataset.mobileKeyboard = keyboardOpen ? 'open' : 'closed';
    };

    const scheduleKeyboardState = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(applyKeyboardState);
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!isEditableElement(event.target)) {
        return;
      }

      if (focusTimeoutId !== null) {
        window.clearTimeout(focusTimeoutId);
      }

      scheduleKeyboardState();
      focusTimeoutId = window.setTimeout(() => {
        const target = event.target;
        if (isEditableElement(target)) {
          target.scrollIntoView({
            block: 'center',
            inline: 'nearest',
            behavior: 'smooth',
          });
        }
      }, 140);
    };

    const handleFocusOut = () => {
      if (blurTimeoutId !== null) {
        window.clearTimeout(blurTimeoutId);
      }

      blurTimeoutId = window.setTimeout(() => {
        scheduleKeyboardState();
      }, 80);
    };

    scheduleKeyboardState();

    window.addEventListener('resize', scheduleKeyboardState);
    window.addEventListener('orientationchange', scheduleKeyboardState);
    viewport?.addEventListener('resize', scheduleKeyboardState);
    viewport?.addEventListener('scroll', scheduleKeyboardState);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      if (focusTimeoutId !== null) {
        window.clearTimeout(focusTimeoutId);
      }
      if (blurTimeoutId !== null) {
        window.clearTimeout(blurTimeoutId);
      }

      window.removeEventListener('resize', scheduleKeyboardState);
      window.removeEventListener('orientationchange', scheduleKeyboardState);
      viewport?.removeEventListener('resize', scheduleKeyboardState);
      viewport?.removeEventListener('scroll', scheduleKeyboardState);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      root.style.setProperty('--mobile-keyboard-offset', '0px');
      root.dataset.mobileKeyboard = 'closed';
    };
  }, []);
}
