module.exports = {
  plugins: {
    autoprefixer: {
      grid: true,
    },
    'postcss-preset-env': {
      stage: 1,
      features: {
        'nesting-rules': true,
        'custom-media-queries': true,
        'media-query-ranges': true,
      },
    },
    ...(process.env.NODE_ENV === 'production' && {
      cssnano: {
        preset: [
          'default',
          {
            discardComments: {
              removeAll: true,
            },
            normalizeWhitespace: true,
            minifySelectors: true,
            minifyParams: true,
            minifyFontValues: true,
            convertValues: true,
            reduceIdents: false, // Keep for CSS modules
            zindex: false, // Avoid z-index issues
          },
        ],
      },
      '@fullhuman/postcss-purgecss': {
        content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
        defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
        safelist: {
          standard: [
            /^(hover|focus|active|disabled|selected|checked|invalid|valid):/,
            /^(md|lg|xl|2xl):/,
            /^data-/,
            /^aria-/,
          ],
          deep: [
            /swiper/,
            /react-/,
            /^\.tippy/,
            /^\.popper/,
          ],
          greedy: [
            /^\.hljs/,
            /^\.cm-/,
            /tooltip$/,
            /dropdown$/,
            /modal$/,
            /overlay$/,
          ],
        },
        variables: true,
        keyframes: true,
      },
    }),
  },
};