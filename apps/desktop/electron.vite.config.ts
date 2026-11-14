import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    // better-sqlite3 属于原生模块，必须保持 external，由 Electron 运行时加载
    // @clipsync/shared 是 workspace 包，直接打进产物以避免运行时的模块格式问题
    plugins: [externalizeDepsPlugin({ exclude: ['@clipsync/shared'] })],
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ['@clipsync/shared'] })],
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
      },
    },
    plugins: [react()],
  },
})
