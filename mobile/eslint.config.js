import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const expo = require('eslint-config-expo/flat');
export default [...expo, { ignores: ['backend-proposal/**', 'dist/**', 'node_modules/**'] }, { files: ['tests/**'], languageOptions: { globals: { Buffer: 'readonly' } } }];
