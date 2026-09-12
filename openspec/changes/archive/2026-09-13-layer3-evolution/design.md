## Context

Layer 0/1/2 已闭环归档(脊柱/技能/确定性编排)。Layer 3 要立起"自进化/新陈代谢":让实践复盘能安全地喂回 meta,且收敛、可版本化、可回退、不破坏。动机见 proposal.md;行为契约见 specs(反馈捕获/收敛裁判/基准回归/meta-only/版本化留痕/add-only)。输入源:Layer 2 审计轨迹(`run-<ts>.jsonl`)+ 目标项目实践。

约束:奥卡姆 + K.I.S.S.;借 Layer 2 的确定性闸门与 add-only 纪律做**收敛**,不引入分布式/复杂推理;与 OpenSpec/任何 harness 解耦。

## Goals / Non-Goals

**Goals:**
- 复盘捕获契约(信号/证据/吸收目标)与候选记录。
- **收敛裁判**(确定性):候选须过 ①记录为方法论 change ②基准回归过 ③add-only 兼容;否则拒绝/延后——防止 prompt 漂移。
- **基准回归**(`bench.py`)复用 Layer 2 引擎闸门 + `check.py` 对种子集(`targets/dsh`)重跑;退化即拦截。
- **meta-only 吸收** + **版本化留痕**(版本标记 + change 记录)+ **add-only 兼容**。

**Non-Goals:**
- 不就地改 meta(吸收=发起一条方法论 change,裁判只当闸门)。
- 不做自动重写/免审吸收(一切吸收都过裁判+版本+回归)。
- 不引入重型调度/分布式;不进目标项目改产物。

## Decisions

1. **吸收走"方法论 change"而非就地改**:裁判只判定候选可否吸收;真正应用=发起一条方法论 change(版本化、可评审、可回退)。这天然满足"吃了自己狗粮 + 可追溯",不破坏既有契约。
2. **收敛裁判 = 确定性三条件**:①候选被记录为已版本化 change;②`bench.py` 对种子集全过;③吸收目标与 add-only 兼容。任一不满足 → 拒绝/延后并给出原因。这样**不是任何复盘都能改方法论**,只有回验+版本+记录的吸收,挡住漂移。
3. **基准回归复用确定性闸门**:`bench.py` 调用 Layer 2 引擎(`engine.py --assume-approval`)与 `check.py` 对 `targets/dsh` 种子集,全过才放行。基准集作为"回归锚",吸收后跑一遍确认不退化。
4. **meta-only 纪律(与 dual-realm 契约一致)**:吸收只进 meta(frame 类型/关系、元模型可选字段、技能步骤、闸门注册、方法反模式);目标项目产物不被改。目标项目只以"浮现通用新类型 → 方法论 change 记录"喂 meta。
5. **版本化留痕 + add-only**:每次吸收 bump 受影响契约版本(`frame.schemaVersion`/skill 版本/gate 集版本/engine DAG schemaVersion)并留 change 记录;吸收永远新增(可选字段/注册项/类型),不删、不把可选变必填、语义变更开新版本并存。与 Layer 2 纪律统一,保证进化增量、可回退、不破坏。

## 执行模型

```
  Layer 2 审计/目标项目实践
        │
        v
  retro.md 复盘记录(信号/证据/吸收目标)      ← 捕获
        │ candidate
        v
  judge.py 收敛裁判(确定性)
    ① record? 已版本化 change        ──否──▶ reject/defer(带原因)
    ② bench.py 基准回归(种子集全过)   ──否──▶ block(退化)
    ③ add-only 兼容                  ──否──▶ reject(破坏性)
        │ 全过
        v
  吸收 = 发起一条方法论 change(版本 bump + meta-only 应用)
        │
        v
  frame / metaschema / skill / gate / method  ← meta-only 吸收目标
  留痕:版本更新 + change 记录 + 引用 bench 结果(可回退/可审计)
```

确定性边界:**收录的"是否吸收"由 judge 三条件 + bench 得分确定性裁决;LLM 只在捕获(写复盘/提炼候选)里做生产,不裁决吸收。** 这与 Layer 2 的"LLM 提议、引擎裁决"一脉相承。

## Risks / Trade-offs

- [吸收被过度/过懒判断] → 三条件明确 + 基准回归给量化锚;标准统一后不因主观左右。
- [基准集太小,挡不住漂移] → 种子集随实践扩增(仍是 add-only),并随吸收 re-run;必要再扩基准。
- [meta 版本被随意 bump] → bump 必须伴随方法论 change 记录(judge 条件①强制),杜绝无记录变版本。
- [吸收未真正应用就 declare 吸收] → 吸收以 change 落地为准;judge 只判准入门,应用=change 实施,二者分离。

## Migration Plan

1. 目录:`/meta/evolution/{retro.md, judge.py, bench.py, README.md, retro/}`。2. 种子集:`targets/dsh`(已有 6 件 artifact + 13 实例)。3. 演示:写一条接受候选、一条拒绝候选,跑 judge 对照。4. 回滚:纯文本 + git。

## Resolved Decisions (自讨论定稿)

- **收敛裁判三条件**:记录/版本化 change + 基准回归全过 + add-only 兼容;否则拒绝或延后。
- **吸收走方法论 change**(不就地改 meta;裁判当闸门、应用由 change 实施)。
- **meta-only + add-only + 版本化留痕** 与 Layer 2 纪律统一,保证进化增量、可回退、不破坏。
