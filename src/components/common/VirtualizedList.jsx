import React, { useRef, useState, useCallback, useEffect, memo } from 'react';

/**
 * VIRTUALIZED LIST COMPONENT
 * Renders only visible items for massive performance gains with large lists
 */

const VirtualizedList = memo(({ 
  items = [], 
  itemHeight = 60, 
  containerHeight = 400,
  renderItem,
  overscan = 5,
  className = ''
}) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;
  
  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // Use passive scroll listener for better performance
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center h-32 text-slate-500 ${className}`}>
        No items to display
      </div>
    );
  }

  // For small lists, render normally without virtualization
  if (items.length <= 20) {
    return (
      <div className={`overflow-auto ${className}`} style={{ maxHeight: containerHeight }}>
        {items.map((item, index) => (
          <div key={item.id || index} style={{ height: itemHeight }}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ 
          position: 'absolute', 
          top: offsetY, 
          left: 0, 
          right: 0,
          willChange: 'transform'
        }}>
          {visibleItems.map((item, index) => (
            <div 
              key={item.id || startIndex + index} 
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

VirtualizedList.displayName = 'VirtualizedList';

export default VirtualizedList;