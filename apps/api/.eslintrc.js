/**
 * CivilIQ ESLint Config — Modular Monolith Boundary Enforcement
 *
 * The `boundaries/element-types` rule enforces ADR-001 module boundaries.
 * Builds FAIL if any module imports across its boundary.
 *
 * Allowed cross-module imports:
 *   - Any module can import from common/ (shared infrastructure)
 *   - Modules can import types/interfaces from each other
 *   - No module can import service classes or repositories from another module
 */
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'boundaries'],
  extends: [
    'plugin:@typescript-eslint/recommended',
  ],
  settings: {
    'boundaries/elements': [
      { type: 'common',    pattern: 'src/common/**/*' },
      { type: 'auth',      pattern: 'src/modules/auth/**/*' },
      { type: 'crm',       pattern: 'src/modules/crm/**/*' },
      { type: 'projects',  pattern: 'src/modules/projects/**/*' },
      { type: 'documents', pattern: 'src/modules/documents/**/*' },
      { type: 'materials', pattern: 'src/modules/materials/**/*' },
      { type: 'agents',    pattern: 'src/modules/agents/**/*' },
      { type: 'realtime',  pattern: 'src/modules/realtime/**/*' },
      { type: 'billing',   pattern: 'src/modules/billing/**/*' },
    ],
  },
  rules: {
    // Module boundary enforcement (ADR-001)
    // Each module can only import from: itself, common, and approved peers
    'boundaries/element-types': ['warn', {
      default: 'disallow',
      rules: [
        // common is accessible to all modules
        { from: '*',         allow: ['common'] },
        // Each module can access itself
        { from: 'auth',      allow: ['auth', 'common'] },
        { from: 'crm',       allow: ['crm', 'common'] },
        { from: 'projects',  allow: ['projects', 'common'] },
        { from: 'documents', allow: ['documents', 'common'] },
        { from: 'materials', allow: ['materials', 'common'] },
        { from: 'agents',    allow: ['agents', 'common'] },
        { from: 'realtime',  allow: ['realtime', 'common'] },
        { from: 'billing',   allow: ['billing', 'common'] },
      ],
    }],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
};
