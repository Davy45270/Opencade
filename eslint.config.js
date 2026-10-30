import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config({
    ignores: ['dist/**', 'node_modules/**', '.pw-browsers/**', '.npm-cache/**', 'test-results/**', 'playwright-report/**']
}, js.configs.recommended, ...ts.configs.strictTypeChecked, {
    files: ['**/*.ts'],
    languageOptions: {
        parserOptions: {
            projectService: true,
            tsconfigRootDir: import.meta.dirname
        }
    }
}, {
    files: ['**/*.js'],
    ...ts.configs.disableTypeChecked
}, {
    files: ['src/engines/**', 'src/characters/model.ts'],
    rules: {
        'no-restricted-imports': [
            'error',
            {
                patterns: ['phaser', 'phaser/*']
            }
        ],
        'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage', 'HTMLElement', 'HTMLCanvasElement', 'fetch', 'requestAnimationFrame', 'alert', 'globalThis'],
        'no-restricted-properties': [
            'error',
            {
                object: 'Math',
                property: 'random'
            }
        ]
    }
});
