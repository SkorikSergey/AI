import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { throttle } from '../utils/performance';

/**
 * Custom hook for virtualizing large lists
 * Improves performance by only rendering visible items
 */
export function useVirtualization({
  items = [],
  itemHeight,
  containerHeight,
  overscan = 5,
  getItemHeight,
  estimatedItemHeight = 50,
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef(null);
  const [heights, setHeights] = useState(new Map());

  // Memoized item heights calculation
  const itemHeights = useMemo(() => {
    if (typeof itemHeight === 'number') {
      return items.map(() => itemHeight);
    }
    
    if (getItemHeight) {
      return items.map((item, index) => getItemHeight(item, index));
    }

    // Use measured heights or estimated height
    return items.map((_, index) => 
      heights.get(index) || estimatedItemHeight
    );
  }, [items, itemHeight, getItemHeight, heights, estimatedItemHeight]);

  // Calculate total height
  const totalHeight = useMemo(() => {
    return itemHeights.reduce((sum, height) => sum + height, 0);
  }, [itemHeights]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    let start = 0;
    let accumulatedHeight = 0;

    // Find start index
    for (let i = 0; i < itemHeights.length; i++) {
      if (accumulatedHeight + itemHeights[i] > scrollTop) {
        start = Math.max(0, i - overscan);
        break;
      }
      accumulatedHeight += itemHeights[i];
    }

    // Find end index
    let end = start;
    accumulatedHeight = itemHeights
      .slice(0, start)
      .reduce((sum, height) => sum + height, 0);

    for (let i = start; i < itemHeights.length; i++) {
      if (accumulatedHeight > scrollTop + containerHeight + (overscan * estimatedItemHeight)) {
        break;
      }
      end = i;
      accumulatedHeight += itemHeights[i];
    }

    return { start, end: Math.min(end + overscan, items.length - 1) };
  }, [scrollTop, containerHeight, itemHeights, overscan, estimatedItemHeight, items.length]);

  // Calculate offset for visible items
  const offsetY = useMemo(() => {
    return itemHeights
      .slice(0, visibleRange.start)
      .reduce((sum, height) => sum + height, 0);
  }, [itemHeights, visibleRange.start]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items
      .slice(visibleRange.start, visibleRange.end + 1)
      .map((item, index) => ({
        item,
        index: visibleRange.start + index,
      }));
  }, [items, visibleRange]);

  // Throttled scroll handler
  const handleScroll = useCallback(
    throttle((event) => {
      setScrollTop(event.target.scrollTop);
    }, 16), // ~60fps
    []
  );

  // Measure item height
  const measureItem = useCallback((index, element) => {
    if (!element) return;
    
    const height = element.getBoundingClientRect().height;
    setHeights(prev => {
      const newHeights = new Map(prev);
      newHeights.set(index, height);
      return newHeights;
    });
  }, []);

  // Reset scroll position
  const scrollToIndex = useCallback((index) => {
    if (!scrollElementRef.current) return;

    const offset = itemHeights
      .slice(0, index)
      .reduce((sum, height) => sum + height, 0);
    
    scrollElementRef.current.scrollTop = offset;
  }, [itemHeights]);

  const scrollToTop = useCallback(() => {
    if (scrollElementRef.current) {
      scrollElementRef.current.scrollTop = 0;
    }
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    scrollElementRef,
    handleScroll,
    measureItem,
    scrollToIndex,
    scrollToTop,
    visibleRange,
  };
}

/**
 * Hook for infinite scrolling with virtualization
 */
export function useInfiniteVirtualization({
  items = [],
  hasNextPage = false,
  isFetchingNextPage = false,
  fetchNextPage,
  itemHeight,
  containerHeight,
  loadMoreThreshold = 5,
  ...virtualizationOptions
}) {
  const virtualization = useVirtualization({
    items,
    itemHeight,
    containerHeight,
    ...virtualizationOptions,
  });

  const { visibleRange, visibleItems } = virtualization;

  // Auto-load more items when approaching the end
  useEffect(() => {
    const shouldLoadMore = 
      hasNextPage &&
      !isFetchingNextPage &&
      items.length - visibleRange.end <= loadMoreThreshold;

    if (shouldLoadMore && fetchNextPage) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    isFetchingNextPage,
    items.length,
    visibleRange.end,
    loadMoreThreshold,
    fetchNextPage,
  ]);

  return {
    ...virtualization,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  };
}

/**
 * Hook for grid virtualization
 */
export function useGridVirtualization({
  items = [],
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  columns,
  gap = 0,
  overscan = 5,
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollElementRef = useRef(null);

  // Calculate grid dimensions
  const gridDimensions = useMemo(() => {
    const cols = columns || Math.floor((containerWidth + gap) / (itemWidth + gap));
    const rows = Math.ceil(items.length / cols);
    const totalWidth = cols * itemWidth + (cols - 1) * gap;
    const totalHeight = rows * itemHeight + (rows - 1) * gap;

    return { cols, rows, totalWidth, totalHeight };
  }, [items.length, columns, containerWidth, itemWidth, itemHeight, gap]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const { cols, rows } = gridDimensions;
    
    const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan);
    const endRow = Math.min(
      rows - 1,
      Math.floor((scrollTop + containerHeight) / (itemHeight + gap)) + overscan
    );

    const startCol = Math.max(0, Math.floor(scrollLeft / (itemWidth + gap)) - overscan);
    const endCol = Math.min(
      cols - 1,
      Math.floor((scrollLeft + containerWidth) / (itemWidth + gap)) + overscan
    );

    return { startRow, endRow, startCol, endCol };
  }, [scrollTop, scrollLeft, containerWidth, containerHeight, itemWidth, itemHeight, gap, gridDimensions, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => {
    const { cols } = gridDimensions;
    const { startRow, endRow, startCol, endCol } = visibleRange;
    const visible = [];

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const index = row * cols + col;
        if (index < items.length) {
          visible.push({
            item: items[index],
            index,
            row,
            col,
            x: col * (itemWidth + gap),
            y: row * (itemHeight + gap),
          });
        }
      }
    }

    return visible;
  }, [items, gridDimensions, visibleRange, itemWidth, itemHeight, gap]);

  // Scroll handlers
  const handleScroll = useCallback(
    throttle((event) => {
      setScrollTop(event.target.scrollTop);
      setScrollLeft(event.target.scrollLeft);
    }, 16),
    []
  );

  return {
    visibleItems,
    totalWidth: gridDimensions.totalWidth,
    totalHeight: gridDimensions.totalHeight,
    scrollElementRef,
    handleScroll,
    gridDimensions,
    visibleRange,
  };
}

/**
 * Hook for masonry/Pinterest-style virtualization
 */
export function useMasonryVirtualization({
  items = [],
  columnWidth,
  containerWidth,
  getItemHeight,
  gap = 0,
  overscan = 5,
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const [positions, setPositions] = useState([]);
  const scrollElementRef = useRef(null);

  // Calculate columns
  const columns = useMemo(() => {
    return Math.floor((containerWidth + gap) / (columnWidth + gap));
  }, [containerWidth, columnWidth, gap]);

  // Calculate item positions
  useEffect(() => {
    const columnHeights = new Array(columns).fill(0);
    const newPositions = [];

    items.forEach((item, index) => {
      const height = getItemHeight(item, index);
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      
      const x = shortestColumnIndex * (columnWidth + gap);
      const y = columnHeights[shortestColumnIndex];

      newPositions.push({ x, y, height });
      columnHeights[shortestColumnIndex] += height + gap;
    });

    setPositions(newPositions);
  }, [items, columns, columnWidth, gap, getItemHeight]);

  // Calculate total height
  const totalHeight = useMemo(() => {
    if (positions.length === 0) return 0;
    return Math.max(...positions.map(pos => pos.y + pos.height));
  }, [positions]);

  // Get visible items
  const visibleItems = useMemo(() => {
    const containerBottom = scrollTop + containerHeight;
    
    return items
      .map((item, index) => ({
        item,
        index,
        ...positions[index],
      }))
      .filter((item) => {
        if (!item.y && item.y !== 0) return false;
        
        const itemTop = item.y;
        const itemBottom = item.y + item.height;
        
        return itemBottom >= scrollTop - overscan * 100 &&
               itemTop <= containerBottom + overscan * 100;
      });
  }, [items, positions, scrollTop, containerHeight, overscan]);

  const handleScroll = useCallback(
    throttle((event) => {
      setScrollTop(event.target.scrollTop);
    }, 16),
    []
  );

  return {
    visibleItems,
    totalHeight,
    scrollElementRef,
    handleScroll,
    columns,
  };
}