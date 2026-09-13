# DSH 适配 — `/meta/integrations/dsh`

把本体驱动方法论工具体系接进 **DeepSeek Harness (DSH)** 的 **Cordis 插件**层。本目录是 `meta/integrations/` 适配层里唯一 DSH 专有的部分;核心五层与 `gateway.py` 都不感知 DSH。

DSH 的插件模型(本轮实测所依据的事实):

| 事实 | 对本适配的含义 |
|---|---|
| 插件 = **Cordis Plugin**;动态插件由 `cordis_define` 传入两段**纯 JS 函数体**(`code.host` / `code.client`) | 适配壳的源码就是"函数体"文件,不是 npm 模块;无 `import`/`require`/TS/JSX |
| Host 半跑在 `node:vm` 沙箱:全局只有 `ctx`/`harness`/`console`/`btoa`/`atob`/`TextEncoder`/`TextDecoder` | 一切进程与文件工作走 Cordis service(`ctx.shell`);`process`/`Buffer`/`fetch`/`setTimeout` 不可用 |
| `harness.defineTool` + `harness.registerTool(ctx, tool)` 注册**模型可见工具**;`harness.handle` / `host.call` 是包内私有 JSON RPC | 调用面与 UI 面的接线点 |
| 动态插件**属于当前 Session、进程内**(`cordis_undefine`:移除"当前 Session 拥有的"动态插件) | 零安装、随会话起停;跨会话常驻需另一条路(见文末"常驻化") |
| Cordis 工具集(`cordis_*`)是**刻意 opt-in**的,只在本部署的 `cordis`(创造模式)preset 里 | 让 agent **自己**装载适配壳 → 需要该 preset;否则用 `gateway.py` CLI 等价入口 |
| 技能根包含项目内 `<workspace>/.agents/skills/` | 触发面放进 `.agents/skills/` 即被 DSH 收录 |

---

## 一、三个接线点

| 面 | 文件 | DSH 机制 |
|---|---|---|
| **调用面**(模型工具) | `dynamic/methodology.host.js` | `harness.defineTool` + `harness.registerTool` → 5 个 `methodology_*` 工具 |
| **感知/交互面**(卡片 UI) | `dynamic/methodology.client.js` | `slots.register({ name: 'tool.view.cordis', key: 'self' })` + `host.call` |
| **触发面**(技能) | `skills/*/SKILL.md` → 副本 `.agents/skills/*/SKILL.md` | DSH 技能发现根,会话目录即生效 |

三者都只是**薄传输壳**:真正干活的是 `meta/integrations/gateway.py`,真正裁决的是 core 的 `check.py` / `bench.py` / `judge.py`。

## 二、模型工具清单

| 工具 | 对应网关命令 | 用途 |
|---|---|---|
| `methodology_status` | `snapshot` | 契约只读快照:frame 版本与概念/关系类型、元模型、编排阶段、五类吸收目标、候选及其自述字段、目标清单、**权威闸门命令** |
| `methodology_check` | `check --target T` | Layer 0 单一合规校验(三段不变量 + `conceptRef` 解析) |
| `methodology_bench` | `bench --target T` | Layer 3 基准回归(`check.py` + `engine.py`) |
| `methodology_judge` | `judge --candidate C [--target T]` | Layer 3 收敛裁判:结构化返回 `judgeRecord`/`judgeBench`/`judgeAddOnly` 三条件与 `ACCEPT`/`REJECT/DEFER` |
| `methodology_gate` | `gate --target T [--candidate C]` | **单一网关**:回归 + 判定一次跑完 |

包内 RPC(仅本包的浏览器半可调):`snapshot` / `judge` / `gate` —— 供卡片面板取数与原地触发。

**语义约定:** `judge` 判 `REJECT` 或 `bench` 失败时,工具**返回结构化值**(`ok=false`)而不是抛错——agent 据此整改,而不是把领域性失败当成工具故障。

> **启动方式总览见 [STARTUP.md](STARTUP.md):DSH 有两种插件机制(动态 vs 静态常驻),先读它在选。**

## 三、动态装载(会话内零安装)—— 每一步明确谁做、传什么、回什么

> 关键前提:动态插件是 **agent 在对话里装载的**。`cordis_define` / `cordis_run` 是 **agent 工具**,只有 `cordis`(创造模式)preset 的会话才有;`build_payload.py` 由**人或 agent** 在终端/脚本里跑。两步各守各的侧,不要混。

**前置:**
- 当前会话 = `cordis`(创造模式)preset;
- 仓库已 `uv sync` 过(否则第一步工具会因缺 venv/依赖报错);
- **不需要**把工作目录设成仓库根:适配壳自己解析仓库根(见 §五"仓库根解析")。要强制指定时,给工具传 `repo`(仓库根绝对路径)。

### 步骤 0(可选但推荐)· 确认识别

```text
cordis_inspect_list
  # 返回当前 Host/Client 已注册的 Provider 与只读方法,确认有 host 的 Service / Builtin / Tool 等
cordis_inspect_query  { platform: "host", provider: "Service", method: "listService", input: { service: "shell" } }
  # 确认 ctx.shell 这个服务确实挂载、且 resolve/run 签名如本适配所依赖(SHELL_SETTINGS_NAMESPACE='shell')
```

本适配 host 半 `inject: ['shell']`;若 Host 装配没有 `shell` 提供者(由 `bash-sandbox`/`bash-local` 提供),插件会被 Cordis **挂起**到该服务出现——所以先查这一步最省事。

### 步骤 1 · 生成 `cordis_define` 的入参文件

**谁执行:** 人/agent 在终端(或 DSH 的 shell 工具)跑:

```bash
python meta/integrations/dsh/dynamic/build_payload.py
```

**产物:** `meta/integrations/dsh/dynamic/define.payload.json`,内容就是 `cordis_define` 需要的完整字段(**三段 `plugin` / `name` / `purpose` / `code`**,`code` 内是 `methodology.host.js` 与 `methodology.client.js` 的**原文字符串**):

```json
{
  "plugin": { "kind": "new", "idPrefix": "mthd" },
  "name":  "methodology-adapter",
  "purpose": "把本体驱动方法论工具链(check/bench/judge + 契约快照)接入 DSH…",
  "code": { "host": "<methodology.host.js 全文>", "client": "<methodology.client.js 全文>" }
}
```

> 这个文件**不是**给 `cordis_define` 传文件名用的——`cordis_define` 只吃**内联值**。它的作用是让 agent `read` 这个文件、把字段原样搬过去,避免手工抄 23KB 代码。

### 步骤 2 · 由 agent 读 payload → 调 `cordis_define`

**谁执行:** agent(用其文件读工具 + `cordis_define`)。人只需把下面的指令交给 agent,或用 `methodology-gate` 技能的引导。

```text
(给 agent 的话)
1. 用你的读文件工具读取 meta/integrations/dsh/dynamic/define.payload.json;
2. 把它的 plugin / name / purpose / code 三个字段原样作为 cordis_define 的入参传入
   (code.host 与 code.client 就是那两个 JS 文件的完整内容,逐字搬,不要省略/改写);
3. 调 cordis_define。
```

`cordis_define` **只校验 + 记录源码**,不执行 `apply`、不请求审批、不改 `currentPackageId`。返回值形如:

```text
{ "pluginId": "mthd-1", "packageId": "mthd-1@1" }
```

记下这两个 id,下一步要用。若它报 schema/语法错误,属于“沙箱 DSL 不支持”类,排障见 §五。

### 步骤 3 · agent 调 `cordis_run` 激活

```text
cordis_run  { pluginId: "mthd-1", packageId: "mthd-1@1", mode: "run" }
```

| 返回值 | 含义 | 下一步 |
|---|---|---|
| `awaiting-approval` | 含 Client 半,首次运行需要你在页面授权 | 去页面授权(见下),**结束本轮**,等系统回报 |
| `starting` | 已授权,正在异步启动(浏览器半仍在加载) | **结束本轮**,通过状态/steering 或 `cordis_inspect_self` 看最终结果 |
| 别的错误 | 技术性失败 | 用 `cordis_inspect_self(pluginId, packageId)` 读精确诊断 → 修 → `build_payload.py --existing mthd-1` 生成新版本 → 重新 `cordis_define` + `cordis_run` |

`cordis_run` **不返回最终结果**;`currentPackageId` 只在完整成功后改变。

### 步骤 4 · 授权(仅首次、且含 Client 半时)

页面出现授权请求时:`单勾` 只授权**当前 Package**;`双勾` 授权该插件**后续所有版本**(日常选择双勾省得下次再点)。授权后返回 `starting`,浏览器内异步完成。**不要在同一轮里等审批结果**,结束本轮等系统回报。

### 步骤 5 · 确认已装载

装载成功的标志:在**下一个模型步骤**的可用工具表里出现这 5 个工具:
`methodology_status` / `methodology_check` / `methodology_bench` / `methodology_judge` / `methodology_gate`。

直接验证:调一次 `methodology_status`(无参即可),应返回契约快照;或 `cordis_inspect_self("mthd-1")` 看 `currentPackageId` 已存在、无 client-render 诊断。

**最小可行验证(一次装好):** 步骤 1 → 2 → 3 → (授权) → 调 `methodology_status` → 对一条候选调 `methodology_judge`。

### 失败最可能是这两处

1. **工具没出现:** 授权后未结束本轮就等结果、或 `cordis_run` 后 `nextPackageId` 仍停在 `awaiting` → 结束本轮再等回报,或 `cordis_inspect_self` 查诊断;
2. **工具报“输出不是 JSON”:** 工作目录不是方法论仓库根,或 `meta/integrations/gateway.py` 不存在——工具参数 `repo` 可显式给仓库绝对路径重试。

## 四、更新、回滚、停止、删除

Cordis 的三层身份:`pluginId`(稳定实例)/ `packageId`(不可变代码版本)/ `pluginRunId`(每次激活)。

| 现状 | 目标 | 做法 |
|---|---|---|
| 无 current | 任意 Package | `cordis_run` `mode: "run"` |
| 有 current | 同一 Package | `mode: "run"`(重启) |
| 有 current | 不同 Package | `mode: "update"` |
| update 失败 | `nextPackageId` | `mode: "update"` 重试 |
| update 失败 | `currentPackageId` | `mode: "run"` 回滚 |

改代码的正确姿势:用 `build_payload.py --existing <pluginId>` 生成**追加** Package 的 payload → `cordis_define` → `cordis_run mode:"update"`。**不要覆盖已失败的 Package**;`cordis_stop` 是临时停用(保留 Package 与授权),`cordis_undefine` 才是永久删除。

## 五、排障

| 现象 | 先查 |
|---|---|
| `host.call` / 工具报 `service "…" is not declared` | 本包 `inject: ['shell']` 是否声明;Host 装配里是否有 `shell` 提供者(`bash-sandbox` / `bash-local` 提供 `ctx.shell`) |
| `define` 报 schema 不支持 | 只用 DSH 受支持子集:`parameters` 用 object 根 + **根 required 数组**(raw 模式**属性级 `required` 会被拒**);`output.schema` 的 object 节点必须显式 `additionalProperties`,必填写成**属性级** `required: true` |
| Client 解析失败 | 两半都是纯 JS 函数体:无 JSX / TS / `import`;建元素用 `React.createElement` |
| 工具报"输出不是 JSON" | 先看报错里 **仓库根解析为 …(候选: …)** 那一段:解析结果不对,或该目录下没有 `meta/integrations/gateway.py`。工具参数 `repo` 可显式指定仓库根、跳过解析 |
| 工具报 `uv … Project directory 'meta/scripts' does not exist` | **旧版症状**:适配壳依赖 shell 的隐式 cwd。当前版本已改为显式解析仓库根;若再现,说明候选(shell 默认 workdir + `workspaceRegistry` 工作区)里都没有仓库根 —— 用 `repo` 显式指定 |
| `command not found: uv` / uv 缓存只读 | 适配壳已把 `UV_*` 指到 `$PWD/.uv-cache`;若仓库未 `uv sync` 过,先跑一次 `uv run --project meta/scripts python meta/scripts/check.py <target>` |
| 面板空白但工具正常 | 该 UI 只在**最新一次 eligible `cordis_run` 卡片**里渲染;查 `cordis_inspect_self` 的 client-render 诊断。`key` 必须是 `'self'`,不要写 `pluginRunId` |
| Windows | 本版 Host 半用的是 POSIX shell 片段(`[ -x … ]`、`export A=B`)。win32 上 DSH 走 pwsh,需要改写 `RUNNER` 一行——见 `methodology.host.js` 顶部注释 |

## 六、契约自检(不需要启动 DSH)

```bash
node meta/integrations/dsh/tests/verify-adapter.mjs          # 84 项断言(快)
node meta/integrations/dsh/tests/verify-adapter.mjs --full    # 追加真实 bench/gate 信封
```

它用 **DSH 自带的真实校验器**(`@deepseek-ai/dsh-tools` 的 `parameterSchemaSpecToJsonSchema` / `valueSchemaSpecToJsonSchema` / `assertSupportedJsonSchema` / `validateJsonSchemaValue`)钉住五件事:

1. 两半能按真实规则求值 —— host:`node:vm` realm + `(async () => { <body> })()`(与 `precheckCode`/`evaluateHostCode` 同构);client:真实闭包符号表;
2. 每个工具的参数与输出 schema 属 DSH 受支持子集;
3. 用 **真实 `gateway.py` 产出的信封**跑 `execute`,返回值过 `output.schema`;
4. 包内 RPC、keyed slot 注册协议、组件可渲染;
5. **仓库根解析回归**:假 shell 建模"默认 cwd 可能不是仓库根"(按命令里实际写出的候选列表作答),用例把默认 cwd 设成不存在的目录后,仍须解析出仓库根、仍须把 `workdir` 钉在解析结果上、且探测只走一次往返;显式 `repo` 则跳过探测。

> 这也是本适配的**回归锚**:DSH 升级后先跑它,再谈接线。

---

## 五之二、仓库根解析(为什么适配壳不信任工作目录)

**实测事实**:动态包的 `shell.run` 若不显式给 `workdir`,拿到的是 **shell 实现自己的默认工作目录**,它**不保证**等于会话工作区。旧版适配壳把"当前目录就是仓库根"当前提,在 DSH 里直接失败:

```
methodology gateway 输出不是 JSON(exit 2)
stderr: error: Project directory `meta/scripts` does not exist
```

`uv` 是在错误的 cwd 下找 `meta/scripts` 才报的这句——**网关一次都没跑起来**。这个故障在仓库内自检里看不见(假 shell 对任何命令都回放同一个信封),在终端里也看不见(人已经 `cd` 到仓库根了),只有真机动态装载才暴露。

现在的解析顺序与纪律:

1. 工具参数 `repo`(显式指定,优先级最高,**跳过探测**);
2. `shell.resolve({command:'true'})` 暴露的默认 `workdir`;
3. `workspaceRegistry` 里已注册的工作区路径(可选依赖,缺席即跳过;只取 `path` 这个标量字段)。

候选去重后,用**一次** shell 往返逐个做 `[ -f <cand>/meta/integrations/gateway.py ]`,命中者即仓库根;随后每次执行都把 `workdir` 与 `cd` 一起钉死在该根上。解析失败时抛出的错误会列出全部候选,并提示用 `repo` 显式指定——而不是把 `uv` 的原始报错丢给使用者。`methodology_status` 返回的 `root` 字段就是本次解析结果,可用来一眼确认没跑错目录。

## 七、常驻化(下一步,本轮未交付)

动态插件的代价是**会话级、进程内**——每次新会话都要重新 define/run(虽然 agent 可以按上面三步自主完成)。要让适配壳**随进程启动即装载、全会话可见**,DSH 的机制是 **profile bundle**:

```jsonc
// package.json(示意,未交付)
{ "name": "dsh-methodology-adapter", "type": "module", "main": "lib/index.js",
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } } }
```
```yaml
# cordis.patch.yml(示意,未交付)
- insert:
    - id: methodology-adapter
      name: 'dsh-methodology-adapter'
```
```bash
dsh plugin --profile <name> add <spec>     # 依赖里声明了 dsh.bundle 的包会自动加入 layer stack
```

**为什么本轮不交付:** 常驻 bundle 需要 (a) 一个脱离沙箱的 Node 入口(不能复用沙箱里的 `harness.registerTool` 形态)、(b) 装进真实 profile 后真机验证,(c) 一段无法在仓库内自证的浏览器半装配。在无法端到端验证的前提下交付一份**平行的第二实现**,会立刻产生与 `dynamic/` 漂移的双份真相,违反本仓库的奥卡姆与 add-only 纪律。因此本轮先把**唯一的、可验证的**实现(动态壳 + 网关 + 技能)做扎实,把常驻化记录为下一步(见 OpenSpec change 的 tasks)。

若你希望现在就走常驻路线,建议的顺序是:先在 profile 里装一个**只有 Host 半、无 UI** 的最小 bundle(工具能力先落地),验证 `ctx.tools.register` 与 `ctx.shell` 在真实装配下可用;再把 `snapshot/judge/gate` 三个 RPC 与卡片 UI 作为第二个包补上。
