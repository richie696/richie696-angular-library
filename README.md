# Rydeen Angular Library

<!-- toc -->

- [包结构](#%E5%8C%85%E7%BB%93%E6%9E%84)
- [目录说明](#%E7%9B%AE%E5%BD%95%E8%AF%B4%E6%98%8E)
- [何时使用哪个包](#%E4%BD%95%E6%97%B6%E4%BD%BF%E7%94%A8%E5%93%AA%E4%B8%AA%E5%8C%85)
- [快速开始](#%E5%BF%AB%E9%80%9F%E5%BC%80%E5%A7%8B)
  * [1) 安装依赖](#1-%E5%AE%89%E8%A3%85%E4%BE%9D%E8%B5%96)
  * [2) 生成文档目录（README TOC）](#2-%E7%94%9F%E6%88%90%E6%96%87%E6%A1%A3%E7%9B%AE%E5%BD%95readme-toc)
  * [3) 构建](#3-%E6%9E%84%E5%BB%BA)
- [常用脚本](#%E5%B8%B8%E7%94%A8%E8%84%9A%E6%9C%AC)
- [发布说明（建议流程）](#%E5%8F%91%E5%B8%83%E8%AF%B4%E6%98%8E%E5%BB%BA%E8%AE%AE%E6%B5%81%E7%A8%8B)
- [文档入口](#%E6%96%87%E6%A1%A3%E5%85%A5%E5%8F%A3)
- [设计原则](#%E8%AE%BE%E8%AE%A1%E5%8E%9F%E5%88%99)
- [能力边界](#%E8%83%BD%E5%8A%9B%E8%BE%B9%E7%95%8C)
- [许可证](#%E8%AE%B8%E5%8F%AF%E8%AF%81)

<!-- tocstop -->

------

仓库级 Angular 基础库工程，采用 monorepo 结构，包含 1 个核心包和 3 个 UI 适配包。

当前所有可发布包统一为 `1.0.0`。运行要求：Node.js `>=20`、pnpm `10.x`、Angular `^22.1.1`。

## 包结构

- `@richie696/angular-framework`（Core）
  - 核心抽象与通用能力（组件抽象、请求能力、URL 模型、设备与存储能力、并发工具、事件机制）
- `@richie696/angular-framework-ionic`
  - Ionic 提示能力默认实现（`AbstractIonicComponent` + Prompt Adapter）
- `@richie696/angular-framework-material`
  - Angular Material 提示能力默认实现（`AbstractMaterialComponent` + Prompt Adapter）
- `@richie696/angular-framework-primeng`
  - PrimeNG 提示能力默认实现（`AbstractPrimeNGComponent` + Prompt Adapter）

## 目录说明

```text
projects/
  framework/             # core 包
  framework-ionic/       # ionic 适配包
  framework-material/    # material 适配包
  framework-primeng/     # primeng 适配包
dist/
  framework/
  framework-ionic/
  framework-material/
  framework-primeng/
```

## 何时使用哪个包

- 只需要通用基础能力：仅安装 `@richie696/angular-framework`
- 项目 UI 使用 Ionic：安装 core + `@richie696/angular-framework-ionic`
- 项目 UI 使用 Material：安装 core + `@richie696/angular-framework-material`
- 项目 UI 使用 PrimeNG：安装 core + `@richie696/angular-framework-primeng`
- 如果项目不使用上述 3 种 UI：基于 core 自行实现 `AbstractPrompt` 接口

## 快速开始

### 1) 安装依赖

```bash
pnpm install
```

### 2) 生成文档目录（README TOC）

```bash
pnpm run toc
```

### 3) 构建

仅构建 core：

```bash
pnpm run build
```

构建所有包：

```bash
pnpm run build-all
```

按包单独构建：

```bash
pnpm run build:framework
pnpm run build:ionic
pnpm run build:material
pnpm run build:primeng
```

## 常用脚本

- `pnpm run toc`：自动更新 4 个 README 的目录（`markdown-toc`）
- `pnpm run build`：更新目录后构建 core 包
- `pnpm run build:framework` / `pnpm run build:ionic` / `pnpm run build:material` / `pnpm run build:primeng`：按包构建
- `pnpm run build-all`：更新目录后构建全部包

## 发布说明（建议流程）

1. 确认 README 与 TOC 已更新（`pnpm run toc`）
2. 执行全量构建验证（`pnpm run build-all`）
3. 进入对应 `dist/<package>` 目录发布

示例（发布 core）：

```bash
cd dist/framework
pnpm publish --access public
```

## 文档入口

- Core 包文档：`projects/framework/README.md`
- Ionic 适配包文档：`projects/framework-ionic/README.md`
- Material 适配包文档：`projects/framework-material/README.md`
- PrimeNG 适配包文档：`projects/framework-primeng/README.md`

## 设计原则

- Core 与 UI 适配解耦，避免主包传递 UI 依赖
- 业务代码优先面向抽象（`AbstractComponent` / `AbstractService` / `AbstractPrompt`）
- UI 库替换应尽量只影响适配层，不影响业务层

## 能力边界

- Core 的请求加密、设备标识和 HMAC 能力依赖服务端协议；浏览器端密钥不能视为真正秘密。
- Core 的锁、栅栏和条件变量只协调同一 JavaScript 运行时中的异步任务，不提供跨标签页或跨进程同步。
- 适配包只负责 Prompt 和 Angular 组件基类，不替宿主应用决定主题、路由或业务 API。

## 许可证

本项目基于 [MIT License](LICENSE) 开源。
