# @richie696/angular-framework（Core）

[![npm version](https://img.shields.io/npm/v/@richie696%2Fangular-framework?logo=npm&label=npm)](https://www.npmjs.com/package/@richie696/angular-framework)
[![npm downloads](https://img.shields.io/npm/dm/@richie696%2Fangular-framework?logo=npm&label=downloads)](https://www.npmjs.com/package/@richie696/angular-framework)
[![GitHub stars](https://img.shields.io/github/stars/richie696/richie696-angular-library?logo=github&label=stars)](https://github.com/richie696/richie696-angular-library)
[![GitHub issues](https://img.shields.io/github/issues/richie696/richie696-angular-library?logo=github&label=issues)](https://github.com/richie696/richie696-angular-library/issues)
[![MIT License](https://img.shields.io/github/license/richie696/richie696-angular-library?logo=opensourceinitiative&label=license)](../../LICENSE)

[📚 Monorepo 文档](../../README.md) · [📦 包结构](../../README.md#包结构) · [💻 GitHub](https://github.com/richie696/richie696-angular-library) · [🐛 Issues](https://github.com/richie696/richie696-angular-library/issues) · [🤝 贡献](../../CONTRIBUTING.md) · [🛡️ 安全](../../SECURITY.md) · [📄 License](../../LICENSE)

<!-- toc -->

- [1. 安装](#1-%E5%AE%89%E8%A3%85)
- [2. 能力总览](#2-%E8%83%BD%E5%8A%9B%E6%80%BB%E8%A7%88)
- [3. 组件抽象能力](#3-%E7%BB%84%E4%BB%B6%E6%8A%BD%E8%B1%A1%E8%83%BD%E5%8A%9B)
  * [3.1 `AbstractPrompt`](#31-abstractprompt)
  * [3.2 `AbstractComponent`](#32-abstractcomponent)
- [4. 请求能力（`AbstractService`）](#4-%E8%AF%B7%E6%B1%82%E8%83%BD%E5%8A%9Babstractservice)
  * [4.1 能力说明](#41-%E8%83%BD%E5%8A%9B%E8%AF%B4%E6%98%8E)
  * [4.2 典型场景](#42-%E5%85%B8%E5%9E%8B%E5%9C%BA%E6%99%AF)
  * [4.3 示例](#43-%E7%A4%BA%E4%BE%8B)
- [5. URL 与协议能力](#5-url-%E4%B8%8E%E5%8D%8F%E8%AE%AE%E8%83%BD%E5%8A%9B)
  * [5.1 `Method`](#51-method)
  * [5.2 `Url`](#52-url)
- [6. 存储与设备能力](#6-%E5%AD%98%E5%82%A8%E4%B8%8E%E8%AE%BE%E5%A4%87%E8%83%BD%E5%8A%9B)
  * [6.1 `LocalStorage`](#61-localstorage)
  * [6.2 `device-id` / `device-fingerprint`](#62-device-id--device-fingerprint)
- [7. 并发同步工具（`lib/lock`）](#7-%E5%B9%B6%E5%8F%91%E5%90%8C%E6%AD%A5%E5%B7%A5%E5%85%B7liblock)
  * [7.1 各工具适用场景（按业务问题看）](#71-%E5%90%84%E5%B7%A5%E5%85%B7%E9%80%82%E7%94%A8%E5%9C%BA%E6%99%AF%E6%8C%89%E4%B8%9A%E5%8A%A1%E9%97%AE%E9%A2%98%E7%9C%8B)
    + [`ReentrantLock`（可重入锁）](#reentrantlock%E5%8F%AF%E9%87%8D%E5%85%A5%E9%94%81)
    + [`ReadWriteLock`（读写锁）](#readwritelock%E8%AF%BB%E5%86%99%E9%94%81)
    + [`StampedLock`（乐观读）](#stampedlock%E4%B9%90%E8%A7%82%E8%AF%BB)
    + [`Condition`（条件变量）](#condition%E6%9D%A1%E4%BB%B6%E5%8F%98%E9%87%8F)
    + [`CountDownLatch`](#countdownlatch)
    + [`CyclicBarrier`](#cyclicbarrier)
    + [`synchronized` / `synchronizedFunc`](#synchronized--synchronizedfunc)
  * [7.2 选择建议（快速决策）](#72-%E9%80%89%E6%8B%A9%E5%BB%BA%E8%AE%AE%E5%BF%AB%E9%80%9F%E5%86%B3%E7%AD%96)
  * [7.3 错误示例 vs 推荐示例（并发控制）](#73-%E9%94%99%E8%AF%AF%E7%A4%BA%E4%BE%8B-vs-%E6%8E%A8%E8%8D%90%E7%A4%BA%E4%BE%8B%E5%B9%B6%E5%8F%91%E6%8E%A7%E5%88%B6)
- [8. 事件与拦截器能力](#8-%E4%BA%8B%E4%BB%B6%E4%B8%8E%E6%8B%A6%E6%88%AA%E5%99%A8%E8%83%BD%E5%8A%9B)
  * [8.1 事件能力](#81-%E4%BA%8B%E4%BB%B6%E8%83%BD%E5%8A%9B)
    + [新手最容易理解的业务场景](#%E6%96%B0%E6%89%8B%E6%9C%80%E5%AE%B9%E6%98%93%E7%90%86%E8%A7%A3%E7%9A%84%E4%B8%9A%E5%8A%A1%E5%9C%BA%E6%99%AF)
    + [为什么这不是“复杂化”，而是“降复杂度”](#%E4%B8%BA%E4%BB%80%E4%B9%88%E8%BF%99%E4%B8%8D%E6%98%AF%E5%A4%8D%E6%9D%82%E5%8C%96%E8%80%8C%E6%98%AF%E9%99%8D%E5%A4%8D%E6%9D%82%E5%BA%A6)
    + [什么时候该用事件，什么时候不该用](#%E4%BB%80%E4%B9%88%E6%97%B6%E5%80%99%E8%AF%A5%E7%94%A8%E4%BA%8B%E4%BB%B6%E4%BB%80%E4%B9%88%E6%97%B6%E5%80%99%E4%B8%8D%E8%AF%A5%E7%94%A8)
    + [错误示例 vs 推荐示例（事件通信）](#%E9%94%99%E8%AF%AF%E7%A4%BA%E4%BE%8B-vs-%E6%8E%A8%E8%8D%90%E7%A4%BA%E4%BE%8B%E4%BA%8B%E4%BB%B6%E9%80%9A%E4%BF%A1)
  * [8.2 拦截器能力](#82-%E6%8B%A6%E6%88%AA%E5%99%A8%E8%83%BD%E5%8A%9B)
- [9. 与 UI 适配包的关系](#9-%E4%B8%8E-ui-%E9%80%82%E9%85%8D%E5%8C%85%E7%9A%84%E5%85%B3%E7%B3%BB)
- [10. 版本与构建](#10-%E7%89%88%E6%9C%AC%E4%B8%8E%E6%9E%84%E5%BB%BA)
- [11. 适用建议](#11-%E9%80%82%E7%94%A8%E5%BB%BA%E8%AE%AE)

<!-- tocstop -->

------

`@richie696/angular-framework` 是 Atlas Richie Angular 体系的核心基础包，提供：

- 页面与提示抽象能力
- 统一请求与流式请求能力（含加密、防重复提交）
- URL 枚举与请求协议模型
- 本地存储与设备标识能力
- 并发同步工具（锁、条件变量、栅栏等）
- 事件与拦截器基础设施

当前发布版本为 `1.0.2`。本包只提供 Angular 无 UI 绑定的 Core 能力，Ionic、Angular Material 和 PrimeNG 实现位于独立适配包。

> 说明：UI 具体实现（Ionic / Material / PrimeNG）已拆分到独立适配包，core 仅保留抽象和通用能力。

---

## 1. 安装

```bash
pnpm add @richie696/angular-framework
```

---

## 2. 能力总览

| 能力模块 | 主要内容 | 适用场景 |
| --- | --- | --- |
| 组件抽象 | `AbstractComponent`、`AbstractPrompt` | 统一页面基类与提示接口 |
| 请求能力 | `AbstractService` | 统一 API 调用、加密、SSE、防重复提交 |
| URL 与协议 | `Url`、`Method`、`ApiResult` | 统一接口地址与请求方法约束 |
| 设备能力 | `device-id`、`device-fingerprint` | 设备识别、设备可信、风控增强 |
| 存储能力 | `LocalStorage` | Web/Capacitor 场景统一存储访问 |
| 并发工具 | `ReentrantLock`、`ReadWriteLock`、`Condition` 等 | 前端复杂并发控制 |
| 事件能力 | `event.name`、`event.manager` | 轻量事件发布订阅 |

---

## 3. 组件抽象能力

### 3.1 `AbstractPrompt`

**作用**
- 定义统一提示接口：`info/error/warn/success/confirm`
- 让业务代码与具体 UI 库解耦

**和第 9 节的关系（重要）**
- `AbstractPrompt` 是 core 层的“提示能力契约”，第 9 节的 3 个 UI 适配包是这个契约的默认实现。
- 先做选择，再决定是否自己实现接口：
  1. **如果项目使用内置支持的 UI 框架**（Ionic / Material / PrimeNG）  
     直接使用对应适配包，继承 `AbstractXxxComponent`，通常不需要手写 `AbstractPrompt` 实现。
  2. **如果项目不使用这 3 种内置 UI 框架**  
     才需要自己实现 `AbstractPrompt` 的 5 个抽象方法。

**典型场景**
- 你希望业务组件不直接依赖 `MatSnackBar` / `ToastController` / `MessageService`
- 你希望未来替换 UI 库时，只替换适配层，不改业务页面逻辑

**推荐做法**
- 先阅读第 9 节确定是否使用内置适配包。
- 若使用内置适配包：页面继承 `AbstractIonicComponent` / `AbstractMaterialComponent` / `AbstractPrimeNGComponent`。
- 若不使用：在项目内实现一个自己的 `AbstractPrompt` 适配基类。

**示例**

```ts
import { AbstractPrompt, MessageOptions } from '@richie696/angular-framework';

class DemoPrompt implements AbstractPrompt {
  async info(message: string, options?: MessageOptions): Promise<void> {}
  async error(message: string, options?: MessageOptions): Promise<void> {}
  async warn(message: string, options?: MessageOptions): Promise<void> {}
  async success(message: string, options?: MessageOptions): Promise<void> {}
  async confirm(): Promise<void> {}
}
```

### 3.2 `AbstractComponent`

**作用**
- 封装路由与参数读取能力
- 约束页面类必须实现提示能力（通过 `AbstractPrompt`）

**典型场景**
- 所有页面统一继承一个基类，避免路由/提示能力重复代码

**示例**

```ts
import { Component } from '@angular/core';
import { AbstractComponent, MessageOptions } from '@richie696/angular-framework';

@Component({
  selector: 'app-user-page',
  template: `...`
})
export class UserPage extends AbstractComponent {
  async info(message: string, options?: MessageOptions): Promise<void> {}
  async error(message: string, options?: MessageOptions): Promise<void> {}
  async warn(message: string, options?: MessageOptions): Promise<void> {}
  async success(message: string, options?: MessageOptions): Promise<void> {}
  async confirm(): Promise<void> {}

  async loadUser(): Promise<void> {
    const id = this.getParam('id');
    // ...
  }
}
```

---

## 4. 请求能力（`AbstractService`）

### 4.1 能力说明

`AbstractService` 是核心请求编排类，内置：

- 普通 HTTP 请求（`request`）
- SSE 流式请求（`requestStream`）
- ECC 加密交换与加解密链路
- 防重复提交策略
- 超时控制、401 处理、响应头自动缓存等

### 4.2 典型场景

- 项目需要统一的网关调用行为
- 需要对某些接口开启加密、接口防重、流式处理
- 需要多团队共享一致请求规范

### 4.3 示例

```ts
import { Injectable } from '@angular/core';
import { AbstractService, ApiResult, Url } from '@richie696/angular-framework';

@Injectable({ providedIn: 'root' })
export class UserService extends AbstractService {
  async queryProfile(): Promise<ApiResult<any>> {
    return await this.request<any>(Url.urlOf('/api/user/profile'));
  }
}
```

SSE 示例：

```ts
service.requestStream<any>(appUrl, { question: '你好' }).subscribe({
  next: (evt) => console.log(evt),
  error: (e) => console.error(e),
  complete: () => console.log('stream done')
});
```

---

## 5. URL 与协议能力

### 5.1 `Method`

**作用**
- 统一请求方法类型：`GET/POST/PUT/DELETE/PATCH/NAVIGATOR/LOCATION`

**典型场景**
- 接口与页面路由都用统一模型表达

### 5.2 `Url`

**作用**
- 枚举化管理接口地址/页面地址
- 支持动态前缀、路径占位符替换、加密与防重标记

**典型场景**
- 防止字符串硬编码 URL 分散在业务代码中

---

## 6. 存储与设备能力

### 6.1 `LocalStorage`

**作用**
- 封装浏览器 `localStorage` 与 Capacitor `Preferences`
- 统一 `set/get/remove/clear` 行为

**典型场景**
- H5 + Hybrid 混合项目共享一套存储调用接口

### 6.2 `device-id` / `device-fingerprint`

**作用**
- `AbstractService` 可按配置注入稳定设备 ID，或注入调用方提供的设备指纹 Header Provider
- 请求链路支持设备标识的可选透传；默认关闭

设备标识与指纹相关实现不是独立公开入口，业务应通过 `AbstractService` 的 `HttpClientConfig` 配置使用。设备指纹属于浏览器信号组合，不等同于不可变的真实硬件身份。

**典型场景**
- 风控、可信设备、异地登录校验、安全审计

**配置示例**

```ts
import { AbstractService } from '@richie696/angular-framework';

export class UserService extends AbstractService {
  constructor() {
    super({
      sendHardwareFingerprint: true,
      allowUnsignedHardwareFingerprint: false,
      hardwareFingerprintHmacSecret: 'server-agreed-secret'
    });
  }
}
```

请勿将浏览器端 HMAC 密钥当作真正秘密；安全协议、密钥管理和重放策略必须由服务端共同定义。

---

## 7. 并发同步工具（`lib/lock`）

很多前端同学会觉得“锁是后端概念”，但在现代前端里同样常见并发竞争：

- 同一个按钮被连续点击，触发多次并发提交
- 同一份页面状态被多个异步任务同时读写（请求回包顺序不一致）
- 多个模块并发初始化，谁先完成并不确定
- 轮询、WebSocket、用户操作三路同时更新同一份数据

`lib/lock` 的价值就是把这类“时序竞争”显式控制住，避免偶现 bug。

核心工具包括：

- `ReentrantLock`：可重入锁
- `ReadWriteLock`：读写锁
- `StampedLock`：乐观读 + 悲观写
- `Condition`：条件变量
- `CountDownLatch`：倒计时门闩
- `CyclicBarrier`：循环栅栏
- `synchronized` / `synchronizedFunc`：串行化装饰器与函数

### 7.1 各工具适用场景（按业务问题看）

#### `ReentrantLock`（可重入锁）

**最适合解决**
- “同一业务流程内可能重复进入临界区”的场景

**具体场景**
- 订单提交流程里，`submit()` 内部又调用了会再次触发锁保护的 `validateAndSubmit()`
- 页面保存草稿时，自动保存和手动保存复用同一段写逻辑
- 一个复杂方法分层调用，内部子方法也需要同一把锁保护

#### `ReadWriteLock`（读写锁）

**最适合解决**
- 读多写少的共享状态访问

**具体场景**
- 页面级配置缓存：大量读取（渲染、校验、筛选）+ 少量写入（配置刷新）
- 字典数据中心：多个组件频繁读取字典，偶尔后台刷新重载
- 本地内存状态树：查询操作多，更新操作少

#### `StampedLock`（乐观读）

**最适合解决**
- “绝大多数时候没有写冲突，希望读性能更高”

**具体场景**
- 仪表盘数值展示：频繁读取统计值，偶尔有后台推送更新
- 实时行情/看板：先乐观读取，校验失败再回退到悲观读
- 低冲突缓存命中路径优化

#### `Condition`（条件变量）

**最适合解决**
- “不是简单加锁，而是要等某个条件满足再继续”

**具体场景**
- 多步提交流程：需要等待“校验完成”事件再进入下一步
- 下载/上传管线：消费者等待生产者准备好数据
- 写锁区内等待某个状态切换（例如“已初始化”）

#### `CountDownLatch`

**最适合解决**
- “等待 N 个并发任务全部完成，再继续主流程”

**具体场景**
- 页面首屏并发拉取 3~5 个接口，全部完成后再关闭骨架屏
- 批量上传多个文件，全部完成后统一提示
- 多模块初始化完成后再执行路由放行

#### `CyclicBarrier`

**最适合解决**
- “多参与者阶段性汇合，并且这个汇合会重复发生”

**具体场景**
- 分批处理流程：每一轮要等多个子任务都到齐后进入下一轮
- 多 worker 协同：每个阶段先汇合再推进
- 需要 `reset` 后复用同一屏障的场景

#### `synchronized` / `synchronizedFunc`

**最适合解决**
- “对某个 key 的异步操作必须严格串行”

**具体场景**
- 防止同一用户重复点击“支付/提交”导致并发请求
- 同一资源 ID 的更新请求按顺序执行（避免后写先到）
- 对同一个 local cache key 的读改写保持串行

### 7.2 选择建议（快速决策）

- 只想防止重复点击并串行执行：优先 `synchronizedFunc`
- 有明确临界区且可能重入：用 `ReentrantLock`
- 读多写少：用 `ReadWriteLock`
- 读冲突极低且追求读性能：用 `StampedLock`
- 等待一批任务全部完成：用 `CountDownLatch`
- 多方阶段性汇合且可循环：用 `CyclicBarrier`
- 需要“等条件成立再继续”：配合 `Condition`

**示例**

```ts
import { ReentrantLock } from '@richie696/angular-framework';

const lock = new ReentrantLock();

async function task() {
  await lock.lock();
  try {
    // critical section
  } finally {
    lock.unlock();
  }
}
```

### 7.3 错误示例 vs 推荐示例（并发控制）

**场景：用户连续点击“提交”按钮**

错误示例（并发提交，可能重复下单）：

```ts
let saving = false;

async function submitOrder() {
  if (saving) return;
  saving = true;
  await api.submit(); // 用户连续点击时，仍可能穿透
  saving = false;
}
```

推荐示例（按 key 串行化）：

```ts
import { synchronizedFunc } from '@richie696/angular-framework';

async function submitOrder() {
  await synchronizedFunc('submit-order', async () => {
    await api.submit();
  });
}
```

**场景：两个异步流程同时改同一份状态**

错误示例（先返回的旧数据覆盖后返回的新数据）：

```ts
let profile: any;

async function refreshA() {
  const data = await api.getProfile();
  profile = data;
}

async function refreshB() {
  const data = await api.getProfile();
  profile = data;
}
```

推荐示例（临界区加锁，保证写入顺序可控）：

```ts
import { ReentrantLock } from '@richie696/angular-framework';

const lock = new ReentrantLock();
let profile: any;

async function refresh() {
  const data = await api.getProfile();
  await lock.lock();
  try {
    profile = data;
  } finally {
    lock.unlock();
  }
}
```

---

## 8. 事件与拦截器能力

### 8.1 事件能力

- `event.name`：事件名称模型
- `event.manager`：事件发布与订阅管理

很多同学第一次看到“事件通信”会有一个很自然的问题：

> “我直接在 A 页面里 import B 的方法，或者直接调某个 API，不也能实现吗？”

这个问题非常好。  
短期看，直接调用当然能跑；但项目一大，就会出现三个明显问题：

1. **调用关系变成网状耦合**
   - A 调 B，B 调 C，C 又回调 A
   - 后续改一个模块，容易连锁影响很多页面
2. **时序难管理**
   - 谁先初始化、谁后刷新、谁负责通知，很快变混乱
   - “偶发不刷新/刷新两次”这种 bug 会越来越多
3. **复用成本高**
   - 你想复用 B 到另外页面时，发现 B 强依赖 A 的调用路径
   - 组件搬不动、逻辑拆不开

事件通信的核心价值就是：**把“谁触发了什么”与“谁要响应这个变化”解耦**。

- 触发方只负责发布事件（我发生了某件事）
- 响应方只负责订阅事件（我关心这件事）
- 两边彼此不需要直接引用对方类或方法

这对前端尤其重要，因为前端天然有很多“跨模块同步状态”的场景。

#### 新手最容易理解的业务场景

**场景 1：列表页 + 编辑弹窗**
- 传统写法：弹窗保存成功后直接调用列表页 `reload()`
- 问题：弹窗必须知道“列表页实例”在哪里，耦合非常重
- 事件写法：弹窗发布 `ItemUpdated`，列表页订阅后自行刷新

**场景 2：登录状态变化**
- 登录成功后，顶部用户信息、侧边菜单、首页推荐都要刷新
- 如果逐个调用，会出现“漏调某个模块”或顺序问题
- 事件写法：登录模块发布 `UserSessionChanged`，各模块独立订阅处理

**场景 3：多标签页/多组件联动**
- 一个区域改筛选条件，多个区域都要联动刷新
- 直接引用会导致组件之间互相知道彼此实现细节
- 事件写法：筛选模块发 `FilterChanged`，各区域按自己节奏处理

#### 为什么这不是“复杂化”，而是“降复杂度”

它不是为了引入底层概念，而是为了让代码结构更稳定：

- 新增一个响应方，不需要改发布方
- 删除一个响应方，不影响发布方
- 排查问题时可以按“事件链路”定位，而不是在组件间跳来跳去找调用栈

#### 什么时候该用事件，什么时候不该用

**建议使用**
- 一个动作会影响多个模块
- 发布方不应该知道具体谁来处理
- 需要跨页面/跨组件广播状态变化

**不建议使用**
- 父子组件的明确调用关系（优先 `@Input/@Output`）
- 单模块内部的直接函数调用
- 仅一次性的、强顺序流程调用

**典型场景**
- 模块间轻耦合通信（页面刷新通知、登录态变更广播、筛选条件联动、全局配置变更通知）

#### 错误示例 vs 推荐示例（事件通信）

**场景：弹窗保存后通知列表刷新**

错误示例（直接互调，强耦合）：

```ts
// EditDialog.ts
import { UserListPage } from './user-list.page';

async function onSave(listPage: UserListPage) {
  await api.saveUser();
  await listPage.reload(); // 弹窗必须知道列表页实例
}
```

推荐示例（事件发布订阅，低耦合）：

```ts
// EditDialog.ts
await api.saveUser();
eventManager.emit(EventNameEnum.UserUpdated, { id: userId });

// UserListPage.ts
eventManager.on(EventNameEnum.UserUpdated, async () => {
  await reload();
});
```

**场景：登录成功后多个模块同步刷新**

错误示例（逐个调用，容易漏）：

```ts
await auth.login(form);
await header.reloadUser();
await menu.reload();
await dashboard.reload();
```

推荐示例（一次广播，各模块自处理）：

```ts
await auth.login(form);
eventManager.emit(EventNameEnum.UserSessionChanged);

// Header / Menu / Dashboard 各自订阅并刷新
```

### 8.2 拦截器能力

- `provideMock()` + `MockInterceptor`（HttpClient）
- `installMockFetch()`（`AbstractService.request()` 使用的原生 fetch）

**典型场景**
- 联调前阶段的 mock 数据注入与统一拦截

**用法**

```ts
// app.config.ts
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { MockInterceptor, provideMock } from '@richie696/angular-framework';

export const appConfig = {
  providers: [
    ...provideMock({
      enable: environment.mock,
      apiPrefix: '/api',
      mockDataDir: '/assets/mock-data',
    }),
    ...(environment.mock
      ? [{ provide: HTTP_INTERCEPTORS, useClass: MockInterceptor, multi: true }]
      : []),
  ],
};
```

- `provideMock()` 在 `enable: true` 时自动为 fetch 安装与拦截器相同的 URL 映射（`/api/foo` → `/assets/mock-data/foo.json`）。
- HttpClient 请求仍需注册 `MockInterceptor`；两者共用 `resolveMockAssetUrl()` 规则。
- `MockInterceptor` 现已尊重 `enable` 开关；未启用时直接透传。

---

## 9. 与 UI 适配包的关系

Core 包负责“抽象与通用能力”，UI 具体实现在独立包：

- `@richie696/angular-framework-ionic`
- `@richie696/angular-framework-material`
- `@richie696/angular-framework-primeng`

当项目组选定 UI 库后：

1. 安装 core + 对应 UI 适配包 + UI 库本身
2. 页面基类继承对应 `AbstractXxxComponent`
3. 通过 `provideXxxPrompt(...)` 完成 UI 提示行为配置

---

## 10. 版本与构建

- 构建 core：

```bash
pnpm run build:framework
```

- 全量构建（含 3 个 UI 子包）：

```bash
pnpm run build-all
```

---

## 11. 适用建议

- 只做基础能力复用：仅用 core 包
- 需要开箱即用 UI 提示：用 core + 对应 UI 适配包
- 多端统一架构：以 `AbstractComponent` + `AbstractService` 为主线，业务层只关心领域逻辑
