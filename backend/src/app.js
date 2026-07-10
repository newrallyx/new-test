import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import cors from 'cors'
import { createInputTipsProxyHandler } from './amapInputTipsProxy.js'
import { createDirectionProxyHandler } from './amapDirectionProxy.js'
import { createCyclingDirectionProxyHandler } from './amapCyclingDirectionProxy.js'

function cleanAmapKey(value) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function isPlausibleAmapKey(value) {
  return /^[A-Za-z0-9_-]{8,128}$/.test(value)
}

function readStoredAmapKey(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return ''

  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    return cleanAmapKey(parsed?.AMAP_WEB_API_KEY)
  } catch (error) {
    console.warn('[backend] Failed to read stored AMAP key config.', error)
    return ''
  }
}

function writeStoredAmapKey(filePath, amapWebApiKey) {
  if (!filePath) return

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify({ AMAP_WEB_API_KEY: amapWebApiKey }, null, 2)}\n`, 'utf8')
}

export function createApp({ amapWebApiKey, staticDir, apiKeyConfigPath, allowApiKeySetup = true } = {}) {
  const app = express()
  const environmentAmapKey = cleanAmapKey(amapWebApiKey)
  const storedAmapKey = readStoredAmapKey(apiKeyConfigPath)
  let currentAmapWebApiKey = environmentAmapKey || storedAmapKey
  let currentAmapKeySource = environmentAmapKey ? 'environment' : storedAmapKey ? 'local-config' : null

  const getAmapWebApiKey = () => currentAmapWebApiKey

  app.use(cors())
  app.use(express.json())

  app.get('/healthz', (_req, res) => {
    res.status(200).json({ ok: true })
  })

  app.get('/api/config/amap-key', (_req, res) => {
    res.status(200).json({
      ok: true,
      configured: Boolean(currentAmapWebApiKey),
      source: currentAmapKeySource,
    })
  })

  app.post('/api/config/amap-key', (req, res) => {
    if (!allowApiKeySetup) {
      res.status(403).json({ ok: false, message: 'API key setup is disabled.' })
      return
    }

    const nextKey = cleanAmapKey(req.body?.key)
    if (!nextKey || !isPlausibleAmapKey(nextKey)) {
      res.status(400).json({ ok: false, message: 'Please enter a valid AMAP Web Service API key.' })
      return
    }

    try {
      writeStoredAmapKey(apiKeyConfigPath, nextKey)
      currentAmapWebApiKey = nextKey
      currentAmapKeySource = 'local-config'
      res.status(200).json({ ok: true, configured: true, source: currentAmapKeySource })
    } catch (error) {
      console.error('[backend] Failed to save AMAP key config.', error)
      res.status(500).json({ ok: false, message: 'Failed to save API key.' })
    }
  })

  const inputTipsHandler = createInputTipsProxyHandler({ getAmapKey: getAmapWebApiKey })
  const directionHandler = createDirectionProxyHandler({ getAmapWebApiKey })
  const cyclingDirectionHandler = createCyclingDirectionProxyHandler({ getAmapWebApiKey })

  app.get('/api/amap/inputtips', inputTipsHandler)
  app.get('/api/amap/direction', directionHandler)
  app.get('/api/amap/cycling-direction', cyclingDirectionHandler)

  if (staticDir) {
    app.use(express.static(staticDir))
    app.get('*', (_req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'))
    })
  }

  return app
}
