# @richie696/angular-framework-primeng

## 21.0.2

### Major Changes

- 21.0.2

### Patch Changes

- Updated dependencies
  - @richie696/angular-framework@21.0.2

## 21.0.2

### Minor Changes

- ### 详细 changelog（按模块）

  #### `@richie696/angular-framework`

  - **重构**：将 `AbstractService` 内部实现按职责拆分为独立模块与类型文件（`types/` + `modules/`），降低单文件复杂度。
  - **增强**：`requestStream` 补充非 2xx 错误处理与 SSE 缓冲区上限保护，提升异常场景可观测性与稳定性。
  - **调整**：鉴权清理逻辑从全量清空存储改为定向清理认证相关键，降低对宿主应用的副作用。
  - **文档**：`projects/framework/README.md` 大幅完善，新增能力说明、适用场景、错误示例 vs 推荐示例（事件通信/并发控制）。
  - **注释**：`lib` 多个核心文件补齐 JSDoc 与关键流程行内注释（抽象类、锁工具、设备与存储等）。

  #### `@richie696/angular-framework-ionic`（新增）

  - **新增包**：Ionic 适配包工程结构（`ng-package`、`tsconfig`、`public-api`、`package` 元数据）。
  - **新增能力**：`AbstractIonicComponent` 默认提示实现。
  - **内聚增强**：新增 `prompt.adapter` / `providers` / `tokens` / `types`，支持配置化 prompt 行为。
  - **文档**：新增独立 README，包含安装、配置、继承示例。

  #### `@richie696/angular-framework-material`（新增）

  - **新增包**：Material 适配包工程结构。
  - **新增能力**：`AbstractMaterialComponent` 默认提示实现。
  - **内聚增强**：新增 `prompt.adapter` / `providers` / `tokens` / `types`，支持配置化 prompt 行为。
  - **文档**：新增独立 README，包含安装、配置、继承示例。

  #### `@richie696/angular-framework-primeng`（新增）

  - **新增包**：PrimeNG 适配包工程结构。
  - **新增能力**：`AbstractPrimeNGComponent` 默认提示实现。
  - **内聚增强**：新增 `prompt.adapter` / `providers` / `tokens` / `types`，支持配置化 prompt 行为。
  - **文档**：新增独立 README，包含安装、配置、继承示例。

  #### 工程与发布流程（仓库级）

  - **构建体系**：`angular.json` 增加 3 个新 library project 构建入口。
  - **脚本优化**：根 `package.json` 统一为精简脚本集（`toc` / `build` / `build-all` / `publish:all`）。
  - **文档自动化**：引入 `markdown-toc`，README 目录自动生成并挂载到构建流程。
  - **版本治理**：引入 `changesets`，配置 `fixed` 版本联动（4 个包统一版本），新增版本/发布相关脚本。
  - **工作区配置**：补充 workspace 识别与 changesets 配置（`baseBranch`、`fixed` 等）。

### Patch Changes

- Updated dependencies
  - @richie696/angular-framework@21.0.2
