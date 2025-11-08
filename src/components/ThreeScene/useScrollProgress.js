import {useState, useEffect, useRef} from 'react';

export function useScrollProgress() {
  const [scrollData, setScrollData] = useState({
    progress: 0,
    velocity: 0,
    direction: 1,
    acceleration: 0,
  });

  const lastScrollTop = useRef(0);
  const lastVelocity = useRef(0);
  const lastTime = useRef(Date.now());

  useEffect(() => {
    const handleScroll = () => {
      const currentTime = Date.now();
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

      // Calculate velocity (pixels per millisecond)
      const deltaTime = currentTime - lastTime.current;
      const deltaScroll = scrollTop - lastScrollTop.current;
      const velocity = deltaTime > 0 ? deltaScroll / deltaTime : 0;

      // Calculate acceleration
      const acceleration =
        deltaTime > 0 ? (velocity - lastVelocity.current) / deltaTime : 0;

      // Determine direction
      const direction =
        velocity > 0 ? 1 : velocity < 0 ? -1 : scrollData.direction;

      setScrollData({
        progress: Math.min(Math.max(progress, 0), 1),
        velocity,
        direction,
        acceleration,
      });

      lastScrollTop.current = scrollTop;
      lastVelocity.current = velocity;
      lastTime.current = currentTime;
    };

    // Initial calculation
    handleScroll();

    // Add scroll listener with throttling for better performance
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll, {passive: true});
    window.addEventListener('resize', handleScroll, {passive: true});

    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [scrollData.direction]);

  return scrollData;
}
