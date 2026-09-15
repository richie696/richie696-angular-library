# 贡献指南

感谢你为 `richie696-angular-library` 提交贡献。提交 Issue 或 Pull Request 前，请先确认没有重复问题，并尽量提供可复现的最小示例。

## 开发环境

- Node.js `>=20`
- pnpm `10.x`

```bash
pnpm install
pnpm run build-all
```

提交前请运行与改动相关的构建或测试，并在 Pull Request 中说明验证命令及结果。

## 提交规范

- 从默认分支创建短生命周期分支，提交聚焦、可 review。
- 不要提交密钥、令牌、构建产物或本地环境文件。
- 新增公共 API 时同步更新对应 README、类型定义和必要测试。
- 不要在一个 Pull Request 中混入无关格式化或大范围重构。
- 遵守项目的 [行为准则](CODE_OF_CONDUCT.md)。

## Pull Request

请填写仓库中的 Pull Request 模板，至少说明变更范围、兼容性影响和验证结果。维护者可能要求补充测试、文档或变更说明。

## 许可

提交到本项目的代码和文档将按照仓库根目录 [MIT License](LICENSE) 授权。
