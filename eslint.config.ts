import javascript from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import typescript from 'typescript-eslint'

const functionalStyle = {
  'no-restricted-syntax': [
    'error',
    { selector: 'ClassDeclaration', message: 'Functional style: no classes.' },
    { selector: 'ClassExpression', message: 'Functional style: no classes.' },
    { selector: 'ForStatement', message: 'Use map, filter, reduce or flatMap instead of loops.' },
    { selector: 'ForInStatement', message: 'Use Object.entries with map instead of loops.' },
    { selector: 'ForOfStatement', message: 'Use map, filter, reduce or flatMap instead of loops.' },
    { selector: 'WhileStatement', message: 'Use map, filter, reduce or flatMap instead of loops.' },
    { selector: 'DoWhileStatement', message: 'Use map, filter, reduce or flatMap instead of loops.' },
  ],
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/consistent-type-imports': 'error',
  'prefer-const': 'error',
}

export default typescript.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**'],
  },
  javascript.configs.recommended,
  ...typescript.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: functionalStyle,
  },
  {
    files: ['apps/web/**/*.tsx', 'apps/web/**/*.ts'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
)
