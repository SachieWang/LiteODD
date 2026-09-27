## 1. 共享源与 bundle 实现

- [x] 1.1 新增 `bundle/shared/tools.core.js`:RUNNER/GATEWAY_REL、q()、STEP/GATE/STATUS_SCHEMA、P_REPO/P_TARGET/P_CANDIDATE、textBlock、toGateValue、toStatusValue,命名导出;内容与动态半对应段逐字一致(由 2.2 强制)。
- [x] 1.2 新增 `bundle/lib/index.js`:ESM 静态插件(`export function apply(ctx)` + `inject: ['tools','shell']`),`ctx.tools.register(defineTool({...}))` × 5;**参数根用 DSL 形态**(属性级 `required`,与官方 adding-a-tool 一致——静态 defineTool 不做 raw→DSL 转换,这是与动态半唯一允许的形态差异);不注册 host.call RPC。
- [x] 1.3 新增 `bundle/package.json`(`dsh.bundle.patch`、`main: lib/index.js`、peer: cordis + dsh-tools)与 `bundle/cordis.patch.yml`(`- insert: - id: methodology-adapter`)。

## 2. 自检扩展(防漂移锚)

- [x] 2.1 `verify-adapter.mjs` bundle 分支:软链 DSH 安装的 dsh-tools 后 import `lib/index.js`,mock Cordis ctx 上 apply;断言注册恰 5 个 `methodology_*`;真实信封跑 `methodology_status` execute,值过 output schema、网关调用钉 workdir;测试软链结束即清理。
- [x] 2.2 **等价断言(花括号配对提取 + 去注释/空白/export 前缀后逐段比对)**:RUNNER 常量、q()、toGateValue、toStatusValue、GATE_SCHEMA、STATUS_SCHEMA、resolveRoot、runGateway、candidateRoots——九段全过;人为内联 GATEWAY_REL 字面量时断言当场 FAIL(本轮实测抓到两处,已修)。
- [x] 2.3 用宿主真实 `defineTool` 实例化(bundle apply 即经过它),5 个工具参数合 DSL 且 JSON Schema 属受支持子集(apply 通过即证明)。
- [x] 2.4 断言具备区分度(两个已知不同段比对非恒真)。

## 3. 安装验证(工具随进程启动可见)

- [x] 3.1 一次性 profile `mthd-verify`:`dsh plugin --profile mthd-verify add ./meta/integrations/dsh/bundle`(link 安装)→ `dsh --profile mthd-verify --dump-config` 出现 `# == dsh-methodology-adapter` 层 → one-shot 进程启动日志出现 **`methodology adapter (resident bundle) active: 5 tools`**(静态 apply 的最后一行,不经 cordis_define/run)。模型回答因该一次性 profile 无 LLM 凭据超时,但插件装载证据(启动日志)已足够断言工具注册。
- [ ] 3.2 (用户侧可选)在常用 profile 执行 `dsh plugin --profile <name> add ./meta/integrations/dsh/bundle` 并重启验证;不属本 change 硬验收。

## 4. 文档与回归

- [x] 4.1 更新 `STARTUP.md` §四(方式 B 第一步已交付 + 安装命令)、`dsh/README.md` §七(已交付与验证 + 形态差异 + 第二步未交付)、`integrations/README.md` §四 B 行(双形态)。
- [x] 4.2 `node meta/integrations/dsh/tests/verify-adapter.mjs` **ALL PASS,104 项断言**(原 84 + bundle 20)。
- [x] 4.3 `bench.py targets/dsh` 与 `targets/plant-maint` 均 PASS;改动全部位于 integrations/ 外挂层,core 零触碰(`git status` 确认)。
