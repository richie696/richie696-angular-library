# @richie696/angular-framework

[![npm version](https://img.shields.io/npm/v/%40richie696%2Fangular-framework?logo=npm&label=npm)](https://www.npmjs.com/package/@richie696/angular-framework)
[![npm downloads](https://img.shields.io/npm/dm/%40richie696%2Fangular-framework?logo=npm&label=downloads)](https://www.npmjs.com/package/@richie696/angular-framework)
[![GitHub stars](https://img.shields.io/github/stars/richie696/richie696-angular-library?logo=github&label=stars)](https://github.com/richie696/richie696-angular-library)
[![GitHub issues](https://img.shields.io/github/issues/richie696/richie696-angular-library?logo=github&label=issues)](https://github.com/richie696/richie696-angular-library/issues)
[![MIT License](https://img.shields.io/github/license/richie696/richie696-angular-library?logo=opensourceinitiative&label=license)](LICENSE)

[📦 Core npm](https://www.npmjs.com/package/@richie696/angular-framework) · [💻 GitHub](https://github.com/richie696/richie696-angular-library) · [📚 文档](projects/framework/README.md) · [🐛 Issues](https://github.com/richie696/richie696-angular-library/issues) · [🤝 贡献](CONTRIBUTING.md) · [🛡️ 安全](SECURITY.md) · [📄 License](LICENSE)


------

仓库级 Angular 基础库工程，采用 monorepo 结构，包含 1 个核心包和 3 个 UI 适配包。

当前所有可发布包统一为 `1.0.2`。运行要求：Node.js `>=20`、pnpm `10.x`、Angular `^22.1.1`。

## 架构定位

Core 只负责业务无关的基础能力；Ionic、Angular Material 和 PrimeNG 只负责各自 UI 生态的组件基类与 Prompt 实现。业务页面面向 `AbstractComponent`、`AbstractService` 和 `AbstractPrompt` 编程，替换 UI 适配包时无需改动业务请求和页面逻辑。

## 能力总览（Public API）

| 能力模块 | 主要内容 | 适用场景 |
| --- | --- | --- |
| 页面与提示抽象 | `AbstractComponent`、`AbstractPrompt` | 统一页面基类、导航和提示调用 |
| 请求与流式传输 | `AbstractService`、SSE、拦截器、超时、重试 | 统一 API 调用和服务端流式响应 |
| 协议与数据模型 | `Url`、`Method`、`ApiResult`、`Page` | 统一接口地址、方法和响应结构 |
| 安全与设备 | ECC/AES、HMAC、设备 ID、请求头管理 | 加密接口、风控和可信设备 |
| 并发同步 | `ReentrantLock`、`ReadWriteLock`、`StampedLock`、`Condition` 等 | 防重复提交和异步任务协调 |
| 事件与 Mock | `EventManager`、`MockInterceptor`、`installMockFetch` | 跨模块通信与联调阶段 Mock |

## 包结构

- `@richie696/angular-framework`（Core）
  - 核心抽象与通用能力（组件抽象、请求能力、URL 模型、设备与存储能力、并发工具、事件机制）
- `@richie696/angular-framework-ionic`
  - Ionic 提示能力默认实现（`AbstractIonicComponent` + Prompt Adapter）
- `@richie696/angular-framework-material`
  - Angular Material 提示能力默认实现（`AbstractMaterialComponent` + Prompt Adapter）
- `@richie696/angular-framework-primeng`
  - PrimeNG 提示能力默认实现（`AbstractPrimeNGComponent` + Prompt Adapter）

## 组件与模块职责

### Core：`@richie696/angular-framework`

- `AbstractPrompt`：定义 `info/error/warn/success/confirm` 统一提示契约，业务不直接依赖具体 UI 组件。
- `AbstractComponent`：提供页面级公共能力，包括路由参数读取、导航和统一提示调用；业务页面继承它编写领域逻辑。
- `AbstractService`：统一封装 HTTP、SSE、超时、错误处理、请求加密、防重复提交、托管请求头和设备标识。
- `Url`、`Method`、`ApiResult`、`Page`：约束接口地址、请求方法、响应信封和分页模型，减少字符串与响应结构散落。
- `LocalStorage`、`ManagedHeadersStore`：统一浏览器存储、Capacitor Preferences 和服务端托管请求头的访问与持久化。
- `EventManager`、`EventNameEnum`：提供轻量事件发布订阅，用于登录态、列表刷新和跨模块通知。
- `ReentrantLock`、`ReadWriteLock`、`StampedLock`、`Condition`、`CountDownLatch`、`CyclicBarrier`、`synchronizedFunc`：协调同一 JavaScript 运行时内的异步竞争。
- `MockInterceptor`、`installMockFetch`、`resolveMockAssetUrl`：为 `HttpClient` 与 Angular `HttpClient` 提供可控的本地 Mock 拦截。
- `SseParser`、`DateFormatPipe`：分别处理 SSE 数据帧解析和日期展示格式化。

### UI 适配包

- `@richie696/angular-framework-ionic`：提供 `AbstractIonicComponent`、`IonicPromptAdapter` 和 `provideIonicPrompt`，接入 Ionic Toast/Alert。
- `@richie696/angular-framework-material`：提供 `AbstractMaterialComponent`、`MaterialPromptAdapter` 和 `provideMaterialPrompt`，接入 Angular Material SnackBar/Dialog。
- `@richie696/angular-framework-primeng`：提供 `AbstractPrimeNGComponent`、`PrimeNgPromptAdapter` 和 `providePrimeNgPrompt`，接入 PrimeNG Message/ConfirmDialog。

适配包只替换 Prompt 和页面基类实现，不改变 Core 的请求、协议、存储和并发 API。各适配包的详细安装和配置见对应 [Ionic 文档](projects/framework-ionic/README.md)、[Material 文档](projects/framework-material/README.md) 和 [PrimeNG 文档](projects/framework-primeng/README.md)。

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

## 典型接入示例

以 Material 为例，业务项目只需要安装 Core 和 Material 适配包，在 `app.config.ts` 注册 Prompt Provider：

```ts
import { ApplicationConfig } from '@angular/core';
import { provideMaterialPrompt } from '@richie696/angular-framework-material';

export const appConfig: ApplicationConfig = {
  providers: [
    ...provideMaterialPrompt({
      snackDuration: 2500,
      confirmOkI18nKey: 'app.common.confirm',
    }),
  ],
};
```

页面继承适配包的组件基类即可直接使用统一提示能力：

```ts
import { Component } from '@angular/core';
import { AbstractMaterialComponent } from '@richie696/angular-framework-material';

@Component({
  selector: 'app-user-page',
  template: `<button mat-raised-button (click)="save()">保存</button>`,
})
export class UserPage extends AbstractMaterialComponent {
  async save(): Promise<void> {
    await this.success('保存成功');
  }
}
```

## 发布说明（建议流程）

1. 确认 README 与 TOC 已更新（`pnpm run toc`）
2. 确认 npm 登录状态：`npm whoami --registry=https://registry.npmjs.org/`
3. 执行统一构建与发布脚本：

```bash
pnpm run publish:selected -- all
```

也可以按项目目录名或 npm 包名选择性发布：

```bash
pnpm run publish:selected -- framework framework-ionic
pnpm run publish:selected -- @richie696/angular-framework-primeng
```

脚本会先更新目录、构建选中的 Angular 包，再从 `dist/<package>` 逐个发布到 npm 官方 registry，并固定使用 `public` access。已发布版本不能重复覆盖，需要先更新版本号。

## 文档入口

### npm 包与独立文档

- [Core：`@richie696/angular-framework`](https://www.npmjs.com/package/@richie696/angular-framework) · [README](projects/framework/README.md)
- [Ionic：`@richie696/angular-framework-ionic`](https://www.npmjs.com/package/@richie696/angular-framework-ionic) · [README](projects/framework-ionic/README.md)
- [Material：`@richie696/angular-framework-material`](https://www.npmjs.com/package/@richie696/angular-framework-material) · [README](projects/framework-material/README.md)
- [PrimeNG：`@richie696/angular-framework-primeng`](https://www.npmjs.com/package/@richie696/angular-framework-primeng) · [README](projects/framework-primeng/README.md)

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
