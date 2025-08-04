// Performance monitoring and optimization utilities
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

/**
 * Web Vitals Monitoring
 * Tracks Core Web Vitals and sends them to analytics
 */
export class WebVitalsMonitor {
  constructor(analyticsCallback) {
    this.analyticsCallback = analyticsCallback || this.defaultCallback;
    this.initializeMonitoring();
  }

  defaultCallback(metric) {
    console.log('Web Vital:', metric);
    // Send to your analytics service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_category: 'Web Vitals',
        event_label: metric.id,
        non_interaction: true,
      });
    }
  }

  initializeMonitoring() {
    getCLS(this.analyticsCallback);
    getFID(this.analyticsCallback);
    getFCP(this.analyticsCallback);
    getLCP(this.analyticsCallback);
    getTTFB(this.analyticsCallback);
  }

  // Track custom performance metrics
  trackCustomMetric(name, value, unit = 'ms') {
    const metric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
    };
    this.analyticsCallback(metric);
  }
}

/**
 * Lazy Loading Utilities
 */
export class LazyLoader {
  constructor(options = {}) {
    this.options = {
      rootMargin: '50px',
      threshold: 0.1,
      ...options,
    };
    this.observer = this.createObserver();
  }

  createObserver() {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return null;
    }

    return new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.loadElement(entry.target);
          this.observer.unobserve(entry.target);
        }
      });
    }, this.options);
  }

  loadElement(element) {
    // Load images
    if (element.tagName === 'IMG') {
      if (element.dataset.src) {
        element.src = element.dataset.src;
      }
      if (element.dataset.srcset) {
        element.srcset = element.dataset.srcset;
      }
      element.classList.remove('lazy');
      element.classList.add('loaded');
    }

    // Load background images
    if (element.dataset.bgSrc) {
      element.style.backgroundImage = `url(${element.dataset.bgSrc})`;
      element.classList.remove('lazy-bg');
      element.classList.add('loaded-bg');
    }

    // Execute custom load function
    if (element.dataset.onLoad) {
      try {
        const loadFunction = new Function(element.dataset.onLoad);
        loadFunction.call(element);
      } catch (error) {
        console.error('Error executing lazy load function:', error);
      }
    }
  }

  observe(element) {
    if (this.observer && element) {
      this.observer.observe(element);
    } else {
      // Fallback for browsers without IntersectionObserver
      this.loadElement(element);
    }
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

/**
 * Image Optimization Utilities
 */
export class ImageOptimizer {
  static supportsWebP() {
    if (typeof window === 'undefined') return false;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  static supportsAVIF() {
    if (typeof window === 'undefined') return false;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  }

  static getOptimalFormat(originalUrl) {
    if (this.supportsAVIF()) {
      return originalUrl.replace(/\.(jpg|jpeg|png)$/i, '.avif');
    } else if (this.supportsWebP()) {
      return originalUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }
    return originalUrl;
  }

  static createResponsiveImageSrc(basePath, sizes = [400, 800, 1200, 1600]) {
    const format = this.supportsAVIF() ? 'avif' : this.supportsWebP() ? 'webp' : 'jpg';
    return sizes.map(size => `${basePath}-${size}w.${format} ${size}w`).join(', ');
  }
}

/**
 * Resource Preloader
 */
export class ResourcePreloader {
  constructor() {
    this.preloadedResources = new Set();
  }

  preloadImage(src, priority = 'low') {
    if (this.preloadedResources.has(src)) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    link.fetchPriority = priority;
    document.head.appendChild(link);
    
    this.preloadedResources.add(src);
  }

  preloadFont(href, type = 'font/woff2') {
    if (this.preloadedResources.has(href)) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = type;
    link.href = href;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    
    this.preloadedResources.add(href);
  }

  preloadScript(src) {
    if (this.preloadedResources.has(src)) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = src;
    document.head.appendChild(link);
    
    this.preloadedResources.add(src);
  }

  prefetchResource(href) {
    if (this.preloadedResources.has(href)) return;

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
    
    this.preloadedResources.add(href);
  }
}

/**
 * Performance Observer for monitoring
 */
export class PerformanceMonitor {
  constructor(callback) {
    this.callback = callback || console.log;
    this.observers = [];
    this.initializeObservers();
  }

  initializeObservers() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    // Monitor navigation timing
    const navObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        this.callback({
          type: 'navigation',
          name: entry.name,
          duration: entry.duration,
          loadEventStart: entry.loadEventStart,
          domContentLoadedEventStart: entry.domContentLoadedEventStart,
        });
      });
    });
    navObserver.observe({ entryTypes: ['navigation'] });
    this.observers.push(navObserver);

    // Monitor resource loading
    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration > 100) { // Only log slow resources
          this.callback({
            type: 'resource',
            name: entry.name,
            duration: entry.duration,
            size: entry.transferSize,
            cached: entry.transferSize === 0,
          });
        }
      });
    });
    resourceObserver.observe({ entryTypes: ['resource'] });
    this.observers.push(resourceObserver);

    // Monitor long tasks
    const longTaskObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        this.callback({
          type: 'long-task',
          duration: entry.duration,
          startTime: entry.startTime,
        });
      });
    });
    longTaskObserver.observe({ entryTypes: ['longtask'] });
    this.observers.push(longTaskObserver);
  }

  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

/**
 * Debounce utility for performance optimization
 */
export function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(this, args);
  };
}

/**
 * Throttle utility for performance optimization
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * RequestAnimationFrame wrapper for smooth animations
 */
export class AnimationFrame {
  constructor() {
    this.callbacks = [];
    this.isRunning = false;
  }

  add(callback) {
    this.callbacks.push(callback);
    if (!this.isRunning) {
      this.start();
    }
  }

  remove(callback) {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
    if (this.callbacks.length === 0) {
      this.stop();
    }
  }

  start() {
    this.isRunning = true;
    this.tick();
  }

  stop() {
    this.isRunning = false;
  }

  tick() {
    if (!this.isRunning) return;
    
    this.callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Animation frame callback error:', error);
      }
    });

    requestAnimationFrame(() => this.tick());
  }
}

/**
 * Memory management utilities
 */
export class MemoryManager {
  static createWeakCache() {
    return new WeakMap();
  }

  static createExpiredCache(ttl = 5 * 60 * 1000) { // 5 minutes default
    const cache = new Map();
    const timers = new Map();

    return {
      set(key, value) {
        // Clear existing timer
        if (timers.has(key)) {
          clearTimeout(timers.get(key));
        }
        
        cache.set(key, value);
        const timer = setTimeout(() => {
          cache.delete(key);
          timers.delete(key);
        }, ttl);
        timers.set(key, timer);
      },
      
      get(key) {
        return cache.get(key);
      },
      
      has(key) {
        return cache.has(key);
      },
      
      delete(key) {
        if (timers.has(key)) {
          clearTimeout(timers.get(key));
          timers.delete(key);
        }
        return cache.delete(key);
      },
      
      clear() {
        timers.forEach(timer => clearTimeout(timer));
        timers.clear();
        cache.clear();
      }
    };
  }

  static measureMemoryUsage() {
    if ('memory' in performance) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
      };
    }
    return null;
  }
}

// Export default instances for common use cases
export const webVitalsMonitor = new WebVitalsMonitor();
export const lazyLoader = new LazyLoader();
export const resourcePreloader = new ResourcePreloader();
export const performanceMonitor = new PerformanceMonitor();
export const animationFrame = new AnimationFrame();