# 旅行轨迹记录与规划工具

一款面向 Windows 的本地旅行路线记录与规划工具。项目使用 **React + TypeScript + Vite + Leaflet + Express + Electron**，通过高德 Web 服务完成地点联想、驾车/骑行路线规划，并把旅程、轨迹、照片索引和备份保存在本机。

应用包含两个工作区：

- **复盘**：整理已经走过的路线、评分、备注和旅途照片。
- **规划**：提前安排未来旅程、日期、路段和途经点。

## 当前稳定版

| 项目 | 当前值 |
| --- | --- |
| 版本 | `0.3.1` |
| 更新日期 | 2026-08-13 |
| 平台 | Windows x64，Electron 便携版 |
| 正式打包命令 | `npm.cmd run package:win` |
| 本地正式产物 | `release\旅行轨迹记录与规划工具 0.3.1.exe` |
| SHA-256 | `D6A06AF2FE892B68C2673BA628CFFB3E051B4AB9605E3036C1A1466F158228E6` |

`release*` 目录默认不提交到 Git。GitHub 仓库保存源代码，正式 EXE 需要通过发布渠道获取，或在 Windows 上按本文档自行打包。

当前正式版已经整合照片库、预计行驶时间和预估过路费、完整 ZIP 备份、旧路线缓存兼容、本地数据损坏保护，以及桌面后端访问限制等改进。

## 主要功能

### 旅程与日期管理

- 创建、编辑、删除、拖拽排序旅程，并按“复盘 / 规划”分类管理。
- 从现有旅程创建独立副本，方便保留历史方案或继续调整新方案。
- 按日期自动排序路段；支持在当前日期后插入一天或删除一天，并同步顺延/提前后续日期。
- 新增、编辑、删除和排序路段，切换筛选时尽量保留有效的当前选择。
- 记录路段风景评分、难度评分和备注，并按默认、风景或难度模式给轨迹着色。

### 路线规划与地图

- 使用高德地点联想选择起点、终点和多个途经点。
- 支持驾车路线和骑行路线。
- 驾车支持“高速优先”“速度优先”“避免收费”三种路线策略。
- 途经点可添加、删除、上移和下移；缺少坐标的途经点会阻止正式计算，避免生成误导路线。
- 可查看单路段、单日、单旅程或全部旅程的地图轨迹。
- 汇总距离、预计行驶时间和预估过路费，并在路段、日期和旅程层级展示。
- 路线轨迹缓存在 IndexedDB；缓存文件缺失时会自动重新规划，旧版可用轨迹仍可继续显示。
- 支持在地图上调整起终点、轨迹控制点和照片位置。

### 桌面照片库

照片库目前只在 **Electron 桌面版的复盘工作区**中启用。

- 每个旅程可登记一个本地照片库目录，并递归扫描其子目录。
- 支持 `JPEG`、`PNG`、`WebP`，单文件上限 100 MB；`HEIC/HEIF` 需要先转换为 JPEG 或 WebP。
- 应用只关联原图路径，不把原图复制进旅程数据；移除照片关联、删除旅程或移除照片库登记都不会删除本地原图。
- 扫描后可从候选照片中筛选、批量选择并关联到当前路段。
- 读取拍摄时间、方向和 GPS 等 EXIF 信息；中国境内的 WGS-84 坐标会转换为地图使用的 GCJ-02 坐标。
- 生成本地 WebP 缩略图，按需加载照片，避免大量原图同时进入内存。
- 在地图上显示照片标记和聚合数量，可点击地图或拖动相机图标手动调整位置。
- 支持照片查看、前后切换、备注、批量清除位置、恢复 EXIF 位置和移动到同一旅程的其他路段。
- 原图移动、缺失或内容变化时，可重新扫描、一键重新关联、刷新元数据和缩略图。
- 提供照片关联一致性检查与修复，清理无效引用、重复引用和孤立索引。

## 备份与恢复

### Windows 桌面版

桌面版导出完整 ZIP 备份，包含：

- 旅程、日期、路段、评分、备注、预计时间和预估过路费。
- IndexedDB 中的路线缓存。
- 当前旅程引用的照片索引、照片备注、地图位置和缩略图。
- 照片库目录登记信息。

ZIP **不包含本地原图**。原图仍保留在用户选择的照片库目录中；如果恢复后目录位置发生变化，需要在照片库界面重新关联目录或原图。

导入完整 ZIP 会替换当前全部旅程、路线缓存、照片索引和缩略图。恢复流程会先校验备份结构，并在写入失败时尽量回滚；仍建议在导入前先导出一份当前备份。

### 浏览器开发版

浏览器版导出 JSON，包含旅程数据和路线缓存，不包含桌面照片索引或缩略图。最新版仍支持导入旧版 JSON 备份，便于把已有浏览器数据迁移到桌面版。

## 数据保存位置

### 当前正式 EXE

当前正式版为兼容相册测试阶段的已有数据，继续使用下面的 Electron 用户数据目录：

```text
%APPDATA%\roadtrip-retrospective-tool-photo-album-preview
```

这是有意保留的兼容路径。主要内容包括：

```text
amap-key.json          高德 Web 服务 Key
photo-library.json     照片库目录和照片索引
photo-thumbnails\      照片缩略图缓存
Local Storage\         旅程结构数据
IndexedDB\             路线轨迹缓存
```

正式版固定使用本地端口 `41874`，确保同一应用版本重启后仍使用相同的浏览器存储 Origin。正式版和相册实验版共享此数据目录与端口，请不要同时运行。

复制或分享 EXE 文件本身不会同时分享你的旅程、照片、缩略图或高德 Key；这些数据都在用户自己的 AppData 和照片库目录中。

### 浏览器开发版

- 旅程结构：`localStorage`，键名 `trip-review-data-v1`。
- 损坏数据恢复副本：`localStorage`，键名 `trip-review-data-v1-recovery-copy`。
- 路线轨迹：IndexedDB 数据库 `trip-route-cache`，对象仓库 `segmentRoutes`。
- 存储归属于当前网页 Origin；更换协议、主机名或端口会形成另一份独立存储。

如果检测到损坏的旅程 JSON，程序会先隔离保存原文并停止自动覆盖，然后显示恢复提示，不会直接用示例数据覆盖真实内容。

## 普通用户快速开始

1. 在 Windows x64 电脑上运行正式版 EXE，无需安装。
2. 首次进入时按提示填写高德 Web 服务 Key；也可以稍后在顶部提示区域更新。
3. 在“复盘”或“规划”工作区创建旅程，再按日期添加路段。
4. 输入地点时从联想候选中选择结果，保证起终点和途经点都有坐标。
5. 需要整理照片时切换到“复盘”，选择旅程和路段，再登记照片库目录。
6. 定期从顶部“备份”菜单导出 ZIP。

## 本地开发

### 环境要求

- Windows 10/11 x64。
- Node.js 20 LTS 或更高版本。
- npm。
- 高德 Web 服务 Key。

PowerShell 中建议使用 `npm.cmd`，可以避开部分系统的 `npm.ps1` 执行策略限制。

### 安装与启动

```powershell
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

启动后访问：

```text
前端：http://localhost:5173
后端：http://127.0.0.1:3001
```

仓库根目录还提供以下 Windows 脚本：

- `首次初始化.bat`：安装依赖。
- `启动程序.bat`：分别启动前端、后端并打开浏览器。
- `启动前端.bat` / `启动后端.bat`：单独启动服务。
- `关闭程序.bat`：尝试关闭开发端口 `5173` 和 `3001` 上的服务。

### 环境变量

`.env.example` 的默认结构如下：

```dotenv
AMAP_WEB_API_KEY=your_amap_web_service_key
BACKEND_PORT=3001
VITE_BACKEND_BASE_URL=http://localhost:3001
VITE_APP_MODE=normal
```

后端按以下顺序读取高德 Key：

1. `AMAP_WEB_API_KEY`
2. `AMAP_WEB_KEY`（旧名称兼容）
3. `AMAP_KEY`（旧名称兼容）

开发环境中的 Key 只由本地 Express 代理读取，不会写入前端构建文件。桌面版还支持在应用内保存 Key，文件位置见“数据保存位置”。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm.cmd run dev` | 同时启动 Vite 前端和 Express 后端 |
| `npm.cmd run dev:frontend` | 只启动前端 |
| `npm.cmd run dev:backend` | 只启动后端 |
| `npm.cmd run desktop` | 先构建，再以 Electron 开发桌面模式运行 |
| `npm.cmd test` | 运行 Node.js 自动化测试 |
| `npm.cmd run build` | TypeScript 检查并构建生产前端 |
| `npm.cmd run preview` | 预览生产构建 |
| `npm.cmd run build:icon` | 重新生成 `build/icon.ico` |
| `npm.cmd run package:win` | 构建 Windows x64 正式便携版 |
| `npm.cmd run package:win:album-preview` | 构建相册实验版到 `release-photo-album-preview` |
| `npm.cmd run package:win:p0-fixes-test` | 构建独立 P0 修复测试版到 `release-p0-fixes-test` |

正式打包命令会依次执行生产构建、图标生成和 `electron-builder --win portable --x64`。输出目录为 `release`。

## 只读演示模式

只读演示模式适合部署公开展示页，写操作会被禁用。

PowerShell 启动：

```powershell
$env:VITE_APP_MODE = "readonly-demo"
npm.cmd run dev:frontend
```

PowerShell 构建：

```powershell
$env:VITE_APP_MODE = "readonly-demo"
npm.cmd run build
```

演示数据从以下文件加载：

```text
public/demo-data/manifest.json
public/demo-data/part-01.json
```

如需把较大的演示数据拆成多个分片：

```powershell
node scripts/split-demo-data.mjs
```

脚本默认读取 `backup/demo-data.json`，也可以指定源文件：

```powershell
node scripts/split-demo-data.mjs path/to/demo-data.json
```

## 本地安全边界

- 开发后端和桌面内置后端都只监听 `127.0.0.1`，不会监听全部网卡。
- `/api` 请求同时检查允许的本地 Origin 和应用客户端标识。
- Electron 照片接口只接受来自当前桌面 Origin 的调用，并把文件访问限制在已授权的照片库根目录内。
- 照片扫描跳过符号链接和目录联接，避免越过已授权目录。
- Electron 外部链接只允许 `http` 和 `https` 协议。
- 高德 Key 不会打包进前端 JavaScript；不要把 `.env.local` 提交到 Git。

这些限制用于降低本地服务被网页或局域网设备误调用的风险，但应用仍以本地单用户桌面工具为设计目标，不应直接暴露到公网。

## 项目结构

```text
backend/              Express 本地后端和高德 API 代理
build/                应用图标等打包资源
electron/             Electron 主进程、IPC、照片库和 ZIP 备份
public/demo-data/     只读演示数据分片
scripts/              图标生成和演示数据处理脚本
src/components/       React 界面组件
src/hooks/            旅程、路线、照片和备份状态逻辑
src/services/         本地存储、地图、照片、备份和演示数据服务
src/styles/           全局与应用样式
src/types/            TypeScript 领域类型
src/utils/            日期、距离、路线、照片坐标等工具函数
tests/                后端、存储、路线、照片和备份自动化测试
release*/             本地打包产物，默认被 Git 忽略
```

## 常见问题

### 地名联想或路线规划不可用

- 桌面版：检查顶部是否提示配置高德 Key，必要时重新保存。
- 开发版：检查 `.env.local`、`AMAP_WEB_API_KEY` 和后端进程。
- 输入地点后必须选择联想候选；只有名称而没有坐标的途经点不会参与规划。
- 检查高德 API 配额、网络和上游返回状态。

### 浏览器页面打不开

- 确认已经执行 `npm.cmd install`。
- 检查前端端口 `5173` 和后端端口 `3001` 是否被占用。
- 确认访问的是 `http://localhost:5173`，并且前后端都已启动。

### 地图没有显示路线

- 检查起点、终点和每个途经点是否都有有效坐标。
- 点击重新规划，让缓存缺失的路段重新生成轨迹。
- 检查当前旅程/日期/路段筛选是否隐藏了目标路线。
- 只读演示模式需要在演示数据中提供对应路线点。

### 照片库入口没有出现

照片库只在 Electron 桌面版的“复盘”工作区启用。请先选择一个旅程和具体路段；普通浏览器开发页不会获得本地照片文件访问权限。

### 照片移动后显示缺失

- 如果整个照片库目录移动了，先重新关联照片库根目录。
- 如果只移动了少量文件，重新扫描后使用“一键重新关联”或手动选择原图。
- 如果原图内容被修改，使用“接受变化并刷新照片”重新生成元数据和缩略图。

### 为什么备份里没有原图

应用采用“链接原图”的设计，避免把大量图片复制进 AppData 或备份文件。ZIP 保存足以恢复应用索引和界面的数据，原图需要由用户单独管理和备份。

### 换电脑后如何恢复

1. 在旧电脑导出完整 ZIP。
2. 单独复制原始照片库目录，并尽量保持目录结构。
3. 在新电脑导入 ZIP。
4. 如果照片目录路径变化，在照片库界面重新关联目录。

## 技术栈

- React 18 / React DOM 18
- TypeScript 5.6
- Vite 5
- Leaflet / React Leaflet
- Express 4
- Electron 31 / electron-builder
- 高德 Web 服务 API
- exifr、archiver、extract-zip
- localStorage、IndexedDB 和 Electron 本地文件存储
- Node.js test runner
