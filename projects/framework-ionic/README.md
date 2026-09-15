# @richie696/angular-framework-ionic

<!-- toc -->

- [安装](#%E5%AE%89%E8%A3%85)
- [应用配置（推荐）](#%E5%BA%94%E7%94%A8%E9%85%8D%E7%BD%AE%E6%8E%A8%E8%8D%90)
- [继承方式](#%E7%BB%A7%E6%89%BF%E6%96%B9%E5%BC%8F)
- [导出内容](#%E5%AF%BC%E5%87%BA%E5%86%85%E5%AE%B9)

<!-- tocstop -->

------

Ionic 适配包，提供 `AbstractIonicComponent` 与默认 Prompt 能力实现。

当前发布版本为 `1.0.0`。本包只负责 Ionic 适配，通用请求、URL、存储和并发能力请从 `@richie696/angular-framework` 引入。

## 安装

```bash
pnpm add @richie696/angular-framework @richie696/angular-framework-ionic @ionic/angular
```

## 应用配置（推荐）

在 `app.config.ts`（Standalone）中注册 provider：

```ts
import { ApplicationConfig } from '@angular/core';
import { provideIonicPrompt } from '@richie696/angular-framework-ionic';

export const appConfig: ApplicationConfig = {
  providers: [
    ...provideIonicPrompt({
      toastDuration: 3000,
      toastPosition: 'bottom',
      confirmOkI18nKey: 'app.common.confirm',
      confirmCancelI18nKey: 'app.common.cancel'
    })
  ]
};
```

## 继承方式

页面类继承 `AbstractIonicComponent`，直接使用 `info/error/warn/success/confirm`：

```ts
import { Component } from '@angular/core';
import { AbstractIonicComponent } from '@richie696/angular-framework-ionic';

@Component({
  selector: 'app-demo',
  template: `<ion-button (click)="onSubmit()">Submit</ion-button>`
})
export class DemoPage extends AbstractIonicComponent {
  async onSubmit(): Promise<void> {
    await this.info('操作成功');
    await this.confirm('app.common.confirm.submit', {}, async () => {
      await this.success('已确认');
      return true;
    });
  }
}
```

## 导出内容

- `AbstractIonicComponent`
- `IonicPromptAdapter`
- `provideIonicPrompt`
- `IONIC_PROMPT_CONFIG` / `DEFAULT_IONIC_PROMPT_CONFIG`
- `IonicPromptConfig`

需要 Angular `^22.1.1`、Ionic Angular `^8.8.0`。详见 Core 包的 [能力说明](../framework/README.md)。
