module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    'react',
    'react-hooks',
    '@typescript-eslint',
    'jsx-a11y',
    'import',
    'performance',
  ],
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },
  rules: {
    // Performance-related rules
    'performance/no-multiple-selectors-per-query': 'warn',
    'performance/no-unused-state': 'warn',
    'performance/prefer-const': 'warn',
    
    // React performance rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react/jsx-no-bind': ['warn', {
      allowArrowFunctions: true,
      allowBind: false,
      allowFunctions: false,
    }],
    'react/jsx-no-constructed-context-values': 'warn',
    'react/jsx-no-leaked-render': 'warn',
    'react/no-array-index-key': 'warn',
    'react/no-unstable-nested-components': 'error',
    'react/prefer-stateless-function': 'warn',
    'react/no-multi-comp': ['warn', { ignoreStateless: true }],
    
    // Import optimization
    'import/no-duplicates': 'error',
    'import/no-unused-modules': 'warn',
    'import/order': ['warn', {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index',
      ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
    }],
    
    // General performance
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-unused-vars': 'off', // Handled by TypeScript
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    'prefer-const': 'warn',
    'no-var': 'error',
    
    // Accessibility
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/img-redundant-alt': 'warn',
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/no-static-element-interactions': 'warn',
    
    // Code quality
    'eqeqeq': 'error',
    'curly': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // TypeScript specific
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'warn',
    '@typescript-eslint/prefer-optional-chain': 'warn',
  },
  overrides: [
    {
      files: ['*.test.{js,jsx,ts,tsx}', '*.spec.{js,jsx,ts,tsx}'],
      env: {
        jest: true,
      },
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: ['vite.config.{js,ts}', 'webpack.config.{js,ts}'],
      rules: {
        'import/no-extraneous-dependencies': 'off',
      },
    },
  ],
};