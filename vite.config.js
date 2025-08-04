import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';
import viteCompression from 'vite-plugin-compression';

export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production';
  const isAnalyze = process.env.ANALYZE === 'true';

  return {
    plugins: [
      react({
        // Enable React Fast Refresh
        fastRefresh: true,
        // Exclude storybook stories from fast refresh
        exclude: /\.stories\.(t|j)sx?$/,
        // Include .jsx and .tsx files
        include: '**/*.{jsx,tsx}',
        babel: {
          plugins: [
            // Remove console.log in production
            isProduction && ['transform-remove-console', {
              exclude: ['error', 'warn']
            }]
          ].filter(Boolean)
        }
      }),
      // Gzip compression
      isProduction && viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 8192,
        deleteOriginFile: false,
      }),
      // Brotli compression
      isProduction && viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 8192,
        deleteOriginFile: false,
      }),
      // PWA configuration
      isProduction && VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        manifest: {
          name: 'Performance Optimized App',
          short_name: 'PerfApp',
          description: 'A performance optimized web application',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'icon-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icon-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      }),
      // Bundle analyzer
      isAnalyze && visualizer({
        filename: 'dist/bundle-analysis.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      })
    ].filter(Boolean),
    
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@assets': resolve(__dirname, 'src/assets'),
        '@hooks': resolve(__dirname, 'src/hooks'),
        '@pages': resolve(__dirname, 'src/pages'),
        '@services': resolve(__dirname, 'src/services'),
      },
    },

    build: {
      // Target modern browsers for smaller bundles
      target: 'es2015',
      
      // Output directory
      outDir: 'dist',
      
      // Generate source maps for debugging
      sourcemap: isProduction,
      
      // Minify with terser for better compression
      minify: 'terser',
      
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          pure_funcs: isProduction ? ['console.log'] : [],
        },
      },
      
      // Rollup options for advanced bundling
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // Vendor chunks
            'react-vendor': ['react', 'react-dom'],
            'router-vendor': ['react-router-dom'],
            'ui-vendor': ['@mui/material', '@emotion/react', '@emotion/styled'],
            
            // Utility chunks
            'utils': [
              'lodash-es',
              'date-fns',
              'axios'
            ],
          },
          
          // Optimize chunk file names
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
              ? chunkInfo.facadeModuleId.split('/').pop().replace(/\.[^.]*$/, '')
              : 'chunk';
            return `js/${facadeModuleId}-[hash].js`;
          },
          
          // Optimize asset file names
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(assetInfo.name)) {
              return `images/[name]-[hash].${ext}`;
            }
            if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
              return `fonts/[name]-[hash].${ext}`;
            }
            return `assets/[name]-[hash].${ext}`;
          },
        },
        
        // External dependencies (for CDN usage if needed)
        external: [],
      },
      
      // Chunk size warnings
      chunkSizeWarningLimit: 500,
      
      // Asset inlining threshold
      assetsInlineLimit: 8192, // 8kb
    },

    // CSS optimization
    css: {
      devSourcemap: !isProduction,
      postcss: {
        plugins: [
          require('autoprefixer'),
          isProduction && require('cssnano')({
            preset: 'default',
          }),
        ].filter(Boolean),
      },
    },

    // Server configuration
    server: {
      port: 3000,
      host: true,
      // Enable HTTP/2 for better performance
      https: false,
      // Proxy configuration for API calls
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },

    // Preview server configuration
    preview: {
      port: 4173,
      host: true,
    },

    // Dependency optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
      ],
      exclude: [
        // Exclude large dependencies that should be code-split
      ],
    },

    // Performance optimizations
    esbuild: {
      // Drop console logs in production
      drop: isProduction ? ['console', 'debugger'] : [],
      // Optimize for modern browsers
      target: 'es2015',
    },

    // Define global variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  };
});