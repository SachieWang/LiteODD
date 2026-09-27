## Why

动态适配壳(会话内 `cordis_define`/`cordis_run`)已真机验证可用,但它是**会话级、进程内**的:重启即失、刷新页面要重新激活——这在 `add-integration-adapter` 的 6.1 与 `add-heterogeneous-target` 的结论里都被点名为"日常形态"的缺口。官方机制是 **profile bundle**:进程启动即装载、全会话可见、随 preset/profile 分发。

刻意推迟至今的理由(无法端到端自证的平行第二实现会漂移)现在可以安全移除,因为:

- Host-only 最小 bundle(STARTUP.md §四 的既定路线)只动工具面,不碰浏览器半;
- 适配层已有 `verify-adapter.mjs` 回归锚,可以同法把 bundle 的宿主契约也钉住。

## What Changes

- 新增 `/meta/integrations/dsh/bundle/`(npm 包形态):
  - `package.json`:`dsh: { bundle: { patch: './cordis.patch.yml' } }`,`main: lib/index.js`;
  - `cordis.patch.yml`:`- insert:` 一行 `id: methodology-adapter` 指向本插件;
  - `lib/index.js`:**从共享源生成**(见下),非手写平行实现;
  - `src/`(TS/JSM 源)供审查与再生成。
- **单一事实源,两形态生成**:新增 `dynamic/build_payload.py` 的姊妹脚本(或其扩展)——动态半的函数体与 bundle 的模块导出**从同一份共享源** `shared/` 生成,生成物只在仓库保存 bundle 侧,动态半保持手写函数体不变(已有真机验证),两边由自检脚本做**逐字等价断言**(工具定义、schema、execute 逻辑),防止漂移。
- `verify-adapter.mjs` 新增 bundle 分支:import 编译后的 `lib/index.js`,在真实 Cordis 上下文里 apply,断言 5 个 `methodology_*` 工具注册且 `execute` 走真实 gateway 信封;并断言 `lib/index.js` 与共享源一致。
- 安装通道(本 change 内只做验证,不改部署):`dsh plugin --profile <name> add <spec>` 或 `plugin_manager install_bundle`(本机 profile),验证工具随进程启动可见。

## Capabilities

### New Capabilities
<!-- 无新增能力;integrated-adapter 既有能力扩展 -->

### Modified Capabilities
- `methodology/integration-adapter`: 工具面从"仅动态插件"扩为"动态 + 常驻 bundle 双形态,同一共享源"。

## Impact

- 新增:`/meta/integrations/dsh/bundle/`(package.json、cordis.patch.yml、lib/、src/、shared/ 生成脚本)。
- 修改:`verify-adapter.mjs`(bundle 分支)、`STARTUP.md`(方式 B 交付)、`meta/integrations/dsh/README.md` §七、`meta/integrations/README.md` §六面表。
- 不修改:gateway.py、core 脚本、动态半的已验证函数体、四份技能源。
- 本 change **不**动用户的运行中 profile(安装验证在一次性测试 profile 做,或按用户指示)。
