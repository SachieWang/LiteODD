---
name: methodology-gate
description: 方法论闸门技能——在"判定一条复盘候选能否吸收"或"改动 meta 后要回归"时,用集成适配层的 methodology_* 工具(或等价的 gateway CLI)跑确定性闸门(check/bench/judge),按结构化条件决定是否发起方法论 change。当用户要判定候选、跑基准回归、吸收改进,或在改进本方法论之前需要过闸门时使用。
metadata:
  author: methodology-integrations
  version: "1.0"
  realm: integration
---

# 方法论闸门技能 (Methodology Gate)

本技能把"多步人工触发"收成一条确定性链路:**状态 → 回归 → 判定 →(只在通过时)发起 change**。

> **红线:本技能不决定"能不能吸收"。** 那由 core 的 `judge.py` / `bench.py` 定义;壳(DSH 插件 / CLI)只负责**正确触发**并**如实转述**。任何"我觉得应该过"都不是通过。

> 源在本目录;DSH 消费副本在 `/.agents/skills/methodology-gate/SKILL.md`(DSH 的技能根之一是项目内 `.agents/skills/`)。改动只改源,副本随源同步。

## 触发条件 Trigger

- 有一条复盘候选(`meta/evolution/retro/*.yaml`)要判定能否吸收;或
- 改动 `meta/`(frame / metaschema / skill / gate / method)之后,要确认没把基准跑退化;或
- 用户说"跑闸门 / 判定候选 / 基准回归 / 能不能吸收这个改进"。

## 输入 Schema Input

- `target` : 目标项目目录(相对仓库根,如 `targets/dsh`)。**必填**——方法学工具不内嵌默认目标。
- `candidate` : 候选 YAML 路径(相对仓库根),判定时必填。
- `repo` : 方法论仓库根(绝对路径)。省略则用当前工作目录——**必须在仓库根下执行**。

## 步骤 Steps

1. **先看快照(感知面)**:调用 `methodology_status`(无参即可)。它一次给出 frame 版本与概念/关系类型、元模型清单、编排阶段、五类吸收目标、当前候选及其自述字段、目标清单,以及**唯一权威闸门命令**。
   > 适配层工具不可用时(例如当前会话没有装载 DSH 适配插件),退回 CLI,纪律完全一样:
   > `uv run --project meta/scripts python meta/integrations/gateway.py snapshot --target <target>`

2. **判定单条候选**:`methodology_judge(candidate, target?)`。读它返回的**三个结构化条件**:
   - `judgeRecord` —— ① 已记录为版本化的方法论 change;
   - `judgeBench` —— ② 基准回归通过;
   - `judgeAddOnly` —— ③ add-only 兼容。
   `judgeVerdict == "ACCEPT"` **只表示准入门通过**,不等于已经吸收。

3. **跑全链回归**:`methodology_gate(target, candidate?)`。它内部依次跑 `bench.py`(含 `check.py` + `engine.py`)与(给了候选时的)`judge.py`。`steps[].ok` 全部为 true 才算通过。

4. **只在全部通过时,发起一条方法论 change**(OpenSpec `openspec/changes/<id>/`),按 **meta-only + add-only** 纪律落地:新增可选字段 / 新注册项 / 新类型,不删不改语义;bump 受影响契约版本;把本次闸门输出写进 change 的证据/任务记录。**吸收不在壳里,也不在网关里。**

5. **失败即整改清单**(点名即清单,不要猜):
   - `judgeRecord` 失败 → 先补一条**真实存在**的版本化 change 记录,再重判;
   - `judgeBench` 失败 → 先修 meta,重跑 `methodology_gate`;
   - `judgeAddOnly` 失败 → 把破坏性改动改写成**新增可选**(破坏性变更走"新版本并存",不覆盖旧行为)。

6. **留痕**:把闸门结论(candidate id、三条件、bench 明细)作为 `evidence` 写回候选或 change,保证吸收可审计、可回退。

## 输出 Schema Output

- 人类可读摘要:每个工具的 `summary` 字段(渲染即模型可见内容)。
- 机器可读:工具返回值本身就是结构化 JSON(`ok` / `verdict` / `exitCode` / `steps[]` / `judgeRecord|Bench|AddOnly` / `notes[]`),可直接用于自动决定"是否 open change"。
- CLI 等价物:`gateway.py` 的 stdout 是单一 JSON 信封,契约见 `meta/integrations/schemas/verdict.schema.json`。

## 质量门 Quality Gate

- `bench.py` 必须 PASS(它内含 Layer 0 `check.py` 与 Layer 2 `engine.py`);
- `judge.py` 必须 ACCEPT;
- 吸收必须 add-only 且 meta-only;
- **绝不修改任何 `targets/<proj>/` 对象层产物**(目标项目只是喂料源)。

## 边界 Boundaries

- 壳不是裁决者:工具只搬运 core 的 exit code 与条件行;不要用自然语言重述去覆盖它。
- 网关不是吸收者:`gateway.py` 不写 meta、不碰对象层。
- 不因工具缺失而降低纪律:CLI 三步(`snapshot` → `bench` → `judge`)与工具调用等价。
- 不在同一轮里既判定又宣称吸收成功——change 流程可能触发人工审批(三态:approve / reject / hold)。
