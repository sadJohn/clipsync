import baseConfig from '@clipsync/eslint-config'

/**
 * 服务端关闭 consistent-type-imports：
 * NestJS 依赖 emitDecoratorMetadata，构造器注入的类必须以值导入，
 * 改成 `import type` 会让 design:paramtypes 退化为 Object，导致依赖解析失败。
 */
export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off'
    }
  }
]
