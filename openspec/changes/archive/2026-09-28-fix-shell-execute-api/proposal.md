## Why

DSH 源码在 2026-08-26(commit `d6bebc5783`,*feat(shell): converge on execute()*)把 `ctx.shell` 服务的 `run()/start()` 收敛为 `resolve() + execute()`,且执行句柄经 `handle.result()` 取前台投影。适配壳(动态半 `dynamic/methodology.host.js` 与常驻 bundle `bundle/lib/index.js`,共享 `tools.core.js`)的 `runGateway`/`resolveRoot` 仍在调 `shell.run(shell.resolve(...))` —— 在当前 DSH 实机上 5 个 `methodology_*` 工具全部抛 `shell.run is not a function`,调用面完全不可用。

更严重的是回归锚失效:`tests/verify-adapter.mjs` 的 104 项断言**全过**,因为它的假 shell([verify-adapter.mjs:115](../../../meta/integrations/dsh/tests/verify-adapter.mjs))建模的也是旧版 `run()` API——测试替身与被测代码一起漂移,互相掩护。"DSH 升级后先跑 verify-adapter.mjs 再谈接线"这条纪律(README §七)当前不成立。

本 change 修三件事:适配壳两处调用点迁移到 `execute() + result()`;假 shell 改为新 API 形状并加**区分度断言**(假 shell 不实现 `run()`,适配壳若再调旧 API 必须当场炸掉);`meta/integrations/dsh/README.md` 排障表同步。

## What Changes

- **适配壳调用点迁移**(`bundle/lib/index.js` 的 `resolveRoot`/`runGateway` 与动态半对应段,保持逐段一致):
  `shell.run(shell.resolve(req))` → `const h = await shell.execute(shell.resolve(req)); const r = await h.result()`;
  结果字段读取不变(`r.exitCode`/`r.stdout.text`/`r.stderr.text` 在 `ShellRunResult` 上同名同义,`CollectedOutput.text` 形状未变)。
- **假 shell 模型修正**(`tests/verify-adapter.mjs`):`resolve()` 返回补全 `workdir/timeoutMs/onExpiry/stdoutMaxBytes/sandboxPolicy` 的完整 spec;`run()` 改为 `execute()` 返回带 `result()` 投影的句柄(真实 `ShellExecution` 形状:`exitCode/signal/timedOut/aborted/timeoutMs/stdout/stderr`)。
- **新增区分度断言**:假 shell **刻意不提供** `run` 方法;若适配壳(两半任一)回退调 `shell.run`,execute 路径必须以 TypeError 失败并被断言捕获——把"测试替身与实现一起漂移"这类互掩失效钉死。
- **信封语义不变**:网关调用命令、JSON 解析、exit 2 分类、错误消息文本全部不动;`gateway.py`/core 一行不改。
- **文档同步**:`meta/integrations/dsh/README.md` §五排障表删去过时行、补新 API 说明;该 README 与 STARTUP.md 中 shell 调用形状如有描述性语句一并核对。
- **运行中环境的适配壳修复**:本机 DSH profile 装的是常驻 bundle(link 通道)。代码修复入库后,重启 DSH 进程即生效(静态插件随进程启动装载,无热更新);不在本 change 内做运行时热修。

## Capabilities

### New Capabilities
<!-- 无:不新增能力,是既有 integration-adapter 能力的缺陷修复 -->

### Modified Capabilities
- `methodology/integration-adapter`: 「DSH Cordis plugin shell」与「Host-contract regression check」两条 Requirement 的场景收紧——适配壳必须通过当前 DSH 的 `ctx.shell` 服务契约(`resolve()+execute()+result()`)调用宿主,验证脚本的假 shell 必须建模当前服务形状且**不含**旧版 `run()`,使两半任一回退旧 API 时验证必败。

## Impact

- 修改:`meta/integrations/dsh/bundle/lib/index.js`(2 处调用点)、`meta/integrations/dsh/dynamic/methodology.host.js`(对应 2 处,逐段一致)、`meta/integrations/dsh/tests/verify-adapter.mjs`(假 shell + 新断言)、`meta/integrations/dsh/README.md`(排障表)。
- 不修改:`bundle/shared/tools.core.js`(无 shell 调用)、`gateway.py`、core 五层、`verdict.schema.json`、技能、`targets/`。
- 兼容性:修复只面向 `execute()` 收敛后的 DSH(2026-08-26 起);旧 DSH 已不在支持范围(本仓库 bundle 尚未对任何旧版发布,无兼容负担)。
- 验证:`node meta/integrations/dsh/tests/verify-adapter.mjs` 全过 + `--full` 路径真实信封通过 + 本机 DSH 实例重启后 `methodology_status` 实测出合法快照。
