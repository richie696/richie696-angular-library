# @richie696/angular-framework-material

<!-- toc -->

- [安装](#%E5%AE%89%E8%A3%85)
- [应用配置（推荐）](#%E5%BA%94%E7%94%A8%E9%85%8D%E7%BD%AE%E6%8E%A8%E8%8D%90)
- [继承方式](#%E7%BB%A7%E6%89%BF%E6%96%B9%E5%BC%8F)
- [导出内容](#%E5%AF%BC%E5%87%BA%E5%86%85%E5%AE%B9)

<!-- tocstop -->

------

Angular Material 适配包，提供 `AbstractMaterialComponent` 与默认 Prompt 能力实现。

当前发布版本为 `1.0.0`。本包只负责 Angular Material 适配，通用请求、URL、存储和并发能力请从 `@richie696/angular-framework` 引入。

## 安装

```bash
pnpm add @richie696/angular-framework @richie696/angular-framework-material @angular/material @angular/cdk
```

## 应用配置（推荐）

在 `app.config.ts`（Standalone）中注册 provider：

```ts
import { ApplicationConfig } from '@angular/core';
import { provideMaterialPrompt } from '@richie696/angular-framework-material';

export const appConfig: ApplicationConfig = {
  providers: [
    ...provideMaterialPrompt({
      snackDuration: 2500,
      snackConfirmDuration: 6000,
      snackHorizontalPosition: 'center',
      snackVerticalPosition: 'top',
      confirmOkI18nKey: 'app.common.confirm'
    })
  ]
};
```

## 继承方式

页面类继承 `AbstractMaterialComponent`，直接使用 `info/error/warn/success/confirm`：

```ts
import { Component } from '@angular/core';
import { AbstractMaterialComponent } from '@richie696/angular-framework-material';

@Component({
  selector: 'app-demo',
  template: `<button mat-raised-button (click)="onSubmit()">Submit</button>`
})
export class DemoPage extends AbstractMaterialComponent {
  async onSubmit(): Promise<void> {
    await this.warn('请确认本次提交');
    await this.confirm('app.common.confirm.submit', {}, async () => {
      await this.success('已确认');
      return true;
    });
  }
}
```

## 导出内容

- `AbstractMaterialComponent`
- `MaterialPromptAdapter`
- `provideMaterialPrompt`
- `MATERIAL_PROMPT_CONFIG` / `DEFAULT_MATERIAL_PROMPT_CONFIG`
- `MaterialPromptConfig`

需要 Angular `^22.1.1`、Angular Material/CDK `^22.1.1`。详见 Core 包的 [能力说明](../framework/README.md)。
