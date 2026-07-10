import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, dialog, shell } from 'electron'
import { createApp } from '../backend/src/app.js'
import { loadBackendEnv, resolveAmapWebApiKey } from '../backend/src/env.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const DEFAULT_DESKTOP_PORT = 41873

let mainWindow = null
let server = null

function getDesktopPort() {
  const rawPort = Number.parseInt(process.env.ROADTRIP_DESKTOP_PORT ?? '', 10)
  return Number.isInteger(rawPort) && rawPort > 0 && rawPort < 65536 ? rawPort : DEFAULT_DESKTOP_PORT
}

function getExternalEnvPaths() {
  const paths = []

  if (app.isPackaged) {
    paths.push(
      path.join(path.dirname(process.execPath), '.env'),
      path.join(path.dirname(process.execPath), '.env.local'),
      path.join(process.resourcesPath, '.env'),
      path.join(process.resourcesPath, '.env.local'),
    )
  }

  return paths
}

function getStaticDir() {
  return path.join(projectRoot, 'dist')
}

function getApiKeyConfigPath() {
  return path.join(app.getPath('userData'), 'amap-key.json')
}

function startLocalServer() {
  loadBackendEnv({
    extraPaths: getExternalEnvPaths(),
    includeDefaultPaths: !app.isPackaged,
  })

  const { key: amapWebApiKey, source } = resolveAmapWebApiKey(process.env)
  if (!amapWebApiKey) {
    console.warn('[desktop] AMAP Web API key not loaded. Expected AMAP_WEB_API_KEY, AMAP_WEB_KEY or AMAP_KEY.')
  } else {
    console.log(`[desktop] AMAP Web API key loaded from ${source}`)
  }

  const expressApp = createApp({
    amapWebApiKey,
    staticDir: getStaticDir(),
    apiKeyConfigPath: getApiKeyConfigPath(),
  })
  const desktopPort = getDesktopPort()

  return new Promise((resolve, reject) => {
    server = createServer(expressApp)
    server.once('error', (error) => {
      if (error && error.code === 'EADDRINUSE') {
        reject(new Error(`桌面服务端口 ${desktopPort} 已被占用，请关闭正在运行的程序后重试。`))
        return
      }

      reject(error)
    })
    server.listen(desktopPort, '127.0.0.1', () => {
      resolve(`http://127.0.0.1:${desktopPort}`)
    })
  })
}

async function createMainWindow() {
  const appUrl = await startLocalServer()

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    title: '自驾旅行记录与规划工具',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  await mainWindow.loadURL(appUrl)
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.whenReady().then(() => {
    createMainWindow().catch((error) => {
      console.error(error)
      dialog.showErrorBox('启动失败', error instanceof Error ? error.message : String(error))
      app.quit()
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createMainWindow()
      }
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  server?.close()
})
