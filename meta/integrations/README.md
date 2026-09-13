# /meta/integrations — 集成适配层 (Integration Adapter Layer)

本目录是**外挂层**,不属于五层方法论本身。五层(Layer 0–4)定义"方法论是什么";本层只回答**"如何把它接进一个具体 agent 工具,并把人工触发降到最低"**,且**不改变**五层的任何契约。

> 一句话:**核心保持自持与 harness 无关,自动化的复杂度全部隔离在本层。**

---

## 一、为什么需要这一层(痛点)

Layer 0–4 落地后,体系是**自持、过程驱动**的:校验、回归、裁决各自是独立 Python 脚本,靠人记得跑。

| 现状 | 在成熟 agent 工具(DSH / Claude Code / Codex / OpenCode)里的后果 |
|---|---|
| `check.py` / `bench.py` / `judge.py` 三条命令 | 每次都要人手动敲;漏跑就没有门 |
| 输出是**人读文本** + exit code | agent 无法程序化反应(不能自动决定"要不要 open change") |
| 契约散在 `retro.md` / `frame.yaml` / `metaschema/` | 每轮都要手动翻文档才能写对候选 |
| 吸收要"发起 change" | 与工具链脱节,容易变成口头约定 |

本层的目标:把这些**转成事件驱动 + 自动触发 + 机器可读回传**,让人从"触发者"降级为"审批例外者"。

## 二、三条红线(与核心解耦)

1. **不复制裁决语义。** 网关与适配壳**只搬运**:它们 subprocess 调 core 的 `check.py` / `bench.py` / `judge.py`,以 **exit code 为唯一权威判决**,把 judge 打印的条件行原样结构化。本层里**没有任何一条**"吸收是否合规"的判断逻辑——否则裁决语义会被复制、进而分叉。
2. **不就地吸收。** 本层不写 meta、不碰对象层。吸收仍等于**发起一条版本化的方法论 change**(Layer 3 纪律)。网关与插件只提供"准入门"。
3. **不改核心契约。** `frame.yaml` / `metaschema/*` / `skills/*` / `engine/*` / `evolution/*` / `scripts/check.py` 保持原样;本层是**只读消费者 + 传输壳**。harness 换代只改本层。

## 三、结构(本层内容)

```
meta/integrations/
├─ README.md                     # 本文件:适配层设计与边界
├─ gateway.py                    # 单一网关(harness 无关):check/bench/judge/snapshot → 统一 JSON
├─ schemas/
│   └─ verdict.schema.json       # 网关输出信封的机器可读契约(版本化)
└─ dsh/                          # DSH 适配(消费端之一;换 harness 只需再加一个同级目录)
    ├─ README.md                 # 接入步骤、工具清单、排障
    ├─ dynamic/                  # Cordis 动态插件(会话内零安装)
    │   ├─ methodology.host.js   #   Host 半:5 个模型工具 + 包内 RPC
    │   ├─ methodology.client.js #   Client 半:Cordis Run 卡片里的判决面板
    │   └─ build_payload.py      #   把两半拼成 cordis_define 的合法入参
    ├─ skills/                   # DSH 技能源(触发面)
    │   ├─ methodology-gate/SKILL.md
    │   └─ methodology-capture-retro/SKILL.md
    └─ tests/
        └─ verify-adapter.mjs    # 用 DSH 自带校验器钉住宿主契约(84 项断言)
```

**技能副本规则**(与 Layer 1 同构):源在 `meta/integrations/dsh/skills/<name>/SKILL.md`,DSH 消费副本在项目根的 `.agents/skills/<name>/SKILL.md`(DSH 的技能发现根)。改源后同步副本。

## 四、六个作用面 → 本层落点

对照"集成适配层扩展讨论"里的六类设计,逐条落到具体产物:

| 面 | 要解决的问题 | 本层落点 | 状态 |
|---|---|---|---|
| **A 触发面** | agent 不知道"何时该喊脚本" | `.agents/skills/methodology-gate`、`methodology-capture-retro`(DSH 会话目录即生效) | ✅ 已交付并实测被 DSH 收录 |
| **B 调用面** | 闸门不可程序化调用 | `dynamic/methodology.host.js` 注册 5 个模型工具;`gateway.py` 统一 JSON | ✅ 已交付 + 契约自检 |
| **C 事件面** | 靠人主动触发 | `gateway.py` 作为**唯一事件入口**(一条命令 = 一条流水线),供 git hook / CI / 文件监听直接调用 | ✅ 入口已交付;hook/CI 由使用者按需接(见下方"种子集"注意) |
| **D 吸收面** | 人的角色是"每次触发" | 判定降级为**一次工具调用**;吸收仍走 change + 三态审批(approve/reject/hold),人只在异常时介入 | ✅ 判定侧已交付;审批接线属 Layer 2 既有能力 |
| **E 感知面** | 每轮手动翻契约文档 | `methodology_status`(契约快照:frame/元模型/阶段/吸收目标/候选/目标/权威命令) | ✅ 已交付 |
| **F 总控面** | 多步人工触发冗杂 | `gateway.py gate`:一条命令跑完 bench(+judge);所有 harness 壳都只指向它 | ✅ 已交付 |

## 五、输出契约(唯一机器可读面)

`gateway.py` 的 **stdout 恰好是一个 JSON 信封**,stderr 是人读日志,退出码:

| exit | 含义 |
|---|---|
| `0` | 所有步骤通过 |
| `1` | 有步骤未通过(判决失败,**不是**工具故障) |
| `2` | 用法/基础设施错误(缺文件、网络、超时等;信封 `error` 非空) |

信封契约(版本化,可被 `jsonschema` 校验):`meta/integrations/schemas/verdict.schema.json`。

```json
{
  "gateway": { "schemaVersion": "1.0", "command": "gate", "verdict": "pass", "exitCode": 0, "at": "…" },
  "target": "targets/dsh", "candidate": "meta/evolution/retro/accept-example.yaml",
  "steps": [{ "name": "bench.py", "ok": true, "exitCode": 0, "summary": "[bench] PASS", "detail": "…" }],
  "judge": {
    "id": "accept-…", "verdict": "ACCEPT",
    "conditions": { "record": "pass", "bench": "pass", "addonly": "pass" },
    "notes": ["ok[1] …"], "verdictLine": "[judge] ACCEPT (可发起方法论 change 吸收)"
  },
  "snapshot": null, "error": null
}
```

**统一语义:领域性失败不是工具错误。** judge `REJECT` / bench `FAIL` 都以**成功的工具调用**返回(`ok=false`),让 agent 拿到结构化失败条件去整改;只有 exit 2(网关自身故障)才抛错。这与 DSH `defineTool` 的契约一致("represent a successful domain outcome in the canonical value even when its Native renderer explains a non-ideal state")。

## 六、命令参考

```bash
# 统一环境(沙箱内 ~/.cache/uv 常只读,仓库内缓存可写)
export UV_CACHE_DIR="$PWD/.uv-cache" UV_PYTHON_INSTALL_DIR="$PWD/.uv-python"

uv run --project meta/scripts python meta/integrations/gateway.py snapshot [--target T]
uv run --project meta/scripts python meta/integrations/gateway.py check    --target T
uv run --project meta/scripts python meta/integrations/gateway.py bench    --target T
uv run --project meta/scripts python meta/integrations/gateway.py judge    --candidate C [--target T]
uv run --project meta/scripts python meta/integrations/gateway.py gate     --target T [--candidate C]
```

`gateway.py` 会给子进程设好 `UV_*` 缓存,所以**只需**为网关自身指定一次;这也顺带修好了 `judge.py` 在 `bench_status=auto` 时实跑 bench 的缓存问题(它自己不设 uv 环境)。

## 七、验证(本层的回归)

```bash
# 1) 网关信封:self-test(顶层 JSON 契约)
uv run --project meta/scripts python -c "import json,subprocess;print(json.loads(subprocess.run(['python','meta/integrations/gateway.py','snapshot'],capture_output=True,text=True).stdout)['gateway'])"

# 2) DSH 适配壳契约:用 DSH 自带校验器把宿主契约钉成断言
node meta/integrations/dsh/tests/verify-adapter.mjs          # 快
node meta/integrations/dsh/tests/verify-adapter.mjs --full    # 追加真实 bench/gate
```

`verify-adapter.mjs` 覆盖:两半能否按真实规则求值(host 用 `node:vm` + `(async () => {…})()` 包裹,client 用真实闭包符号表)、参数 DSL 与 `output.schema` 是否属 DSH 受支持子集、用**真实 gateway 信封**跑 `execute` 且值过 schema、包内 RPC、slot 注册协议、组件可渲染,以及**仓库根解析回归**(默认 cwd 不是仓库根时仍须解析出根,并把 `workdir` 钉死在解析结果上)。

## 八、非目标(刻意的)

- **不引入**数据库 / 消息队列 / 常驻守护进程:奥卡姆 + K.I.S.S.,一个网关 + 一个 JSON 契约足够。
- **不把 core 改造成 harness 插件**:核心永远可以被 `git clone` + `uv run` 独立使用。
- **不让壳参与裁决**:任何"壳自己算一遍条件"的实现都是对本层的破坏。
- **不做跨 harness 提炼**:不同 harness 的适配各自独立(本层只共享 `gateway.py` 与信封契约),避免"抽象出来的适配框架"变成新的维护负担。

## 九、事件面接线前必须先解决的一件事(种子集)

`bench.py` 的回归需要**目标(种子集)**,而本仓库的实践产物目录 `targets/` 被 `.gitignore` 刻意忽略(实践产物不入版本库)。因此:

- **本地事件可用**:pre-commit / 会话结束钩子 / 手动一条命令——本地有 `targets/<proj>` 就能跑。
- **CI 事件当前跑不起来**:CI 检出的是版本库内容,没有 `targets/<proj>` → `bench.py` 无种子可用。要让 CI 成为门,先要决定"种子集从哪来"(单独一个只含最小种子的仓库/子模块,或让 CI 从工件仓拉取)。
- 这不是适配层的缺陷,而是**种子集版本化策略**尚未决定的直接结果;在决定之前,任何"接 CI 就自动回归"的说法都是不成立的。故本轮只交付入口,不交付 CI 文件(见 change 的 tasks 6.2)。
