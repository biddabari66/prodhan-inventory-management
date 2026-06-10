import React from 'react';

const ShinyText = ({ text, disabled = false, speed = 3, className = '' }) => {
  const animationDuration = `${speed}s`;

  return (
    <div
      className={`bg-clip-text inline-block ${disabled ? '' : 'animate-shine'} ${className}`}
      style={{
        backgroundImage: 'linear-gradient(120deg, rgba(255, 255, 255, 1) 40%, rgba(255, 215, 100, 1) 50%, rgba(255, 255, 255, 1) 60%)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        color: disabled ? 'inherit' : 'transparent',
        animationDuration: animationDuration,
        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      {text}
    </div>
  );
};

export default ShinyText;
