## Why

常驻 bundle 已交付(`add-resident-bundle`),但分发形态仍是**开发通道**:`dsh plugin add ./bundle` 产生 **link 绑定**(实测 `mthd-verify` profile 的 node_modules 是指向仓库内 `bundle/` 的软链)——移动/删除/重命名仓库即失效,换机换路径不可迁移。

官方 publish 教程的发布形态是 **patch 行用包名**而非相对路径:"plugin rows reference the package by name instead of a relative source path, so Node resolution finds the installed code"。包名在 link 安装(链进 node_modules)与 git/npm 安装(拷进 pnpm store)下**都能解析**——一份 patch 通吃两种通道,不需要维护两份。

本 change 把 bundle 的分发形态从"link 专用"改为"通道无关",并让"本体未装"的报错指向正确的下一步。

## What Changes

- `bundle/cordis.patch.yml`:插件行 `name` 由 `'./lib/index.js'`(相对路径,锚定在 patch 旁)改为 **`'dsh-methodology-adapter'`**(包名,Node 模块解析)。
- **不加发布流程**:git spec(`dsh plugin --profile <n> add <git-url>#<tag>`)与 npm 发布是**使用侧的选择**,不在本 change 内交付;本 change 只保证"装进来的那一份 patch 对两种通道都正确"。
- `bundle/lib/index.js` 与动态半的 `resolveRoot` 报错补一句指引:候选都不含仓库时提示"先安装方法论工具本体,再以 `repo:` 指向该安装"(两形态同步,等价断言同步覆盖)。
- 文档:`STARTUP.md` §四 与 `dsh/README.md` §七 的安装命令补 git spec 形态,并写明 link 与发布的差异(link=开发绑定,git/npm=路径无关拷贝)。

## Capabilities

### New Capabilities
<!-- 无 -->

### Modified Capabilities
- `methodology/integration-adapter`: bundle 的分发形态要求(包名引用、通道无关)。

## Impact

- 修改:`bundle/cordis.patch.yml`(一行)、`bundle/lib/index.js` 与 `dynamic/methodology.host.js`(报错文案,各一句)、`verify-adapter.mjs`(patch 行断言改为包名;等价断言范围不变)、`STARTUP.md`、`dsh/README.md`。
- 不修改:gateway.py、core、共享源逻辑(仅错误提示文案)。
- 验证后清理一次性 profile `mthd-verify`(上轮遗留,授权已给)。
