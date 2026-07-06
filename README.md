# 旅行轨迹记录与规划工具

这是一个基于 **React + TypeScript + Vite + Leaflet + Express** 的旅行路线记录与规划工具。它可以把一次旅行拆成「旅程、日期、路段」，用来记录或规划每一段路线，并在地图上展示轨迹、距离、途经点、备注和评分。

项目目前支持两个工作区：

- **复盘**：记录已经走过的路线。
- **规划**：提前整理未来行程。

## 快速开始

### 环境要求

- Windows 系统
- Node.js 20 LTS 或更高版本
- npm
- 高德 Web 服务 Key，用于地名联想和路线规划

可以先在命令行检查 Node.js 和 npm：

```bash
node -v
npm -v
```

### 第一次运行

在项目根目录运行初始化脚本。初始化完成后，再运行启动脚本。

程序会启动前端和后端，并打开：

```text
http://localhost:5173
```

项目根目录里提供了几个 Windows `.bat` 辅助脚本，用来完成这些常见操作：

- 启动完整程序
- 关闭本地服务
- 只启动前端
- 只启动后端
- 第一次初始化依赖

## 环境变量

复制 `.env.example` 为 `.env.local`，然后填写你的高德 Key：

```bash
AMAP_WEB_API_KEY=你的高德Web服务Key
BACKEND_PORT=3001
VITE_BACKEND_BASE_URL=http://localhost:3001
VITE_APP_MODE=normal
```

后端会按下面顺序读取 Key：

1. `AMAP_WEB_API_KEY`
2. `AMAP_WEB_KEY`
3. `AMAP_KEY`

高德 Key 只在后端代理中使用，不会直接暴露给浏览器。

## 开发命令

安装依赖：

```bash
npm install
```

同时启动前端和后端：

```bash
npm run dev
```

只启动前端：

```bash
npm run dev:frontend
```

只启动后端：

```bash
npm run dev:backend
```

运行测试：

```bash
npm test
```

构建生产版本：

```bash
npm run build
```

预览构建结果：

```bash
npm run preview
```

## 主要功能

- 创建、编辑、删除和排序旅程
- 按复盘或规划分类管理旅程
- 按日期组织路段
- 编辑路段名称、日期、起点、终点和途经点
- 使用高德接口进行地名联想和路线规划
- 支持驾车和骑行路线
- 显示单路段、单日、单旅程或全部旅程的地图轨迹
- 统计单路段、单日和整趟旅程的距离
- 为路段记录风景评分、难度评分和备注
- 按评分模式给路线着色
- 支持只读演示模式
- 支持导出本地备份，包含旅程数据和路线缓存

## 只读演示模式

只读演示模式适合部署成公开展示页。

本地运行：

```bash
VITE_APP_MODE=readonly-demo npm run dev:frontend
```

构建：

```bash
VITE_APP_MODE=readonly-demo npm run build
```

演示数据从下面的文件加载：

```text
public/demo-data/manifest.json
public/demo-data/part-01.json
```

如果真实演示数据较大，可以使用脚本重新拆分：

```bash
node scripts/split-demo-data.mjs
```

默认会读取：

```text
backup/demo-data.json
```

也可以手动指定源文件：

```bash
node scripts/split-demo-data.mjs path/to/demo-data.json
```

## 数据保存

普通模式下，项目使用浏览器本地存储：

- 旅程结构保存在 `localStorage`
- 大体积路线轨迹缓存在 `IndexedDB`

这样可以避免把大量轨迹点全部塞进 `localStorage` 导致容量超限。

页面里的备份导出功能会导出一份 JSON 文件，其中包含：

- 旅程、日期、路段等结构化数据
- IndexedDB 中的路线缓存
- 导出时间和数据统计信息

## 项目结构

```text
backend/             Express 后端和高德 API 代理
public/demo-data/    只读演示数据分片
scripts/             数据处理脚本
src/components/      React 组件
src/hooks/           业务状态 Hook
src/services/        存储、地图、备份和演示数据服务
src/styles/          样式文件
src/types/           TypeScript 类型
src/utils/           通用工具函数
tests/               后端代理测试
```

## 常见问题

### 地名联想或路线规划不可用

请检查：

- `.env.local` 是否存在
- `AMAP_WEB_API_KEY` 是否填写正确
- 后端服务是否已经启动
- 修改环境变量后是否重启了服务

### 浏览器页面打不开

请检查：

- Node.js 是否已经安装
- 是否执行过 `npm install`
- 前端端口 `5173` 是否被占用
- 后端端口 `3001` 是否被占用

### 地图没有显示路线

可能原因：

- 起点或终点坐标不完整
- 高德 API 额度不足或上游请求失败
- 当前路线条件下没有可行路线
- 只读演示数据缺少对应轨迹点

## 技术栈

- React 18
- TypeScript
- Vite
- Leaflet / React Leaflet
- Express
- 高德 Web 服务 API
- localStorage
- IndexedDB
- Node.js test runner