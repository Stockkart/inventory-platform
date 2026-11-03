import { useEffect } from 'react';

/** How long a scrollbar stays visible after the last scroll event on its container. */
const REVEAL_MS = 900;

/**
 * Marks whichever element is being scrolled with `data-sk-scrolling` for a moment after
 * each scroll event, so the global scrollbar rule in `apps/inventory/styles.css` can show
 * the thumb only while it is in motion (or the container is hovered). This gives Windows
 * and Linux the macOS overlay feel: classic scrollbars there are otherwise always drawn.
 *
 * One capturing listener on the document covers every scroll container, including ones
 * mounted later. Scrolling the page itself targets the document, which maps to `<html>`.
 */
export function ScrollbarReveal() {
  useEffect(() => {
    const timers = new WeakMap<Element, number>();
    const onScroll = (event: Event) => {
      const target = event.target === document ? document.documentElement : event.target;
      if (!(target instanceof Element)) return;
      target.setAttribute('data-sk-scrolling', '');
      const previous = timers.get(target);
      if (previous) window.clearTimeout(previous);
      timers.set(
        target,
        window.setTimeout(() => target.removeAttribute('data-sk-scrolling'), REVEAL_MS),
      );
    };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', onScroll, { capture: true });
  }, []);
  return null;
}
