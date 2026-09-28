## Context

适配壳两半(动态 `methodology.host.js` / 常驻 `bundle/lib/index.js`)由 `verify-adapter.mjs` 的等价断言强制逐段一致,shell 调用集中在各自的 `resolveRoot` 与 `runGateway` 两段。DSH 侧的事实(源码 `packages/shell/shell/src/index.ts` + `types.ts`,commit `d6bebc5783`):

- `ShellExecutor` 只抽象两个方法:`resolve(request) → ShellExecSpec` 与 `execute(spec) → Promise<ShellExecution>`;
- `ShellExecution extends ShellProcess`,前台投影经 `await handle.result()` 得 `ShellRunResult`;
- `ShellRunResult.exitCode / stdout / stderr` 与旧 `run()` 返回值**同名同义**,`CollectedOutput = { text, truncated, spillPath? }` 形状未变;
- 旧 `run()` 方法已不存在——`ctx.shell.run` 是 `undefined`,调用即 TypeError,这正是本机实测 `shell.run is not a function` 的直接来源。

约束:三红线(不复制裁决、不就地吸收、不改核心)继续成立;`tools.core.js` 无 shell 调用不动;信封语义与错误消息文本不动。

## Goals / Non-Goals

**Goals:**
- 两半的 shell 调用迁移到 `resolve() + execute() + result()`,逐段一致;
- 假 shell 改为当前服务形状,且**不提供** `run`——让回退旧 API 的实现当场失败;
- 全部 104 项既有断言 + 新增区分度断言通过;`--full` 真实信封路径通过。

**Non-Goals:**
- 不改 `gateway.py`/core/信封 schema/技能;
- 不做 DSH 进程热修(常驻 bundle 是静态插件,重启装载——见 Migration);
- 不支持 2026-08-26 之前的旧 DSH(bundle 从未对旧版发布,无兼容负担);
- 不动 Windows RUNNER 问题(既有独立缺口,README 已标注)。

## Decisions

1. **两处调用点统一改写为 `execute() + result()`**,不引入兼容垫片(如 `shell.run ?? (…)`)。理由:适配壳的宿主面只有当前 DSH,垫片会重新引入"测试替身配旧 API 也能过"的互掩通道,与本 change 的目的相反。备选"检测 `shell.run` 存在则用旧路"被否决。
2. **结果读取零改动**:`exitCode/stdout.text/stderr.text` 同名,迁移只动"怎么拿到 result",不动"result 里读什么"。这把行为变更面压缩到最小,等价断言与既有断言可完整复用。
3. **假 shell 建模完整 spec**:除补 `workdir/timeoutMs` 外,`resolve()` 返回值补 `onExpiry: 'kill'`、`stdoutMaxBytes`、`sandboxPolicy: undefined`、`signal: undefined`、`stdin: undefined` ——与 `ShellExecSpec` 字段集一致,避免实现若开始读取新字段时假 shell 缺字段误报。`execute()` 返回的对象 = `shellResult(...)` 前台投影 + `result()` 方法(返回同一形状的 Promise),再加 `ShellProcess` 的最小面(`status/exitCode/signal/done/readOutput/observed/kill`)以贴近真实句柄。
4. **区分度断言的实现**:假 shell 对象**不定义** `run` 属性。新增一条反向断言:把一个只带 `run` 的"旧版假 shell"喂给两半的 execute 路径,断言其**抛 TypeError 且 shellCalls 为空**(证明调用根本没走通),即"若实现回退旧 API,新假 shell 下必炸";再由第 3 条保证正向路径只走 `execute`。两条合起来,替身与实现无法一起漂移。
5. **错误消息与排障表**:抛错文本里"shell.run is not a function"不应再出现;README §五删去过时行,补一行"工具抛 TypeError(shell.X is not a function)= 宿主 shell 服务 API 与适配壳不匹配,先跑 verify-adapter.mjs"。

## Risks / Trade-offs

- [DSH 再改 shell 契约] → 假 shell 不提供多余方法的纪律让 verify-adapter 当场暴露;README 排障表指路;真正解法是事件面由 CI 定期跑 `verify-adapter.mjs`(分发后接入,不在本 change)。
- [动态半在真实 sandbox 求值与假 shell 行为差] → 既有 104 项断言 + `--full` 真实信封路径覆盖;本机 DSH 实测 `methodology_status` 作为最终验收。
- [常驻 bundle 修复需重启才生效] → Migration 明示;用户侧感知为"更新仓库后重启 DSH"。
- [result() 拒绝语义] → `result()` 仅在基础设施失败(进程从未产出)时 reject;网关的非零 exit 是**正常 resolve**,`ShellRunResult.exitCode` 携带——与旧 `run()` 一致,信封解析逻辑无需分支。

## Migration Plan

1. 改 `bundle/lib/index.js` 两处 → 同步 `dynamic/methodology.host.js` 对应段(逐段一致)。
2. 改 `tests/verify-adapter.mjs`:假 shell 新形状 + 反向断言;跑 `node …verify-adapter.mjs` 与 `--full`。
3. 改 `meta/integrations/dsh/README.md` §五。
4. 验收:本机 DSH(常驻 bundle link 安装)重启后调 `methodology_status` 出合法快照。
5. 回滚:单 commit,revert 即回到修复前(回到"工具不可用"现状,无数据迁移)。

## Open Questions

无(shell 契约形状已从 DSH 源码逐字段核实)。
