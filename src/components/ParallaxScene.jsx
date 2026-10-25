import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function ParallaxScene() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const ctx = gsap.context(() => {
      gsap.to('.plx-grid', {
        yPercent: 12,
        ease: 'none',
        scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true },
      });
      gsap.to('.plx-cross', {
        rotate: 18,
        yPercent: -12,
        ease: 'none',
        scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1.1 },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div className="parallax-scene" ref={rootRef} aria-hidden="true">
      <div className="plx-grid" />
      <div className="plx-cross" />
      <div className="plx-tick plx-tick--tl" />
      <div className="plx-tick plx-tick--br" />
    </div>
  );
}
