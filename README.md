# @richie696/angular-framework

`@richie696/angular-framework` 是一个面向团队复用的 **Angular + TypeScript + OOP** 通用框架库，用来把「业务无关」的前端底座能力沉淀出来，配合工程骨架（如 `cross-platform-app`）一起使用。

- **目标**：让业务应用只关注 `core/shared/features`，把 HTTP/事件总线/存储/抽象服务/页面基类等统一交给框架。
- **收益**：统一代码风格、统一错误处理与消息提示、统一 ResultVO 协议与 URL 管理，减少“每个项目自己发挥”的成本。

> 文档结构与 `@richie696/vue-framework` 一致：先讲如何接入，再讲有哪些能力，以及这些能力背后的设计思路。

## 快速开始

```bash
pnpm add @richie696/angular-framework
```

在你的 Angular 应用中，通常只需要：

- 按常规方式提供 `HttpClient` / 路由 / 国际化（如果需要）
- 在业务代码中改为继承框架提供的基类，如 `AbstractService` / `AbstractAppPage`

示例（服务与页面）可参考平台文档 `platform-reference/docs/angular` 与示例工程 `cross-platform-app`。

## 能力总览（Public API 概览）

- **抽象服务与 HTTP 封装**
  - `AbstractService`：统一封装基于 `HttpClient` 的请求（URL 枚举、ResultVO 外壳、重试/防重复等横切逻辑）。
  - `AbstractAppService`（如有）：在 `AbstractService` 之上，绑定应用级事件（全局 Loading、统一错误处理等）。
  - `Url` / `Method`：统一管理后端 URL 与 HTTP Method，避免字符串散落。
- **页面基类与事件分发**
  - `AbstractComponent` / `AbstractAppPage`：页面/组件的基类，统一处理：
    - 生命周期内事件订阅管理（自动解绑）
    - UI 事件分发（通过 `data-id` 绑定 handler）
    - 统一的消息提示（SnackBar / Dialog）
- **事件总线与应用事件**
  - `EventManager`：基于 RxJS 的事件总线，提供发布/订阅与订阅生命周期托管。
  - `EventNameEnum`：事件名枚举基类，避免字符串常量到处乱飞。
  - 应用可以基于它扩展 `AppEvent`，实现全局 Loading / 全局消息 / 业务事件等。
- **存储与并发控制**
  - 本地存储封装（如 LocalStorage/SessionStorage 包装器）
  - 锁工具（例如基于 RxJS 的并发锁或去重工具），减少重复请求或并发写问题。
- **其他基础设施**
  - 与 ResultVO / Page 等通用类型配套的工具类型与辅助函数。

> 实际导出列表请以 `dist/index.d.ts` 为准，工程骨架会按约定从该库导入所有框架层能力。

## 设计思路与封装原则

### 1) 为什么要有 `AbstractService`

在传统 Angular 项目中，每个业务 Service 往往直接注入 `HttpClient`，自己处理：

- URL 拼接与 baseUrl 管理
- 请求头/Token 注入
- ResultVO 外壳解析
- 错误码与国际化文案
- 防重复提交、埋点、日志等横切逻辑

结果就是：这些逻辑在每个 Service 里都实现一遍，风格不统一，也难以集中治理。

通过让业务 Service 统一继承 `AbstractService`，可以：

- 将上面的横切逻辑集中在一个地方实现，Service 只关心“我要调哪个 Url、传什么参数”；
- 更方便统一接入平台层能力（签名、加解密、防重复提交、链路日志等）。

### 2) 为什么要有页面基类（`AbstractAppPage`）

在示例应用 `cross-platform-app` 中，所有页面都继承自 `AbstractAppPage`，它负责：

- 封装常见的页面行为（加载状态、返回导航、订阅事件等）；
- 提供统一的事件分发机制：页面模板只绑定 `onClick/onChange/onSubmit`，具体逻辑由 `data-id` 映射到 handler；
- 统一封装 SnackBar/对话框等消息提示的调用方式。

这样一来：

- 页面不再到处写 `MatSnackBar.open` 或 `dialog.open`，而是调用统一的 `info/error/warn/success` 等方法；
- 页面只关注“事件键 → 业务逻辑”的映射，DOM 结构的变动不会影响事件绑定逻辑。

### 3) 事件总线与应用事件（`EventManager` + `AppEvent`）

框架提供的 `EventManager` + `EventNameEnum` 组合，目的是：

- 把跨组件/跨模块的通信，从“随处 emit/subscribe 任意字符串事件”变成“基于类型安全的枚举事件”；
- 统一管理订阅生命周期，避免遗忘 unsubscribe 带来的内存泄漏。

应用通常会基于它定义自己的 `AppEvent`，比如：

- `SHOW_GLOBAL_LOADING` / `HIDE_GLOBAL_LOADING`
- `SHOW_SNACKBAR` / 业务级别的广播事件

服务层（如 `AbstractAppService`）发布事件，布局组件或根组件订阅事件，即可实现全局 Loading 遮罩与统一消息区。

### 4) 与后端的同构思维

在类型与协议层面，本框架鼓励前端与 Java 等后端语言保持同构：

- 使用 `ResultVO<T>` 与 `Page<T>` 这类类型封装统一的接口返回协议；
- 服务层采用类似后端的“应用服务/领域服务”分层思想，方便前后端对齐；
- 锁、事件总线、存储等工具也尽可能沿用后端的实践经验。

这样可以显著降低前后端沟通成本，让前端代码更容易被后端同事理解与维护。

## 典型接入方式（示意）

以下是一个简化示意，展示如何在业务工程里使用框架能力，具体写法请参考 `cross-platform-app`：

```ts
// users.service.ts
import { Injectable } from '@angular/core';
import { AbstractService, Url } from '@richie696/angular-framework';
import { AppUrl } from '../core/constants/app.url';
import { User } from './types/users.types';

@Injectable({ providedIn: 'root' })
export class UserService extends AbstractService {
  async listUsers() {
    return await this.request<User[]>(AppUrl.Users.List as Url);
  }
}
```

```ts
// users.page.ts
import { Component } from '@angular/core';
import { AbstractAppPage } from '@richie696/angular-framework';
import { UserService } from './services/user.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.html',
  styleUrls: ['./users.scss'],
})
export class UsersPage extends AbstractAppPage {
  constructor(private readonly userService: UserService) {
    super();
  }

  async ngOnInit() {
    this.registerHandler('users.queryBtn', async () => {
      const result = await this.userService.listUsers();
      // TODO: 处理结果
    });
  }
}
```

## 构建与发布

在 Angular 工作区根目录下：

```bash
pnpm install
pnpm run build framework
```

构建完成后，产物位于 `dist/framework`（或实际配置的输出目录）：

```bash
cd dist/framework
npm publish
```

> 如果你使用的是私有仓库（如 Nexus），请根据公司发布流程调整 `publish` 命令。***
