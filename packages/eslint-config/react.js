import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

/**
 * 渲染进程（React）附加规则：与 @clipsync/eslint-config 的基础配置叠加使用。
 * 仅作用于 src/renderer 下的文件，避免主进程被浏览器全局变量污染。
 */
export default [
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser }
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn'
    }
  },
  {
    // shadcn/ui 组件按惯例同时导出组件与 variants，Fast Refresh 规则在此不适用
    files: ['src/renderer/src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off'
    }
  }
]
