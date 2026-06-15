import js       from '@eslint/js';
import tseslint  from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars':          ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any':         'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console':                                 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'examples/', 'tests/', '**/*.js', '**/*.mjs'],
  },
);
