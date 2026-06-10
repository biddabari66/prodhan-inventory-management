import React, { useEffect, useRef, useState } from 'react';

const SplitText = ({
  text = '',
  className = '',
  delay = 50,
  animationFrom = { opacity: 0, transform: 'translateY(20px)' },
  animationTo = { opacity: 1, transform: 'translateY(0px)' },
  easing = 'easeOutCubic',
  threshold = 0.1,
  rootMargin = '-50px',
  textAlign = 'center',
  onLetterAnimationComplete,
}) => {
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(ref.current);
        }
      },
      { threshold, rootMargin }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const words = text.split(' ').map(word => word.split(''));

  return (
    <div
      ref={ref}
      className={`inline-block ${className}`}
      style={{ textAlign }}
    >
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block whitespace-nowrap mr-2">
          {word.map((letter, letterIndex) => {
            const index = words.slice(0, wordIndex).reduce((acc, w) => acc + w.length, 0) + letterIndex;
            return (
              <span
                key={index}
                className="inline-block transition-all duration-500"
                style={{
                  ...inView ? animationTo : animationFrom,
                  transitionDelay: `${index * delay}ms`,
                  transitionTimingFunction: easing,
                }}
              >
                {letter}
              </span>
            );
          })}
        </span>
      ))}
    </div>
  );
};

export default SplitText;
