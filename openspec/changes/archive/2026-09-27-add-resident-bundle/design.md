## Context

动态壳已验证;常驻 bundle 是 STARTUP.md §四"方式 B"的既定缺口(6.1)。约束:不复制裁决语义(只搬运 gateway.py)、不产生漂移的平行实现、meta-only、add-only。官方事实:静态插件 = `export function apply(ctx)` + `inject: ['tools','shell']` + `ctx.tools.register(defineTool({...}))`;bundle = `package.json` 的 `dsh.bundle.patch` + `- insert:` 行(相对路径锚定在 patch 旁),安装走 `dsh plugin --profile add` / `plugin_manager install_bundle`。

## Goals / Non-Goals

**Goals:**
- Host-only 最小 bundle:5 个 `methodology_*` 工具随进程启动即可见,无需 define/run。
- 单一事实源:bundle 模块与动态半**共享同一份工具定义源**,由脚本生成 + 断言一致,防漂移。
- 把 bundle 的宿主契约钉进 `verify-adapter.mjs`(与动态半同锚)。

**Non-Goals:**
- **不做浏览器半**:卡片 UI 仍由动态插件承担(6.1 既定分步;C2 再议)。bundle 只注册 5 个工具与 3 个 RPC 不需要——静态无 host.call 消费者。
- 不改 gateway.py、core 脚本、动态半函数体。
- 不动用户当前运行中的 profile;安装验证用一次性 profile,或交用户执行。
- 不发布 npm(本机 file: 安装即可;发布是分发问题,不属适配层)。

## Decisions

1. **共享源 = `shared/tools.core.js`(纯 JSM,无 import)**:内容是"参数 schema、输出 schema、toGateValue/toStatusValue、runGateway 的 shell 往返"——这段在动态半是函数体内联代码,在 bundle 是模块顶层定义。**同一份文本,两种包裹**:动态半用 `vm` 函数体包裹(现状不动),bundle 用 `import { ... } from './tools.core.js'`。等价性由自检断言:bundle 的 lib/index.js 的工具定义段与动态半逐段一致。
   - 取舍:真正的"从一份源生成两份"需要模板系统,复杂度高;**断言式等价**(两边各自手写、自检逐段比对)在仓库现有纪律下更 KISS——verify-adapter 已经在做同类事。漂移会在自检里当场暴露,而非默默分叉。
2. **bundle 形态**:纯 ESM、零运行时依赖(除 peer `@deepseek-ai/cordis` 与 `@deepseek-ai/dsh-tools` 的 defineTool——宿主已装载,peerDependencies 声明即可)。**不用 TS 构建链**:直接 `.js` + JSDoc,`main: lib/index.js`,避免把工具链引入方法论仓库。
3. **inject 声明**:`['tools', 'shell']`——静态插件经 `ctx.tools` 注册(区别于沙箱 `harness.registerTool`),shell 同动态半是硬依赖。`workspaceRegistry` 仍走 `ctx.get` 可选。
4. **安装与验证分离**:本 change 交付安装物 + 自检;真实 profile 安装验证要么用 `--profile` 临时层,要么交用户在其环境执行后回贴结果。**不在本 change 内动运行中的 web profile**(与 2026-09-24 的运行实例身份判定协议一致)。
5. **工具面等价**:5 个工具的名字、description、parameters、output schema、execute 逻辑与动态半逐字一致(自检断言);`methodology_status` 的 root 解析逻辑(RUNNER + resolveRoot)一并共享。

## Risks / Trade-offs

- [静态/动态两份文本仍可能漂移] → 自检做逐段等价断言,漂移当场合 FAIL;等价断言失败 = 契约破坏,不允许提交。
- [defineTool 在静态侧的 DSL 与沙箱 harness.defineTool 有差异] → 用真实 dsh-tools 的 defineTool 在自检里实例化并转换 schema(verify-adapter 已加载真实校验器)。
- [peer 依赖在宿主未装载时 bundle 挂起] → inject 声明让 Cordis 挂起到服务可用,与官方教程一致;安装到缺服务的 profile 会 PENDING 而非崩溃。
- [安装验证受运行中实例约束] → 见 Decisions 4;验证路径明确写进 tasks,不静默跳过。

## Migration Plan

1. 写 `shared/tools.core.js`(工具定义 + shell 往返,与动态半逐段对齐)。2. 写 bundle(`package.json`/`patch`/`lib/index.js`)。3. verify-adapter 加 bundle 分支 + 等价断言。4. 起一次性 profile 安装验证工具可见。5. 更新 STARTUP/README 文档。6. 回滚:删 bundle 目录 + 还原三个文档 + git。

## Open Questions

无(路线已在 STARTUP.md §四 与 6.1 预先论证;本 design 落的是既定方向的第一步)。
