#!/usr/bin/env node

/**
 * 构建并发布 Angular workspace 包。
 *
 * 用法：
 *   pnpm run publish:selected -- all
 *   pnpm run publish:selected -- framework framework-ionic
 *   pnpm run publish:selected -- @richie696/angular-framework-primeng
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const REGISTRY = 'https://registry.npmjs.org/';
const WORKSPACES = [
  { dir: 'framework', buildScript: 'build:framework' },
  { dir: 'framework-ionic', buildScript: 'build:ionic' },
  { dir: 'framework-material', buildScript: 'build:material' },
  { dir: 'framework-primeng', buildScript: 'build:primeng' },
].map(workspace => {
  const packagePath = path.join(ROOT, 'projects', workspace.dir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return { ...workspace, name: pkg.name, label: `${pkg.name}@${pkg.version}` };
});

function run(command, args, cwd = ROOT) {
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

function selectedWorkspaces() {
  const args = process.argv.slice(2).filter(arg => arg !== '--');

  if (args.length === 0 || args.includes('all')) {
    return WORKSPACES;
  }

  const selected = [];
  for (const arg of args) {
    const workspace = WORKSPACES.find(item => item.dir === arg || item.name === arg);
    if (!workspace) {
      throw new Error(`未知包：${arg}。可选值：${WORKSPACES.map(item => item.dir).join(', ')}`);
    }
    if (!selected.includes(workspace)) selected.push(workspace);
  }

  return WORKSPACES.filter(workspace => selected.includes(workspace));
}

function assertPublicNpmLogin() {
  run('npm', ['whoami', '--registry', REGISTRY]);
}

function build(workspaces) {
  console.log('\n🔨 构建选中的 Angular 包\n');
  run('pnpm', ['run', 'toc']);

  for (const workspace of workspaces) {
    console.log(`\n  → 构建 ${workspace.label}`);
    run('pnpm', ['run', workspace.buildScript]);
  }
}

function publish(workspaces) {
  console.log('\n🚀 发布到 npm 官方 registry\n');

  for (const workspace of workspaces) {
    const distDir = path.join(ROOT, 'dist', workspace.dir);
    const packagePath = path.join(distDir, 'package.json');

    if (!fs.existsSync(packagePath)) {
      throw new Error(`构建产物不存在：${packagePath}`);
    }

    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    if (pkg.name !== workspace.name) {
      throw new Error(`构建产物包名不匹配：期望 ${workspace.name}，实际 ${pkg.name}`);
    }

    console.log(`\n  → 发布 ${pkg.name}@${pkg.version}`);
    run(
      'pnpm',
      ['publish', '--no-git-checks', '--access', 'public', '--registry', REGISTRY],
      distDir,
    );
  }
}

function main() {
  try {
    const workspaces = selectedWorkspaces();
    console.log(`\n📋 选中 ${workspaces.length} 个包：${workspaces.map(item => item.name).join(', ')}`);
    assertPublicNpmLogin();
    build(workspaces);
    publish(workspaces);
    console.log('\n✅ 发布完成\n');
  } catch (error) {
    console.error(`\n❌ 发布失败：${error.message}`);
    process.exitCode = 1;
  }
}

main();
