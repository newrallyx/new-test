# AGENTS.md

## 版本与打包规则

- 每完成一个新版本的功能后，必须打包成对应版本号的 Windows 便携 EXE。
- 步骤：
  1. `npm version <新版本号> --no-git-tag-version`（如 `npm version 0.2.9 --no-git-tag-version`），不要打 git tag；
  2. 运行 `npm run package:win` 打包（含 tsc + vite 构建、图标生成、electron-builder portable）；
  3. 验证 `release/旅行轨迹记录与规划工具 <版本号>.exe` 已生成。
- 注意：electron-builder 需要 PowerShell。若报 `spawn powershell.exe ENOENT`，
  先执行 `export PATH="/c/Windows/System32/WindowsPowerShell/v1.0:$PATH"` 再打包。
- 打包前先跑 `npm test` 和 `npx tsc -b`，确认全绿。
