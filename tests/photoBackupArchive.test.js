import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { PhotoMetadataStore } from '../electron/photoMetadataStore.mjs'
import { PhotoThumbnailCache } from '../electron/photoThumbnailCache.mjs'
import {
  commitPreparedDesktopBackup,
  prepareDesktopBackupZip,
  readTripBackupJsonFile,
  restoreDesktopBackupZip,
  writeDesktopBackupZip,
} from '../electron/photoBackupArchive.mjs'

function createWebp(payload = [1, 2, 3]) {
  return Buffer.concat([
    Buffer.from('RIFF', 'ascii'),
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('WEBP', 'ascii'),
    Buffer.from(payload),
  ])
}

function createRoot(rootPath) {
  return {
    id: 'root-1',
    name: 'Road trip photos',
    path: rootPath,
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z',
  }
}

function createPhoto(id, segmentId) {
  return {
    id,
    segmentId,
    storageMode: 'linked',
    libraryRootId: 'root-1',
    relativePath: path.join('day-1', `${id}.jpg`),
    originalFilename: `${id}.jpg`,
    importedAt: '2026-07-11T00:01:00.000Z',
    updatedAt: '2026-07-11T00:01:00.000Z',
    fingerprint: { size: 1024, modifiedAt: 123456 },
    thumbnailCacheKey: `${id}.webp`,
  }
}

function createTripBackupJson() {
  return JSON.stringify({
    schema: 'roadtrip-retrospective-backup',
    version: 1,
    exportedAt: '2026-07-11T00:00:00.000Z',
    data: {
      tripReview: { trips: [] },
      segmentRoutes: [],
    },
  })
}

test('desktop ZIP round-trip restores referenced photo metadata and thumbnails without originals', async (t) => {
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'roadtrip-photo-backup-'))
  t.after(() => rm(tempDirectory, { recursive: true, force: true }))
  const sourceStore = new PhotoMetadataStore(path.join(tempDirectory, 'source', 'photo-library.json'))
  const sourceCache = new PhotoThumbnailCache(path.join(tempDirectory, 'source', 'photo-thumbnails'))
  await sourceStore.saveRoot(createRoot(path.join(tempDirectory, 'original-photos')))
  await sourceStore.savePhoto(createPhoto('photo-keep', 'segment-1'))
  await sourceStore.savePhoto(createPhoto('photo-orphan', 'segment-2'))
  await sourceCache.save('photo-keep', createWebp([1]))
  await sourceCache.save('photo-orphan', createWebp([2]))

  const zipPath = path.join(tempDirectory, 'backup.zip')
  const exported = await writeDesktopBackupZip({
    zipPath,
    tripBackupJson: createTripBackupJson(),
    referencedPhotoIds: ['photo-keep'],
    metadataStore: sourceStore,
    thumbnailCache: sourceCache,
  })
  assert.equal(exported.photoCount, 1)
  assert.equal(exported.thumbnailCount, 1)

  const targetStore = new PhotoMetadataStore(path.join(tempDirectory, 'target', 'photo-library.json'))
  const targetCache = new PhotoThumbnailCache(path.join(tempDirectory, 'target', 'photo-thumbnails'))
  await targetStore.saveRoot({ ...createRoot(path.join(tempDirectory, 'old-photos')), id: 'root-old' })
  await targetStore.savePhoto({
    ...createPhoto('photo-old', 'segment-old'),
    libraryRootId: 'root-old',
  })
  await targetCache.save('photo-old', createWebp([9]))
  const restored = await restoreDesktopBackupZip({
    zipPath,
    tempParentPath: tempDirectory,
    metadataStore: targetStore,
    thumbnailCache: targetCache,
  })

  assert.equal(restored.tripBackupJson, createTripBackupJson())
  assert.equal(restored.photoCount, 1)
  assert.equal((await targetStore.getPhoto('photo-keep')).relativePath, path.join('day-1', 'photo-keep.jpg'))
  assert.equal(await targetStore.getPhoto('photo-orphan'), null)
  assert.equal(await targetStore.getPhoto('photo-old'), null)
  assert.deepEqual(await targetCache.read('photo-keep'), createWebp([1]))
  assert.equal(await targetCache.read('photo-orphan'), null)
  assert.equal(await targetCache.read('photo-old'), null)
})

test('desktop ZIP export rejects unsupported trip backup JSON', async (t) => {
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'roadtrip-photo-backup-'))
  t.after(() => rm(tempDirectory, { recursive: true, force: true }))
  const store = new PhotoMetadataStore(path.join(tempDirectory, 'photo-library.json'))
  const cache = new PhotoThumbnailCache(path.join(tempDirectory, 'photo-thumbnails'))

  await assert.rejects(writeDesktopBackupZip({
    zipPath: path.join(tempDirectory, 'backup.zip'),
    tripBackupJson: JSON.stringify({ trips: [] }),
    referencedPhotoIds: [],
    metadataStore: store,
    thumbnailCache: cache,
  }), /schema or version/)
})

test('desktop backup file reader accepts both exported and legacy raw JSON backups', async (t) => {
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'roadtrip-photo-backup-'))
  t.after(() => rm(tempDirectory, { recursive: true, force: true }))
  const exportedPath = path.join(tempDirectory, 'exported.json')
  const legacyPath = path.join(tempDirectory, 'legacy.json')
  const invalidPath = path.join(tempDirectory, 'invalid.json')
  await writeFile(exportedPath, createTripBackupJson(), 'utf8')
  await writeFile(legacyPath, JSON.stringify({ trips: [] }), 'utf8')
  await writeFile(invalidPath, JSON.stringify({ data: {} }), 'utf8')

  assert.equal(await readTripBackupJsonFile(exportedPath), createTripBackupJson())
  assert.deepEqual(JSON.parse(await readTripBackupJsonFile(legacyPath)), { trips: [] })
  await assert.rejects(readTripBackupJsonFile(invalidPath), /schema or version/)
})

test('desktop ZIP preparation is non-mutating and commit rolls thumbnails back when metadata replacement fails', async (t) => {
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'roadtrip-photo-backup-'))
  t.after(() => rm(tempDirectory, { recursive: true, force: true }))
  const sourceStore = new PhotoMetadataStore(path.join(tempDirectory, 'source', 'photo-library.json'))
  const sourceCache = new PhotoThumbnailCache(path.join(tempDirectory, 'source', 'photo-thumbnails'))
  await sourceStore.saveRoot(createRoot(path.join(tempDirectory, 'new-photos')))
  await sourceStore.savePhoto(createPhoto('photo-new', 'segment-new'))
  await sourceCache.save('photo-new', createWebp([1]))
  const zipPath = path.join(tempDirectory, 'backup.zip')
  await writeDesktopBackupZip({
    zipPath,
    tripBackupJson: createTripBackupJson(),
    referencedPhotoIds: ['photo-new'],
    metadataStore: sourceStore,
    thumbnailCache: sourceCache,
  })

  const targetStore = new PhotoMetadataStore(path.join(tempDirectory, 'target', 'photo-library.json'))
  const targetCache = new PhotoThumbnailCache(path.join(tempDirectory, 'target', 'photo-thumbnails'))
  await targetStore.saveRoot({ ...createRoot(path.join(tempDirectory, 'old-photos')), id: 'root-old' })
  await targetStore.savePhoto({ ...createPhoto('photo-old', 'segment-old'), libraryRootId: 'root-old' })
  await targetCache.save('photo-old', createWebp([9]))

  const prepared = await prepareDesktopBackupZip({
    zipPath,
    tempParentPath: tempDirectory,
    thumbnailCache: targetCache,
  })
  assert.ok(await targetStore.getPhoto('photo-old'))
  assert.deepEqual(await targetCache.read('photo-old'), createWebp([9]))

  let replacementAttempts = 0
  const failOnceStore = {
    read: () => targetStore.read(),
    replaceAll: async (roots, photos) => {
      replacementAttempts += 1
      if (replacementAttempts === 1) throw new Error('metadata disk failure')
      return targetStore.replaceAll(roots, photos)
    },
  }
  await assert.rejects(commitPreparedDesktopBackup({
    prepared,
    metadataStore: failOnceStore,
    thumbnailCache: targetCache,
  }), /metadata disk failure/)

  assert.ok(await targetStore.getPhoto('photo-old'))
  assert.equal(await targetStore.getPhoto('photo-new'), null)
  assert.deepEqual(await targetCache.read('photo-old'), createWebp([9]))
  assert.equal(await targetCache.read('photo-new'), null)
})
