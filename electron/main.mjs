import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, dialog, shell } from 'electron'
import { createApp } from '../backend/src/app.js'
import { loadBackendEnv, resolveAmapWebApiKey } from '../backend/src/env.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

let mainWindow = null
let server = null

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
  loadBackendEnv(getExternalEnvPaths())

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

  return new Promise((resolve, reject) => {
    server = createServer(expressApp)
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to resolve desktop server port.'))
        return
      }

      resolve(`http://127.0.0.1:${address.port}`)
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
    title: '旅行轨迹记录与规划工具',
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  server?.close()
})