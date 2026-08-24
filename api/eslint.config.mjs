// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      'src/generated/**',
      'src/database/generated/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // Controller signatures are structural: `register(@Body() dto: RegisterDto)`
      // declares the contract even while the handler is still a stub, so an
      // unused *argument* is not dead code here. Unused *variables* still error.
      // args: 'none' คือของเดิมของทีม เก็บไว้ไม่ให้โค้ดคนอื่นพัง
      // ignoreRestSiblings เพิ่มเข้ามาเพื่อให้ตัด field ทิ้งด้วย rest spread ได้
      // เช่น const { password, ...rest } = user ใน UsersService.sanitize()
      '@typescript-eslint/no-unused-vars': [
        'error',
        { args: 'none', ignoreRestSiblings: true },
      ],
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
);
