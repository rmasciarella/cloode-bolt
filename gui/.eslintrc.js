module.exports = {
  extends: [
    'next/core-web-vitals'
  ],
  rules: {
    // Disable all rules for production build
    'prefer-const': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'react/jsx-key': 'off',
    'react/no-array-index-key': 'off',
    'react/display-name': 'off',
    'prefer-template': 'off',
    'object-shorthand': 'off',
    'no-console': 'off',
    '@next/next/no-html-link-for-pages': 'off'
  }
}