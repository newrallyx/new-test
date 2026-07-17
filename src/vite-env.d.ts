/// <reference types="vite/client" />

import type { RoadtripDesktopApi } from './types/desktop'

declare global {
  interface Window {
    roadtripDesktop?: RoadtripDesktopApi
  }
}

export {}
