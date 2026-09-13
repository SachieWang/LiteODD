## Context

Layer 3 的收敛裁判 `judge.py` 与基准回归 `bench.py` 是**确定性裁决者**,但它们的接口是 CLI + 人读文本;Layer 2 的 `approval_policies.py` 已有三态审批与 `policy` 提供者钩子。缺的不是"能接的钩子",而是一层把**触发 / 调用 / 回传**自动化、同时**不污染裁决语义**的适配层。

DSH 侧的可用机制(本轮经代码图谱与源码核实):

- Cordis 动态插件:Host 半跑在 `node:vm` 沙箱(全局仅 `ctx`/`harness`/`console`/`btoa`/`atob`/`TextEncoder`/`TextDecoder`;`process`/`Buffer`/`fetch`/定时器被陷阱替换,并给出 Cordis 替代指引);
- `harness.defineTool` + `harness.registerTool(ctx, tool)` 注册模型可见工具;`harness.handle` ↔ `host.call` 为包内私有 JSON RPC;
- 沙箱 `ctx` 白名单:生命周期动词 + **已 inject 声明**的服务;`ctx.get(name)` 可做可选查找;
- 服务缝:`ctx.shell`(`ShellExecutor.resolve/run`,`ShellRunResult.stdout/stderr` 为 `CollectedOutput`);
- 动态插件属**当前 Session、进程内**;`cordis` 工具集是 opt-in preset;技能根含 `<workspace>/.agents/skills/`。

## Goals / Non-Goals

**Goals**

1. 一条命令跑完全链(check → bench → judge),输出**一个**机器可读 JSON 信封。
2. 让 agent 在会话内**自主**触发闸门(工具 + 技能),不需要人回终端敲脚本。
3. 跨 harness 复用同一个入口与契约(`gateway.py` + 信封 schema)。
4. 把宿主契约(沙箱、DSL、schema 子集、slot 协议)钉成**可回归断言**,而不是靠记忆。

**Non-Goals**

- 不把裁决逻辑搬进网关或插件;
- 不引入数据库 / 守护进程 / 图存储;
- 不改 core 五层的任何契约;
- 不做"通用适配框架"抽象(各 harness 各自独立,只共享网关与信封);
- 本轮不做常驻 bundle(见 Decisions)。

## Decisions

### D1. 网关只搬运、不裁决(`exit code` 是唯一权威)

网关 `subprocess` 调 core 脚本,取 `returncode` 作判决,并把 judge 自己打印的 `ok[N]`/`FAIL[N]` 行解析成 `conditions{record,bench,addonly}`。

- **为什么:** 一旦网关自己实现三条条件,裁决语义就有两份真相;Layer 3 的"LLM 提议 · 引擎裁决"会退化成"壳裁决"。
- **代价:** 信封结构依赖 judge 的输出**格式**。缓解:解析失败时条件降级为 `unknown`,而 `verdict`/`exitCode` 仍来自 exit code —— 判决永不依赖解析。若将来需要更强的结构化,应在 `judge.py` 加 `--json`(add-only),而非在壳里重算。

### D2. 领域性失败 = 成功的工具调用

judge `REJECT` / bench `FAIL` 返回 `ok=false` 的结构化值,不抛错;只有 exit 2(网关自身故障)才抛错。

- **为什么:** DSH `defineTool` 的契约明确要求"成功的领域结果放进 canonical value,即便 Native renderer 解释一个不理想状态(如非零进程退出)"。抛错会让 agent 失去三条件整改清单。

### D3. 适配壳是"薄传输层",一份实现

Host 半只做:拼命令(`venv python` 优先,回落 `uv run`,并把 `UV_*` 指到 `$PWD/.uv-cache`)、调 `ctx.shell`、把信封映射成固定形状、注册工具与 RPC。没有任何规则判断。

- **为什么:** 薄壳换 harness 成本最低;也正是"核心自持"得以保留的原因。
- **venv 优先的原因:** 免 uv 启动与只读缓存问题;回落保证新克隆可用。

### D4. 用 DSH 自带校验器做宿主契约回归

`tests/verify-adapter.mjs` 加载 DSH 安装里的 `@deepseek-ai/dsh-tools`,用 `parameterSchemaSpecToJsonSchema` / `valueSchemaSpecToJsonSchema` / `assertSupportedJsonSchema` / `validateJsonSchemaValue` 验证;host 半在 `node:vm` + `(async () => { <body> })()` 里求值(与 `precheckCode`/`evaluateHostCode` 同构)。

- **为什么:** 沙箱、DSL、schema 子集都是**外部契约**,写错只会在 DSH 里以 guard rejection 出现。本轮即由它抓出两个真 bug:`parameters` raw 模式**不允许属性级 `required`**;`output.schema` 的 object 节点**必须显式 `additionalProperties`**、必填只能写成属性级 `required: true`。
- **代价:** 测试依赖 DSH 安装位置(`DSH_PACKAGE_ROOT` 可覆盖),在无 DSH 的环境会 skip 失败并提示。

### D5. 技能源在 `meta/integrations/dsh/skills/`,副本在 `.agents/skills/`

与 Layer 1 的"源/副本"规则同构,但**不放** `meta/skills/`——因为它们是 harness 专有技能,不属于通用的 Layer 1 技能集。

- **为什么:** 守住"Layer 1 技能跨 harness 通用"的语义;同时让副本落在 DSH 真实发现根上,会话目录即生效(本轮已实测被 DSH 收录)。

### D6. 常驻 bundle 留作后续(不在本 change 交付)

DSH 的常驻机制是 profile bundle(`package.json` 的 `dsh.bundle.patch` + `cordis.patch.yml` + `dsh plugin --profile add`)。

- **为什么不现在做:** 常驻化需要脱离沙箱的 Node 入口(不能复用沙箱形态的 `harness.registerTool`)、需要装进真实 profile 真机验证、并且浏览器半的装配在仓库内无法自证。在当前条件下交付第二份平行实现,会立刻产生与 `dynamic/` 漂移的**双份真相**,违反奥卡姆与 add-only 纪律。
- **后续顺序:** 先装一个**只有 Host 半**的最小 bundle(验证 `ctx.tools.register` + `ctx.shell` 在真实装配下可用),再补 RPC 与卡片 UI。

## Risks / Trade-offs

| 风险 | 缓解 |
|---|---|
| 动态插件是会话级:新会话要重新 define/run | 已把 define/run 收敛为 `build_payload.py` + 3 步;技能让 agent 自主完成;常驻化列后续 |
| `cordis` 工具集是 opt-in preset,普通会话没有 `cordis_*` | 技能与文档给出 CLI 等价入口 `gateway.py`,纪律完全一致;不因工具缺失而降低门 |
| 信封依赖 judge 文本格式 | 判决只认 exit code;解析失败降级 `unknown` |
| POSIX-only shell 片段 | 在 host 半与 README 显式标注;win32 需改 `RUNNER` 一行 |
| 沙箱 `ctx` 白名单/服务名变化 | `verify-adapter.mjs` 作为回归锚;`cordis_inspect_query` 先查后写 |
| CI 事件门暂时不成立 | `targets/` 被 git 忽略 → CI 无回归种子。先决定种子集版本化策略(独立最小种子仓/子模块/工件仓),再接 CI;本轮只交付唯一事件入口 `gateway.py` |

## Migration Plan

1. 无破坏性迁移:纯新增目录与文件,core 零改动,`targets/` 零改动。
2. 使用方按需接入:`gateway.py` 可独立用于 CI/git hook;DSH 侧按 `dsh/README.md` 装载。
3. 回退:删除 `/meta/integrations/` 与 `.agents/skills/{methodology-gate,methodology-capture-retro}/` 即完全回退;核心与既有闸门不受影响。

## Open Questions

- 常驻 bundle 的浏览器半装配方式(是否需要独立的 client 包)待真机验证。
- 是否给 core 的 `judge.py` / `bench.py` 加 add-only 的 `--json` 输出,从而让信封完全不依赖文本解析?(当前不需要,列入观察。)
