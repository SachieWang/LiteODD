---
name: methodology-capture-retro
description: 方法论复盘捕获技能——把一次实践复盘(有效/失效的做法、审计证据)按 retro.md 的字段契约写成一条候选 YAML(对象层 targets/<project>/evolution/retro/<id>.yaml),再交给 methodology-gate 判定。当用户想沉淀经验、把实践反馈喂回方法论、或说"记一条复盘/提一个改进候选"时使用。
metadata:
  author: methodology-integrations
  version: "1.0"
  realm: integration
---

# 方法论复盘捕获技能 (Capture Retro)

本技能把**模糊的复盘**改写成**judge 能直接消费的结构化候选**。它不是"记录感想",而是执行一份**捕获契约**:字段与裁决条件同构,所以捕获端(LLM/人)与裁决端(`judge.py`)之间**不需要自然语言翻译**,也没有二次解释的漂移空间。

> **红线:捕获只是提议。** 写候选不改变任何 meta;能否吸收由 `judge.py` 三条件 + `bench.py` 回归裁定。

> 源在本目录;DSH 消费副本在 `/.agents/skills/methodology-capture-retro/SKILL.md`。

## 触发条件 Trigger

- 一次实践结束,浮现了"某种做法有效/失效"的一般性结论,想让方法论吸收;或
- 用户说"记一条复盘 / 沉淀一条反模式 / 提一个方法论改进候选";或
- 目标项目里出现了**通用**模式(不是项目专属细节),需要回馈到元层。

## 输入 Schema Input

- `signal` : 什么做法有效或失效(一句话主张,不是情绪)。
- `evidence` : 证据锚点——最好是 Layer 2 审计轨迹 `run-*.jsonl`,或目标项目产物引用。**拒绝"我觉得"**。
- `target` : 吸收目标,五选一 `frame | metaschema | skill | gate | method`。
- `changerecord` : 已版本化的方法论 change 记录路径(**必须真实存在**)。
- `version_bump` : 受影响契约的版本标记,如 `frame 1.0 -> 1.1`。
- `bench_status` : `pass | fail | auto`。用 `auto` 时**必须同时提供 `--target`**,否则 judge 条件②无法判定。
- `addonly` : `true | false`。吸收只允许新增兼容。

字段契约全文见 `meta/evolution/retro.md`。

## 步骤 Steps

1. **读契约**:打开 `meta/evolution/retro.md`(字段与五类 target 的权威说明),不要凭记忆填。
2. **逼出可验证的复盘**:逐字段自问——
   `id` 是谁?`signal` 主张什么?`evidence` 钉在哪条客观记录上?`target` 落在哪类 meta 契约上?
3. **先有 change,再有候选**:`changerecord` 指向一个**真实存在**的版本化 change 目录。没有它,候选必然在条件①被拒——这正是设计意图(捕获阶段就带版本化意识)。
4. **判定 add-only**:这次改动是"新增可选字段 / 新注册项 / 新类型",还是"删/改必填/静默改语义"?后者把 `addonly` 填 `false`,并预期被拒;正确的做法是改写为新增兼容,或走"新版本并存"。
5. **落盘**:写到**对象层** `targets/<project>/evolution/retro/<id>.yaml`,结构以顶层 `candidate:` 开头。
   > **不写 meta**:`meta/evolution/retro/` 只放模板与通用示例(`accept-example` / `reject-example`);**目标专属实践记录一律进对象层**——见 `meta/evolution/README.md` 的「实践记录放哪」与 `object-realm-contract`。
6. **交闸门判定**:调用 `methodology-gate` 技能(或 `gateway.py judge --candidate <path> [--target T]`)。判定 ACCEPT 后,吸收 = 发起/落地那条方法论 change。

## 输出 Schema Output

一份候选 YAML(写入**对象层** `targets/<project>/evolution/retro/<id>.yaml`):

```yaml
candidate:
  id: <候选 id>
  signal: <有效性/失效性主张>
  evidence: <审计轨迹或产物引用>
  target: <frame | metaschema | skill | gate | method>
  changerecord: <真实存在的 change 记录路径>
  version_bump: <如 frame 1.0 -> 1.1>
  bench_status: <pass | fail | auto>
  addonly: <true | false>
```

## 质量门 Quality Gate

- 七个字段齐全;`target` 是五选一封闭枚举;
- `changerecord` 指向**存在**的目录(不是占位符);
- `evidence` 指向可检验的实体(审计轨迹/产物),不是断言;
- 落盘位置正确(**对象层** `targets/<project>/evolution/retro/`),且**未触碰任何 meta 契约**;目标的 `artifacts/` 产物同样不得改动(复盘记录是新增的实践记录,不是 artifact);
- 不自行宣告"吸收完成"——吸收由 change 流程决定。

## 边界 Boundaries

- 捕获不写 meta:本技能只产出一份候选 YAML。
- 项目专属细节**不进**元层:`target` 只指向通用类型/可选字段/技能步骤/闸门/方法,不指向某个项目的业务词。
- 候选数量不是进度:宁少而真,不求多。
