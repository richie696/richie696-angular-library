# @richie696/angular-framework-primeng

[![npm version](https://img.shields.io/npm/v/@richie696%2Fangular-framework-primeng?logo=npm&label=npm)](https://www.npmjs.com/package/@richie696/angular-framework-primeng)
[![npm downloads](https://img.shields.io/npm/dm/@richie696%2Fangular-framework-primeng?logo=npm&label=downloads)](https://www.npmjs.com/package/@richie696/angular-framework-primeng)
[![GitHub stars](https://img.shields.io/github/stars/richie696/richie696-angular-library?logo=github&label=stars)](https://github.com/richie696/richie696-angular-library)
[![GitHub issues](https://img.shields.io/github/issues/richie696/richie696-angular-library?logo=github&label=issues)](https://github.com/richie696/richie696-angular-library/issues)
[![MIT License](https://img.shields.io/github/license/richie696/richie696-angular-library?logo=opensourceinitiative&label=license)](../../LICENSE)

[📚 Monorepo 文档](../../README.md) · [📦 包结构](../../README.md#包结构) · [💻 GitHub](https://github.com/richie696/richie696-angular-library) · [🐛 Issues](https://github.com/richie696/richie696-angular-library/issues) · [🤝 贡献](../../CONTRIBUTING.md) · [🛡️ 安全](../../SECURITY.md) · [📄 License](../../LICENSE)


<!-- toc -->

- [安装](#%E5%AE%89%E8%A3%85)
- [应用配置（推荐）](#%E5%BA%94%E7%94%A8%E9%85%8D%E7%BD%AE%E6%8E%A8%E8%8D%90)
- [继承方式](#%E7%BB%A7%E6%89%BF%E6%96%B9%E5%BC%8F)
- [导出内容](#%E5%AF%BC%E5%87%BA%E5%86%85%E5%AE%B9)

<!-- tocstop -->

------

PrimeNG 适配包，提供 `AbstractPrimeNGComponent` 与默认 Prompt 能力实现。

当前发布版本为 `1.0.0`。本包只负责 PrimeNG 适配，通用请求、URL、存储和并发能力请从 `@richie696/angular-framework` 引入。

## 安装

```bash
pnpm add @richie696/angular-framework @richie696/angular-framework-primeng primeng
```

## 应用配置（推荐）

在 `app.config.ts`（Standalone）中注册 provider：

```ts
import { ApplicationConfig } from '@angular/core';
import { providePrimeNgPrompt } from '@richie696/angular-framework-primeng';

export const appConfig: ApplicationConfig = {
  providers: [
    ...providePrimeNgPrompt({
      messageLife: 3000,
      confirmOkI18nKey: 'app.common.confirm',
      confirmCancelI18nKey: 'app.common.cancel'
    })
  ]
};
```

> 使用 PrimeNG 消息与确认框时，请在宿主应用模板中放置对应容器（例如 `p-toast` 与 `p-confirmDialog`）。

## 继承方式

页面类继承 `AbstractPrimeNGComponent`，直接使用 `info/error/warn/success/confirm`：

```ts
import { Component } from '@angular/core';
import { AbstractPrimeNGComponent } from '@richie696/angular-framework-primeng';

@Component({
  selector: 'app-demo',
  template: `<button pButton type="button" (click)="onSubmit()">Submit</button>`
})
export class DemoPage extends AbstractPrimeNGComponent {
  async onSubmit(): Promise<void> {
    await this.info('开始处理');
    await this.confirm('app.common.confirm.submit', {}, async () => {
      await this.success('已确认');
      return true;
    });
  }
}
```

## 导出内容

- `AbstractPrimeNGComponent`
- `PrimeNgPromptAdapter`
- `providePrimeNgPrompt`
- `PRIMENG_PROMPT_CONFIG` / `DEFAULT_PRIMENG_PROMPT_CONFIG`
- `PrimeNgPromptConfig`

需要 Angular `^22.1.1`、PrimeNG `^22.0.0`。详见 Core 包的 [能力说明](../framework/README.md)。
