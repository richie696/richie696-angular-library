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

<!-- tocstop -->

------

仓库级 Angular 基础库工程，采用 monorepo 结构，包含 1 个核心包和 3 个 UI 适配包。

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
npm install
```

### 2) 生成文档目录（README TOC）

```bash
npm run toc
```

### 3) 构建

仅构建 core：

```bash
npm run build
```

构建所有包：

```bash
npm run build-all
```

按包单独构建：

```bash
npm run build:framework
npm run build:ionic
npm run build:material
npm run build:primeng
```

## 常用脚本

- `npm run toc`：自动更新 4 个 README 的目录（`markdown-toc`）
- `npm run build`：更新目录后构建 core 包
- `npm run build-all`：更新目录后构建全部包
- `npm run test`：执行测试
- `npm run lint`：执行 lint

## 发布说明（建议流程）

1. 确认 README 与 TOC 已更新（`npm run toc`）
2. 执行全量构建验证（`npm run build-all`）
3. 进入对应 `dist/<package>` 目录发布

示例（发布 core）：

```bash
cd dist/framework
npm publish
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
