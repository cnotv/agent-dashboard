import javascript from '@eslint/js'
import globals from 'globals'
import typescript from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

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
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'apps/web/src/components/ui/**',
      'apps/web/src/lib/utils.ts',
    ],
  },
  javascript.configs.recommended,
  ...typescript.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.ts', '**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: typescript.parser, extraFileExtensions: ['.vue'], sourceType: 'module' },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      ...functionalStyle,
      'vue/multi-word-component-names': 'off',
      // Layout of attributes and short elements is a formatter's job, not a correctness rule.
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
    },
  },
)
