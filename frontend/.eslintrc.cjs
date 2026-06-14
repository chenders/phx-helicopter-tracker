module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules', '.eslintrc.cjs', 'vite.config.ts'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'unused-imports'],
  rules: {
    // --- Real bug rules from eslint:recommended + @typescript-eslint stay ON ---

    // Gradual typing: `any` is pervasive in this codebase (predates strict typing).
    // Gating on it would require a ~360-site refactor with behavior risk, so keep
    // it off and let the gate focus on genuine bugs.
    '@typescript-eslint/no-explicit-any': 'off',

    // Replace the base unused-vars rule with unused-imports: dead *imports* are
    // auto-removable and enforced, but we don't gate on unused local vars (often
    // in-progress scaffolding on feature branches).
    '@typescript-eslint/no-unused-vars': 'off',
    'unused-imports/no-unused-imports': 'error',

    // "Fixing" effect dependencies changes runtime behavior, so this is guidance,
    // not a CI gate. rules-of-hooks (the correctness rule) stays on via recommended.
    'react-hooks/exhaustive-deps': 'off',

    // Fast Refresh hint — dev-only DX, not a correctness concern.
    'react-refresh/only-export-components': 'off',
  },
}
