import { useEffect, useRef } from 'react';

/**
 * A custom hook to set up an IntersectionObserver for infinite scrolling / lazy loading.
 *
 * @param {Object} options
 * @param {Function} options.onIntersect - Callback to fire when intersecting.
 * @param {boolean} [options.enabled=true] - Whether the observer is active.
 * @param {string|Element|Function|null} [options.root=null] - The scroll container. Can be a selector string, an Element, or a function (sentinel => Element).
 * @param {string} [options.rootMargin='0px 0px 1200px 0px'] - Margins around the root.
 * @param {number|number[]} [options.threshold=0] - Threshold for intersection.
 * @returns {import('react').RefObject} The ref to attach to the sentinel element.
 */
export default function useInfiniteScroll({
  onIntersect,
  enabled = true,
  root = null,
  rootMargin = '0px 0px 1200px 0px',
  threshold = 0,
}) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    let observerRoot = null;
    if (root) {
      if (typeof root === 'function') {
        observerRoot = root(sentinel);
      } else if (typeof root === 'string') {
        observerRoot = sentinel.closest(root) || document.querySelector(root);
      } else {
        observerRoot = root;
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onIntersect();
        }
      },
      {
        root: observerRoot || null,
        rootMargin,
        threshold,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [enabled, onIntersect, root, rootMargin, threshold]);

  return sentinelRef;
}
export { useInfiniteScroll };
