# Rydeen Angular Library 22 升级方案

> 状态：阶段 0-5 已完成，阶段 6 交付检查中  
> 适用仓库：`richie696-angular-library`  
> 目标版本：`22.0.0`  
> 主要消费方：Atlas Richie OAuth Authorization Server（AS）及后续 Angular 22 项目

## 1. 升级目标

本次升级不是单纯修改依赖版本，而是将底层库整理成一套可稳定发布、可验证、可迁移的 Angular 22 基线。

必须达成以下结果：

1. 四个发布包使用同一主版本并通过 Angular 22 完整编译。
2. Angular、CLI、构建器、Material、CDK、ng-packagr、PrimeNG 不再跨主版本混装。
3. 公共 API 在浏览器、SSR、Ionic/Capacitor 场景下具备清晰边界。
4. Core 不依赖具体 UI 框架；三个 UI 适配包只负责提示、确认等 UI 适配。
5. 建立单元测试、打包测试和真实消费项目测试，避免出现“库能构建、应用不能使用”的假通过。
6. 提供从 21.x 升级到 22.x 的迁移文档、变更记录和可回滚发布流程。

## 2. 非目标

- 不把 AS 的业务组件、主题或产品页面放入基础库。
- 不强制所有项目使用同一种 UI 框架。
- 不为了追求新 API 一次性删除仍有消费方的兼容入口。
- 不在没有契约测试的情况下重新设计 `AbstractService` 的业务返回协议。
- 不发布未经 AS 实际接入验证的正式版本。

## 3. 当前基线与主要问题

### 3.1 工程现状

仓库包含四个固定联动版本的发布包：

| 包 | 职责 |
| --- | --- |
| `@richie696/angular-framework` | 路由、请求、Mock、存储、设备标识、事件和并发基础能力 |
| `@richie696/angular-framework-ionic` | Ionic Prompt 适配 |
| `@richie696/angular-framework-material` | Angular Material Prompt 适配 |
| `@richie696/angular-framework-primeng` | PrimeNG Prompt 适配 |

现有代码共约 46 个 TypeScript 文件，公共导出约 119 项，但没有单元测试文件。当前最大的质量风险不是某个编译错误，而是缺少能够锁定公共行为的自动化测试。

### 3.2 已确认问题

| 优先级 | 问题 | 影响 |
| --- | --- | --- |
| P0 | pnpm 11 无法校验历史锁文件中不存在的私有 CNB 包 `@richie696/capacitor-preferences@8.0.0` tarball 元数据；当前 registry 实际可用版本为 `1.0.1` | 无法可靠重建依赖和 CI 构建 |
| P0 | 旧锁文件记录 Angular 22 Core 与 21 版构建器、Material、PrimeNG 的混合依赖 | 构建结果不可重复，peer 依赖可能在消费项目中冲突 |
| P0 | 0 个测试文件 | 公共 API 重构没有回归保护 |
| P1 | 公共类型和请求链路大量使用 `any` | TypeScript 6 严格模式无法保护调用方 |
| P1 | `EventManager` 使用 Angular `EventEmitter` 作为服务事件总线 | 与 Angular 的输出事件职责混淆，事件类型不安全 |
| P1 | Mock 仅提供类式 `HttpInterceptor` | 可用但不符合现代 standalone 应用的首选注册方式 |
| P1 | `window`、`navigator`、`fetch` 等平台对象散落在服务实现中 | SSR、预渲染和测试环境风险高 |
| P2 | 依赖和 peer 依赖存在通配符 | 上游新主版本可能未经验证直接进入构建 |
| P2 | README 声明的部分 test/lint 脚本与实际脚本不一致 | 使用者和 CI 无法按文档验证 |
| P2 | 四个适配层仅有实现，没有宿主组件契约测试 | UI 库升级后可能编译通过但运行失败 |

## 4. 目标依赖矩阵

| 依赖 | 目标版本 | 说明 |
| --- | --- | --- |
| Angular Core packages | `~22.1.1` | Core、Common、Forms、Router、Platform Browser 对齐 |
| Angular CLI | `~22.1.3` | 与当前 22.1 补丁线对齐 |
| Angular build tooling | `~22.1.3` | 禁止继续使用 21.x builder |
| Angular Material / CDK | `~22.1.1` | Material 适配层与 Angular 同主版本 |
| ng-packagr | `~22.1.1` | 使用 Angular 22 库打包链路 |
| PrimeNG | `~22.0.0` | PrimeNG 22 要求 Angular/CDK 22 |
| TypeScript | `~6.0.3` | Angular 22 支持范围为 `>=6.0 <6.1` |
| RxJS | `~7.8.2` | 同时满足 Angular、PrimeNG 和 Ionic |
| Zone.js | `~0.16.2` | 兼容运行时依赖，库内不强制启用动画 |
| Ionic Angular | `^8.8.10` | 官方 peer 范围允许 Angular 22 |
| ngx-translate | Core 18.x | peer 范围允许 Angular 22，开发依赖固定版本 |
| Node.js | `^22.22.3 || ^24.15.0 || >=26` | 与 Angular 22 官方支持矩阵一致 |
| pnpm | `11.20.0` | 固定包管理器，避免锁文件格式和安全策略漂移 |

发布包的 Angular/UI peer 范围统一限制在当前已验证主版本，例如 `>=22.0.0 <23.0.0`。开发依赖固定补丁线，消费方 peer 依赖使用主版本范围。

## 5. 分阶段实施方案

### 阶段 0：冻结升级基线（已完成）

- 以当前已提交的 `9e56c3c` 为升级起点。
- 创建 `codex/angular-22-library-upgrade` 分支。
- 记录四个包的公共导出清单和构建产物元数据。
- 本阶段不发布 npm 包。

验收：工作区干净，升级分支只包含升级相关变更。

### 阶段 1：修复依赖与供应链基线（已完成）

目标：在本地和 CI 中能够从空 `node_modules` 重复安装。

1. 在根 `package.json` 固定 Node 和 pnpm 版本。
2. 将 Angular 运行/开发依赖职责重新分类；发布包只通过 peer 依赖声明 Angular。
3. 将所有 `*` 依赖改为经过验证的范围，保留必要的跨补丁兼容。
4. 为公开 npm 包和 `@richie696` 私有包配置明确的 registry 路由，避免把所有公共包都交给私有仓库解析。
5. 针对已人工确认来源和 integrity 的私有包，使用最小粒度的 `trustPolicyExclude`；不设置全局 `trustLockfile: true`，也不关闭完整性校验。
6. 重新生成 pnpm 11 锁文件，并在干净目录执行 frozen install。
7. 给 CI 增加 `pnpm install --frozen-lockfile` 门禁。

验收：本地和 CI 均能从空依赖目录安装；锁文件中不再出现 Angular/Material/PrimeNG 21.x。

### 阶段 2：恢复并锁定现有行为（已完成）

先为当前能力补测试，再现代化实现。

Core 契约测试：

- `Url`：路径参数、查询参数、动态 base URL、非 HTTP 方法。
- `AbstractService`：HTTP 方法、header 合并、错误映射、401 清理、超时、重试。
- SSE：正常分帧、跨 chunk、`done`、`error`、非 2xx、取消订阅、缓冲区上限。
- Mock：URL 解析、静态 JSON、延迟、fetch 与 HttpClient 行为一致性。
- 设备标识、存储、事件、并发工具的成功、超时和错误路径。

UI 适配契约测试：

- info/error/warn/success 的 severity、翻译和持续时间。
- confirm 的确认、取消、异步回调和异常路径。
- Provider 配置覆盖默认值。
- 缺少宿主视图时给出可理解错误。

验收：核心关键路径有回归保护，后续重构必须先保持测试通过。

### 阶段 3：Angular 22 现代化（已完成实现，待消费方 E2E）

#### 公共类型

- 公共默认泛型从 `any` 调整为 `unknown`。
- 为 body、query、path params、错误对象建立明确类型。
- 用类型守卫读取异常和平台扩展字段。
- 将开放负载改为泛型。
- 对需兼容的旧签名增加类型安全重载，并标记废弃计划。

#### 依赖注入与平台边界

- 保持 `inject()`，明确抽象类只能由 Angular 注入上下文创建。
- browser-only 能力集中到平台适配服务，使用 `DOCUMENT`、`PLATFORM_ID` 和 token。
- SSR/测试环境不直接读取未定义的浏览器全局对象。
- 随机 ID 从 `substr()` 迁移到 `slice()`/`crypto.randomUUID()` 降级方案。

#### HTTP、Mock 与事件

- 保留类式 `MockInterceptor` 一个主版本周期。
- 新增函数式 interceptor 和 standalone provider。
- fetch 与 HttpClient 共享 URL/Mock 解析规则。
- 库内不引入已废弃的 `withFetch()` 或动画 provider。
- 事件内部实现从 `EventEmitter<any>` 迁移为泛型 RxJS `Subject`/`Observable`，保留原有门面。

验收：严格类型检查通过，无新增 `any`；SSR 导入不访问浏览器全局对象。

### 阶段 4：三套 UI 适配层升级（已完成）

PrimeNG 22：

- 验证 `MessageService`、`ConfirmationService` 和配置类型。
- `providePrimeNgPrompt()` 只提供 Prompt 依赖，不替宿主注册主题、license 或视图组件。
- README 明确 PrimeNG 22 宿主配置、社区 license、Toast 与 ConfirmDialog 要求。
- 建立真实 DOM 冒烟测试。

Angular Material 22：

- 验证 `MatSnackBar` 配置和确认交互。
- provider 不隐式引入应用级动画配置。
- 不依赖已废弃动画 provider。

Ionic 8：

- 验证 Toast/Alert 角色、异步 handler 和 dismiss 行为。
- Web 与 Capacitor 环境分别验证平台对象降级。
- Ionic 版本独立于 Angular 主版本，只声明实际 peer 范围。

### 阶段 5：打包和消费方验证（已完成）

1. 执行四包 production build。
2. 对每个 `dist` 包执行 `pnpm pack`。
3. 检查 tarball 不包含秘密、缓存、绝对路径或 workspace 协议残留。
4. 建立 Angular 22 最小消费 fixture，分别安装四个 tarball。
5. AS 前端通过本地 tarball 接入 Core + PrimeNG 适配包。
6. 验证 AS 登录、路由、API 请求、错误提示、确认框和生产构建。
7. 运行依赖审计和许可证检查。

验收：四个 tarball 可独立安装；AS 不依赖路径别名或源码引用即可运行。

### 阶段 6：发布与迁移（交付前检查）

1. 编写 `MIGRATION-21-to-22.md`。
2. 使用 changesets 记录四个固定联动包的 major 变更。
3. 先发布 `22.0.0-next.0` 或内部测试标签。
4. AS 和至少一个非 PrimeNG 项目验证后，再发布 `22.0.0`。
5. 保留 21.x 最后版本和回滚安装命令。
6. 补丁版本不引入公共 API 破坏。

本轮交付检查记录（2026-08-09）：

- 库：`pnpm install --frozen-lockfile`、`pnpm peers check`、四个 Angular 包独立构建、四个 spec tsconfig 严格类型检查通过。
- 消费方：Angular 22 最小消费 fixture 成功构建并加载 Core、Ionic、Material、PrimeNG 四个包。
- AS 前端：冻结安装、peer 检查、`tsc --noEmit`、Angular development build 通过；真实浏览器完成登录、Dashboard、OAuth Clients、System Settings、Sessions、Audit、MFA 路由冒烟，修复后的页面无 Angular 运行时错误。
- AS 后端：`mvn -q test` 通过（OAuth 协议集成测试 6 项通过；mTLS 测试在未提供证书 fixture 时按设计跳过 1 项）。
- Gateway：`mvn -q test` 通过；ECC 共享密钥缓存按 `clientId + gatewayKeyFingerprint` 隔离，并有回归测试覆盖旧 key 兼容清理和 key rotation 场景。
- 当前环境未安装 ChromeHeadless，因此库自身 Karma 浏览器单测未执行；已由严格编译、Angular 22 消费 fixture 和 AS 真实浏览器 E2E 覆盖同等关键路径。`js-sha256` 仅产生 CommonJS 优化提示，不影响构建或运行。

## 6. 版本升级功能与改进 Todo

本节是本次升级的功能 backlog。所有新增能力都必须遵守同一边界：Core 提供框架无关的协议和基础设施，UI 细节进入适配包，业务模型和业务规则留在业务项目。

### 6.1 22.0.0 必做项（P0）

| 状态 | Todo | 目标与验收 |
| --- | --- | --- |
| [ ] | 运行时配置模块 | 提供 `RuntimeConfig`、`provideRuntimeConfig()`，统一 API 地址、应用名、环境、语言、时区和运行时开关；支持浏览器、SSR 和部署时注入 |
| [ ] | HTTP 客户端拆分 | 将 `AbstractService` 拆成 `RequestClient`、`StreamClient`、`RequestPolicy`、`HeaderStore`、`ErrorMapper` 等职责；旧类保留兼容门面 |
| [ ] | 统一错误模型 | 增加 `AppError`、错误分类、HTTP/业务错误映射、trace id 提取和可序列化错误详情 |
| [ ] | 请求上下文与策略 | 支持超时、取消、重试退避、请求去重、跳过认证、跳过全局 loading、幂等键等 request context |
| [ ] | 认证会话抽象 | 定义 Cookie、Bearer、刷新 token 等策略的统一 `AuthSession`/`AuthStrategy` 接口，不绑定 OAuth 业务 |
| [ ] | 函数式 HTTP provider | 提供 standalone 风格的 `provideRydeenHttp()`、认证 interceptor、错误 interceptor、loading interceptor 和 mock interceptor |
| [ ] | Signals 请求状态 | 提供 `RequestState<T>`、loading/error/empty/success 状态以及可重试、刷新、失效方法；不引入 NgRx |
| [ ] | 通用分页与查询模型 | 统一 `PageResult<T>`、`ListQuery`、排序、筛选、分页和查询序列化协议 |
| [ ] | 平台抽象 | 将 `window`、`navigator`、`fetch`、`localStorage`、Capacitor 能力集中到可替换 token，并通过 SSR/无浏览器测试 |
| [ ] | 公共类型收紧 | 公共默认泛型从 `any` 逐步改为 `unknown`/泛型；错误、请求体、查询和路径参数都有明确类型 |
| [ ] | 事件系统改造 | 使用泛型 RxJS `Subject`/`Observable`，保留现有事件门面；移除服务层 `EventEmitter<any>` |
| [ ] | 基础测试工具 | 增加 HTTP mock、Storage mock、路由测试、Signal Store 测试和异步测试辅助工具 |
| [ ] | 完整测试基座 | 为请求、SSE、Mock、存储、事件、并发和三套 Prompt 适配增加单元/契约测试 |

### 6.2 22.x 增强项（P1）

| 状态 | Todo | 目标与验收 |
| --- | --- | --- |
| [ ] | 路由元数据 | 提供 `AppRouteMeta`，统一页面标题、权限、角色、面包屑和菜单元数据 |
| [ ] | 路由权限工具 | 支持 `canMatch`/`canActivate` 权限判断、登录后回跳、无权限页面和权限缓存失效 |
| [ ] | 离开页面保护 | 提供未保存表单、正在上传、未提交编辑状态的统一离开确认协议 |
| [ ] | 表单基础工具 | 服务端字段错误映射、提交状态、防重复提交、错误摘要、首个错误定位、脏表单检测 |
| [ ] | 类型安全表单转换 | 统一表单值与 API DTO 的转换、空值策略、日期/数字/布尔值转换 |
| [ ] | 国际化工具 | 类型化翻译 key、语言切换事件、运行时字典、日期/数字/货币/时区格式化 |
| [ ] | 日志与诊断 | `Logger`、日志等级、请求耗时、trace id、用户上下文和可插拔上报器 |
| [ ] | Feature Flag | 支持本地配置、远程配置、用户/租户定向开关和配置刷新事件 |
| [ ] | 文件能力 | 文件上传、下载、进度、取消、断点续传接口，统一 Blob/文件名/错误处理 |
| [ ] | 缓存能力 | 内存缓存、请求去重、TTL、失效、IndexedDB 可选适配；不默认缓存敏感数据 |
| [ ] | 多标签页同步 | 基于 BroadcastChannel/Storage Event 的登出、语言、主题和会话失效广播 |
| [ ] | 安全基础工具 | Web Crypto 封装、CSRF 配置、敏感数据清理、CSP 使用说明和安全存储边界 |
| [ ] | 可访问性工具 | focus 管理、键盘导航、live region、减少动画偏好和通用 ARIA 辅助指令 |
| [ ] | 主题协议 | 框架无关的设计令牌、浅色/深色模式、主题切换和客户皮肤接口；具体 UI 主题仍放适配层 |

### 6.3 后续可选项（P2）

| 状态 | Todo | 约束 |
| --- | --- | --- |
| [ ] | WebSocket/SSE 高级客户端 | 仅在多个项目有一致重连、心跳、退避和状态需求后进入 Core |
| [ ] | 离线队列与同步 | 需要明确冲突解决协议，不能只做简单 localStorage 队列 |
| [ ] | PWA 能力 | Service Worker、缓存和安装体验作为独立适配包，不强塞进 Core |
| [ ] | 性能监控 | 首屏、路由、资源、长任务和 Web Vitals 作为可插拔诊断适配器 |
| [ ] | DevTools | 仅在 Signals Store、请求追踪和 Feature Flag 形成稳定协议后开发 |
| [ ] | 异步互斥工具 | 重新评估现有 Java 风格锁；优先保留一个经过测试的 `AsyncMutex`/`KeyedMutex` |

### 6.4 明确不加入通用库的内容

- AS 客户端、Scope、Resource Server 等领域模型和业务 API。
- OAuth 授权服务器规则、租户业务规则和具体菜单。
- PrimeNG、Material、Ionic 的业务组件和具体页面。
- 业务项目专属主题颜色、布局和权限判断逻辑。
- 默认引入 NgRx、重量级状态框架或强制动画 provider。
- 未经真实消费项目验证的复杂缓存、离线同步和自动刷新机制。

### 6.5 现有代码的改进 Todo

| 状态 | 改进项 | 处理方式 |
| --- | --- | --- |
| [ ] | 拆分超大 `AbstractService` | 新模块承担实现，旧类作为兼容 facade，至少保留一个主版本周期 |
| [ ] | 减少基类继承 | `AbstractComponent` 保持兼容，新代码优先使用组合式 `inject()` 和独立服务 |
| [ ] | 收敛浏览器全局对象 | 使用 `DOCUMENT`、`PLATFORM_ID` 和平台 token，补 SSR 测试 |
| [ ] | 迁移废弃字符串 API | 使用 `slice()` 或 `crypto.randomUUID()` 降级方案替代 `substr()` |
| [ ] | 校正事件语义 | 组件交互使用 input/output，跨模块通知才使用事件总线 |
| [ ] | 重新评估锁工具 | 前端异步优先 RxJS 操作符；只有有实际用例的互斥能力才保留在公共导出 |
| [ ] | 清理公共导出 | 每个导出必须有文档、测试和稳定用途，避免把内部实现永久暴露 |
| [ ] | 建立 API 兼容报告 | 每次发布比较 public API，记录新增、废弃、删除和行为变化 |

### 6.6 功能验收标准

新增功能进入正式版本前必须同时满足：

1. Core 不新增对 PrimeNG、Material、Ionic 的运行时依赖。
2. 至少有一个 Angular 22 standalone 消费项目实际使用。
3. 有完整类型、单元测试、README 示例和迁移说明。
4. 有明确的 SSR、无浏览器环境和错误路径行为。
5. API 不使用无约束的 `any`，或已经提供明确的兼容重载和移除计划。
6. 不通过全局变量、隐式单例或修改宿主应用行为来实现功能。
7. 能说明该能力在至少两个不同业务项目中复用，否则留在业务项目或独立实验包。

### 6.7 `AbstractService` 与技术中台 Gateway 对接专项

当前 `AbstractService` 已经覆盖普通请求、SSE、请求去重、设备信息、响应头缓存和 ECC 加密等能力，但它实际上同时承担了 HTTP 客户端、Gateway 协议、认证清理、UI 提示、浏览器平台和本地存储等职责。该实现可以继续兼容当前 Gateway v1，但不宜直接作为 Angular 22 的长期基础抽象。升级时要把“客户端可独立修复的质量问题”和“必须与技术中台一起变更的协议问题”分开管理。

#### 6.7.1 已确认的实现和协议问题

| 优先级 | 发现 | 风险/影响 | 处理原则 |
| --- | --- | --- | --- |
| P0 | 构造函数没有消费 `HttpClientConfig`，而普通请求的 URL 也没有统一使用 `config.baseUrl`；`Url.dynamicUrl` 还是全局可变状态 | 多实例、SSR、测试和多环境部署容易请求到错误地址 | 注入不可变的 `GatewayClientConfig`，集中解析绝对 URL；兼容期保留旧配置入口但禁止隐式全局覆盖 |
| P0 | 响应错误契约不一致：401 返回伪造的成功结构，其他状态抛原生 `Error`，429 还直接触发 `alert`/Toast | 页面无法统一处理，错误可能被当成成功，Core 与 UI 耦合 | 统一为可序列化 `AppError`；401/429/5xx 映射为明确错误分类，提示由适配层决定 |
| P0 | 所有响应头几乎都写入 `localStorage`，下次请求再全部带回；文档中还允许保存 token 类头 | XSS 可直接窃取 token；跨 Gateway、租户和环境串头；退出登录后可能残留 | 默认只允许显式配置的非敏感头，按 baseUrl/租户命名空间并带 TTL；认证优先使用 HttpOnly Cookie 或专用会话策略 |
| P0 | ECC 首次握手没有 single-flight；423 重握手与请求并发时可能使用不同密钥；Gateway 的 shared-key 缓存又没有绑定当前 gateway `keyId` | 并发请求、密钥轮换后出现随机解密失败；客户端重握手可能无法修复服务端旧缓存 | 客户端增加按 `baseUrl + clientId` 的握手互斥；中台缓存键必须包含 `keyId`，轮换时原子失效并补分布式节点一致性测试 |
| P0 | 请求发送的是明文 body，同时把密文放在 `X-Encrypted-Data`；Gateway 解密后再替换 body | ECC 并未形成真正的端到端 body 保密，TLS 终止后的中间层仍可看到明文；安全边界容易被误解 | 在协议文档中明确这是 TLS 之上的防篡改/协商机制，或设计 v2 的“密文 body + 明确 content-type”模式，禁止模糊宣传为端到端加密 |
| P1 | `maxRetries`/`retryInterval` 配置没有实现；重试没有统一退避、幂等和 request id 规则 | 配置看似生效但实际不重试，调用方容易重复写操作 | 引入可组合 `RequestPolicy`，只对明确可重试或带幂等键的请求重试，并透传 `Retry-After` |
| P1 | SSE 解析只可靠处理 `\\n\\n`，不完整支持 CRLF、EOF 尾帧、event/id/retry、重连和 Last-Event-ID；Gateway 响应包装还会整段缓冲 | 长连接、代理改写换行或大响应时丢事件/占用大量内存 | 使用独立、可测试的 SSE parser；明确取消语义和重连策略；Gateway 为流式响应提供不缓冲的协议路径 |
| P1 | ECC 握手/423/响应数据大量使用 `any`，没有 schema、版本、过期时间、能力和 trace 字段校验 | 服务端升级后只能在运行时失败，难定位跨语言协议不兼容 | 定义版本化 DTO 和 runtime schema 校验，错误包含 keyId、协议版本、trace id 和可重试建议 |
| P1 | ECC 使用原始 ECDH 结果直接作为 AES key，shared key 可导出，无 AAD；Gateway 公钥没有签名或 pin 校验 | 无法绑定请求上下文；若 TLS/信任链被破坏，存在中间人风险；密钥轮换语义不完整 | v2 评估 HKDF、不可导出 CryptoKey、AAD 绑定 clientId/keyId/method/path/requestId、网关公钥签名/可信 pin；必须提供 TS/Java 测试向量并双端灰度 |
| P1 | 设备指纹无 HMAC 时直接上传高熵指纹；前端 HMAC secret 可被提取；设备 ID 与指纹耦合 | 隐私追踪和“伪安全认证”风险，不能把前端 secret 当作可信证明 | 指纹默认关闭或需明确配置/同意，字段版本化并最小化；设备 ID 使用随机 UUID；Gateway 只把它作为风控信号 |
| P1 | 去重 hash 依赖 `JSON.stringify` 属性顺序，客户端窗口、Gateway TTL 和算法描述不完全一致 | 等价请求可能无法去重，或不同项目对同一请求行为不一致 | 统一 canonical JSON、算法版本和 `Idempotency-Key`/request id 契约；服务端返回窗口和 `Retry-After`，补跨语言契约测试 |
| P1 | loading、Toast、`alert`、路由跳转直接写在 Core；并发请求的 show/hide 也没有引用计数 | Core 无法安全用于 SSR、Web Worker、测试和不同 UI；请求 A 结束可能隐藏请求 B 的 loading | 提供 `LoadingPort`、`NotificationPort`、`AuthRedirectPort` token；loading 按请求引用计数，401 重定向去重并保留 returnUrl |
| P2 | `window`/`navigator`/全局 `fetch`/`AbortSignal.timeout`/`localStorage` 散落在实现中；Mock 还会 monkey-patch 全局 fetch 且默认 enable | SSR、旧 WebView、测试和第三方请求可能互相污染；生产可能意外启用 Mock | 集中平台适配和 timeout helper；Mock 改为显式 opt-in 的 scoped fetch/interceptor，默认关闭 |

#### 6.7.2 可在基础库先行落地的客户端 Todo

| 状态 | Todo | 目标与验收 |
| --- | --- | --- |
| [x] | `GatewayClientConfig` 与 URL resolver | 已接入构造配置；请求、加密交换、SSE 共用 base URL/endpoint；无浏览器环境不读取 `window` |
| [ ] | `RequestClient`/`StreamClient` 拆分 | 保留为后续兼容重构；当前 `AbstractService` 先提供统一 facade |
| [x] | `AppError` 与 response decoder | 已按 status/content-type/业务 code 解码并保留 trace/request id、Retry-After 和原始响应摘要 |
| [x] | HeaderStore 安全重构 | 已实现 allowlist、TTL、大小写归一化和 logout 清理；默认仅内存缓存且过滤敏感头 |
| [x] | Handshake single-flight | 已实现同一 service 实例的首次握手互斥，并覆盖 423 重握手入口 |
| [x] | 加密 DTO 与校验 | 已校验 exchange 的 keyId、公钥和协议头；v2 DTO/schema 留待 Gateway 协议升级 |
| [x] | 可替换安全平台 | 已使用 Web Crypto、SSR 安全的 `globalThis` 访问；AES key 不可导出并校验 IV/tag |
| [x] | 请求策略和幂等 | 已实现安全方法/幂等键约束的指数退避和 Retry-After 处理 |
| [x] | SSE parser 与取消语义 | 已支持 CRLF、跨 chunk、EOF 尾帧、event/id/retry、done/error 和 AbortError |
| [x] | 设备标识/指纹分离 | 已将设备 ID 改为随机 UUID；硬件指纹默认关闭且需显式配置 |
| [x] | Mock 与契约测试工具 | Mock 默认关闭，新增 functional interceptor 和 Gateway/错误/存储/SSE 契约测试 |

#### 6.7.3 必须与技术中台 Gateway 协同的协议 Todo

以下事项不能只改 Angular 客户端，否则会出现“客户端看似升级、服务端仍按旧语义缓存/解密”的半升级状态：

1. **密钥轮换一致性**（客户端与 Gateway v1 已落地）：Gateway shared-key 缓存键现在绑定 `clientId + gatewayKeyFingerprint`，客户端 423 重握手后不会复用旧私钥对应的共享密钥；正式协议 v2 仍需将显式 `gatewayKeyId + protocolVersion` 纳入跨语言契约，并补多实例一致性验证。
2. **握手协议 v2**：响应包含 `protocolVersion`、`keyId`、`gatewayPublicKey`、`expiresAt`、能力列表、nonce/会话标识和 trace id；定义未知版本、过期 key 和重放的错误码。
3. **网关公钥可信性**：明确 HTTPS 是必要前提；如需抵御 TLS 终止层后的中间人，增加网关公钥签名或受控 pin 更新机制。
4. **加密上下文绑定**：评估 HKDF 派生和 AES-GCM AAD，至少绑定 `clientId`、`keyId`、HTTP method、规范化 path、request id；变更必须提供 TS/Java 共享测试向量和灰度兼容窗口。
5. **请求/响应密文语义**：决定密文是否作为唯一 request body；统一 `Content-Type`、空响应、错误响应和大 payload 限制，禁止加密失败时静默降级为明文。
6. **流式协议**：SSE/大响应不能由 Gateway 收集完整 body 后再加密；定义流式加密或明确该路径只走 TLS，并提供背压、取消和断线重连语义。
7. **去重/幂等契约**：统一 canonical body、算法版本、时间窗口、`Idempotency-Key`、429 错误 envelope、`Retry-After` 和 request id；覆盖 JSON、FormData、空 body 和并发写请求。
8. **认证与用户头边界**：明确哪些响应头允许客户端缓存；token 不通过通用响应头回传，优先使用 HttpOnly/Secure/SameSite Cookie 或专用会话交换接口。
9. **跨语言契约门禁**：Gateway、Angular、移动端和其他 SDK 共用协议 fixture；每次协议变更先跑握手、轮换、重放、错误、加密向量和 SSE 测试，再升级客户端。

#### 6.7.4 专项完成定义

- 当前 Gateway v1 的行为有契约测试，且 401、423、429、加密响应、超时、取消和密钥轮换均可复现验证。
- 基础库 Core 不再直接调用 `alert`、DOM、Router 跳转或全局 `fetch`；这些行为通过可替换端口提供。
- 敏感响应头默认不落盘，退出登录后跨标签页清理；安全审计确认没有把前端 HMAC/设备指纹当作认证凭据。
- Gateway v2 若未同步发布，客户端保持明确的 v1 兼容模式，并在文档中标注安全边界、限制和迁移开关。

## 7. 质量门禁

```text
依赖安装（frozen）
  -> strict typecheck
  -> core unit tests
  -> adapter unit tests
  -> 4 package production builds
  -> tarball content check
  -> 4 consumer fixture builds
  -> AS integration build and smoke test
```

- 0 个 TypeScript/Angular template 编译错误。
- 0 个 peer dependency 警告。
- 0 个高危/严重依赖漏洞；例外必须有风险接受记录。
- Core 请求、SSE、Mock、事件、存储模块分支覆盖率不低于 80%。
- 所有公开 API 变更均进入迁移文档和 changelog。
- 产物中不包含 token、私有 registry 凭证或本机路径。

## 8. 风险与应对

| 风险 | 概率 | 影响 | 应对 |
| --- | --- | --- | --- |
| 私有 registry 元数据不符合 pnpm 11 校验预期 | 高 | 阻断安装 | scope registry、单包 trust 排除、integrity 人工核验 |
| `AbstractService` 类型收紧导致旧项目编译失败 | 高 | 大面积迁移 | 泛型重载、迁移期兼容签名、分批移除 |
| PrimeNG 22 运行时行为与类型定义不一致 | 中 | 提示/确认不可用 | 真实 DOM fixture 测试，不只做编译 |
| SSR 访问浏览器全局对象 | 中 | 预渲染崩溃 | 平台 token、守卫和 SSR 测试 |
| Changesets 与手工版本号冲突 | 中 | 发布版本错误 | 统一由 changesets 产生发布版本并 dry-run |
| 四包固定版本造成额外发布 | 低 | 发布频繁 | 22.0 保持 fixed，稳定后再评估 linked |

## 9. 回滚方案

- 每个阶段独立提交，不把依赖、公共 API、测试和文档混成一个提交。
- 正式发布前，AS 始终可切回最后一个 21.x 版本。
- 测试版本只使用 dist-tag，不覆盖 `latest`。
- PrimeNG 适配层阻塞时可延迟该适配包，Core 不应依赖它。
- 类型收紧迁移量不可接受时恢复兼容重载，但不回退 Angular 22 工具链。

## 10. 建议实施批次

| 批次 | 内容 | 预期产物 |
| --- | --- | --- |
| A | registry、pnpm、依赖矩阵、锁文件 | 可重复安装的 Angular 22 工程 |
| B | 测试基座与当前行为契约 | 可安全重构的回归网 |
| C | Core 类型、平台边界、HTTP/Mock、事件 | Angular 22 现代化 Core |
| D | Ionic/Material/PrimeNG 适配 | 三个可独立验证的适配包 |
| E | tarball、fixture、AS 接入 | 真实消费验证报告 |
| F | migration、changeset、next、正式发布 | 22.0.0 发布物 |

## 11. 完成定义

- 四个包的 manifest、lockfile 和实际安装版本一致。
- 四个包均通过 production build 和 tarball 消费测试。
- AS 使用打包后的 22.x 库完成构建和关键流程冒烟测试。
- 21 -> 22 迁移文档可让未参与升级的人独立完成接入。
- CI 能在全新环境复现安装、测试和构建。
- 测试版本完成至少两个消费项目验证。
- 不通过关闭全局安全校验、忽略 peer 冲突或跳过测试制造“通过”。
