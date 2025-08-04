import React, { useRef, useEffect, useState } from 'react';
import { ImageOptimizer, lazyLoader } from '../utils/performance';

/**
 * LazyImage Component
 * Optimized image component with lazy loading, modern format support, and responsive images
 */
const LazyImage = ({
  src,
  alt,
  className = '',
  width,
  height,
  sizes,
  loading = 'lazy',
  priority = false,
  placeholder = 'blur',
  blurDataURL,
  onLoad,
  onError,
  ...props
}) => {
  const imgRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState('');

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // For priority images, load immediately
    if (priority || loading === 'eager') {
      const optimizedSrc = ImageOptimizer.getOptimalFormat(src);
      setCurrentSrc(optimizedSrc);
      return;
    }

    // Set up lazy loading
    img.dataset.src = ImageOptimizer.getOptimalFormat(src);
    
    // Add responsive srcset if sizes are provided
    if (sizes) {
      img.dataset.srcset = ImageOptimizer.createResponsiveImageSrc(
        src.replace(/\.[^/.]+$/, ''), // Remove extension
        sizes
      );
    }

    // Custom load handler
    img.dataset.onLoad = `
      this.classList.add('loaded');
      this.style.opacity = '1';
    `;

    lazyLoader.observe(img);

    return () => {
      lazyLoader.disconnect();
    };
  }, [src, priority, loading, sizes]);

  const handleLoad = (event) => {
    setIsLoaded(true);
    if (onLoad) onLoad(event);
  };

  const handleError = (event) => {
    setHasError(true);
    if (onError) onError(event);
  };

  const imageClasses = [
    'lazy-image',
    className,
    !isLoaded && !priority ? 'lazy' : '',
    isLoaded ? 'loaded' : '',
    hasError ? 'error' : '',
  ].filter(Boolean).join(' ');

  const imageStyles = {
    opacity: isLoaded || priority ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out',
    ...(placeholder === 'blur' && blurDataURL && {
      backgroundImage: `url(${blurDataURL})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }),
  };

  return (
    <div className="lazy-image-wrapper" style={{ position: 'relative' }}>
      {/* Placeholder for blur effect */}
      {placeholder === 'blur' && !isLoaded && !priority && (
        <div
          className="image-placeholder"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: blurDataURL ? `url(${blurDataURL})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(5px)',
            zIndex: 1,
          }}
        />
      )}

      {/* Skeleton loader */}
      {placeholder === 'skeleton' && !isLoaded && !priority && (
        <div
          className="skeleton-loader"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'skeleton-loading 1.5s infinite',
            zIndex: 1,
          }}
        />
      )}

      {/* Actual image */}
      <img
        ref={imgRef}
        src={priority || loading === 'eager' ? currentSrc : undefined}
        alt={alt}
        className={imageClasses}
        width={width}
        height={height}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        style={imageStyles}
        {...props}
      />

      {/* Error fallback */}
      {hasError && (
        <div
          className="image-error"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f5f5f5',
            color: '#666',
            fontSize: '14px',
            zIndex: 2,
          }}
        >
          Failed to load image
        </div>
      )}

      <style jsx>{`
        @keyframes skeleton-loading {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        
        .lazy-image {
          width: 100%;
          height: auto;
          transition: opacity 0.3s ease-in-out;
        }
        
        .lazy-image.lazy {
          opacity: 0;
        }
        
        .lazy-image.loaded {
          opacity: 1;
        }
        
        .lazy-image.error {
          display: none;
        }
      `}</style>
    </div>
  );
};

/**
 * Hook for creating optimized image URLs
 */
export const useOptimizedImage = (src, options = {}) => {
  const [optimizedSrc, setOptimizedSrc] = useState('');
  const [isSupported, setIsSupported] = useState({
    webp: false,
    avif: false,
  });

  useEffect(() => {
    setIsSupported({
      webp: ImageOptimizer.supportsWebP(),
      avif: ImageOptimizer.supportsAVIF(),
    });
  }, []);

  useEffect(() => {
    if (src) {
      const optimized = ImageOptimizer.getOptimalFormat(src);
      setOptimizedSrc(optimized);
    }
  }, [src, isSupported]);

  return {
    src: optimizedSrc,
    isSupported,
    createResponsiveSrc: (sizes) => 
      ImageOptimizer.createResponsiveImageSrc(
        src.replace(/\.[^/.]+$/, ''),
        sizes
      ),
  };
};

/**
 * Picture component for responsive images with multiple formats
 */
export const ResponsivePicture = ({
  src,
  alt,
  sizes = '(max-width: 768px) 100vw, 50vw',
  breakpoints = [400, 800, 1200],
  className = '',
  loading = 'lazy',
  ...props
}) => {
  const baseSrc = src.replace(/\.[^/.]+$/, '');
  const extension = src.split('.').pop();

  return (
    <picture className={className}>
      {/* AVIF sources */}
      {ImageOptimizer.supportsAVIF() && (
        <source
          srcSet={breakpoints
            .map(width => `${baseSrc}-${width}w.avif ${width}w`)
            .join(', ')}
          sizes={sizes}
          type="image/avif"
        />
      )}

      {/* WebP sources */}
      {ImageOptimizer.supportsWebP() && (
        <source
          srcSet={breakpoints
            .map(width => `${baseSrc}-${width}w.webp ${width}w`)
            .join(', ')}
          sizes={sizes}
          type="image/webp"
        />
      )}

      {/* Fallback */}
      <source
        srcSet={breakpoints
          .map(width => `${baseSrc}-${width}w.${extension} ${width}w`)
          .join(', ')}
        sizes={sizes}
        type={`image/${extension}`}
      />

      <img
        src={src}
        alt={alt}
        loading={loading}
        {...props}
      />
    </picture>
  );
};

export default LazyImage;