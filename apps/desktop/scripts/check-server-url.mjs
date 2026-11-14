import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envFile = resolve(appRoot, '.env')

/**
 * 读取 apps/desktop/.env，但不覆盖命令行显式传入的变量。
 */
function loadEnvFile(file) {
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
    if (!match) continue
    const key = match[1]
    const raw = match[2].replace(/^['"]|['"]$/g, '')
    if (process.env[key] === undefined) process.env[key] = raw
  }
}

loadEnvFile(envFile)

const value = process.env.VITE_SERVER_URL?.trim() ?? ''

function fail(reason) {
  console.error(`\n[check:server-url] 打包中止：${reason}`)
  console.error('请设置真实后端地址后再打包，例如：')
  console.error(
    '  VITE_SERVER_URL=https://your-server.example.com pnpm --filter @clipsync/desktop dist:mac'
  )
  console.error(`或在 ${envFile} 中写入：`)
  console.error('  VITE_SERVER_URL=https://your-server.example.com\n')
  process.exit(1)
}

if (!value) {
  fail('未找到 VITE_SERVER_URL')
}

if (!/^https?:\/\//.test(value)) {
  fail(`VITE_SERVER_URL 必须以 http:// 或 https:// 开头，当前为 "${value}"`)
}

if (value.endsWith('/')) {
  fail(`VITE_SERVER_URL 末尾不要带斜杠，当前为 "${value}"`)
}

let hostname
try {
  hostname = new URL(value).hostname
} catch {
  fail(`VITE_SERVER_URL 不是合法 URL："${value}"`)
}

if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname)) {
  fail(`VITE_SERVER_URL 指向本机地址 "${value}"，安装包在其他设备上无法访问`)
}

console.log(`[check:server-url] 打包将使用后端地址：${value}`)
