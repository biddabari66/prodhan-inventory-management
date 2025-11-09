import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * OPTIMIZED Fast Loading Provider - Simplified for better performance
 * Provides a slim top progress bar for page transitions
 */

const LoadingContext = createContext();

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export default function FastLoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const location = useLocation();

  useEffect(() => {
    // Start loading on route change
    setIsLoading(true);
    setProgress(20);

    // Simulate progress
    const timer1 = setTimeout(() => setProgress(50), 100);
    const timer2 = setTimeout(() => setProgress(80), 300);
    const timer3 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setIsLoading(false), 200);
    }, 500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [location.pathname]);

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {/* OPTIMIZED: Slim progress bar without heavy animations */}
      {isLoading && (
        <div 
          className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 to-pink-600 z-[9999] transition-all duration-300"
          style={{
            width: `${progress}%`,
            opacity: progress === 100 ? 0 : 1
          }}
        />
      )}
      {children}
    </LoadingContext.Provider>
  );
}