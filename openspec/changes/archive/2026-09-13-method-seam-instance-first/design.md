## Context

Layer 3 反馈环捕获了候选 `takeaway-round2-new-seam-domain-reflect`(`target: method`),但从未给它一条版本化 change 记录,于是 `judge.py` 条件①永久 `fail`。动机见 proposal.md;行为要求见 delta spec。约束:确定性(LLM 不裁决)、meta-only、add-only、KISS、与 OpenSpec/harness 解耦。

这是 Layer 3 的一次**真实吸收**(target: method),按纪律走方法论 change 流程:先记录 → 过回归 → add-only,才谈吸收。

## Goals / Non-Goals

**Goals:**
- 把"新概念先实例化后引用"这条实践规则沉淀进**既有**方法库落点,使其对后续所有目标的产出可复用。
- 让该候选的 `record` 条件由 `fail` 翻为 `pass`,使 `judge` 从 `REJECT/DEFER` 变为 `ACCEPT` —— 这是本次吸收**可机器判定的验收标准**。
- 明确与"标注不确定性"的边界,避免两条要求语义重叠。

**Non-Goals:**
- **不新建 `meta/method/` 或任何独立方法库**:Layer 1 已明确决定"不单独成库,并入技能正文"(`2026-09-09-layer1-skills/design.md` 第 17/43 行),本 change 遵守该决定。
- 不新增确定性闸门规则:本规则是**生产侧约定**,不是可判定的门;真正的门(`conceptRef` 必须可解析)已由 `check.py` 与 `concept_ref` 规则存在。
- 不改任何目标项目产物(`targets/` 只回写我们自己那条实践记录的引用字段)。
- 不改 frame、不改四份 schema、不改引擎/编排/审批语义。

## Decisions

1. **落点 = `requirement-understanding/SKILL.md` 的『方法库/反模式』节,不新建库。**
   依据:`2026-09-09-methodology-layer0/design.md` 把方法库移交 Layer 1;`2026-09-09-layer1-skills/design.md` 决定"并入各技能质量门/风险提示正文,保持轻……暂不独立成库"。三份技能各自已有 `> 方法库/反模式:` 行,本规则就是给该行**加一条**。

2. **选 `requirement-understanding` 而非 `domain-modeling`。**
   规则的**触发时刻**是"写下一条会引入新概念的需求"时;`domain-modeling` 看到的是症状(模型落后)。把约定放在触发点,生产者才会在正确的步骤上执行它。`domain-modeling` 的既有条目"实体无锚定→概念游离"已覆盖症状侧,无需重复。

3. **只新增一条要求 + 一行提示,不改既有要求语义。**
   既有 `Ontology-first term alignment` 要求"产出前把术语映射到可解析 conceptRef";本规则补齐它未言明的情形——**当映射目标不存在时该怎么办**。二者是补充关系,不是替换。

4. **边界显式写进要求与提示。**
   既有 `Uncertainty flagged explicitly` 要求含糊输入标注不确定性。二者若不加区分会互相吞并(遇新概念一律"标待定"就绕过了本规则)。故在要求里写明:**含糊/矛盾 → 标注;明确但未登记 → 先实例化**。

5. **验收用 judge 翻转,而不是自述通过。**
   候选三条件中 `bench`/`addonly` 已 pass,唯一缺口是 `record`;因此验收标准是重跑 `judge.py` 得到 `ACCEPT`(exit 0),外加 `bench.py` 回归 `PASS`。这符合"壳与人不裁决、只看 core 的 exit code"的纪律。

## Risks / Trade-offs

- [规则被误读为"遇不明白就先建实例"] → 在要求、技能正文两处同时写明边界(含糊 vs 未登记);`Uncertainty flagged explicitly` 要求保持不变。
- [新增要求与既有要求语义重叠] → 明确写成"对既有 Ontology-first 要求的补充分支",并在 design 记录该关系。
- [`.agents` 副本漂移] → 落地后逐字节 diff 校验两份文件一致(沿用 `provenance_resolvable` change 的 3.1 做法)。
- [改了技能正文导致回归退化] → `bench.py`(含 `check.py` + `engine.py`)必须 PASS;不通过不吸收。

## Migration Plan

1. 写 delta spec 与技能正文(源 + `.agents` 副本)。2. 同步主规格。3. 归档本 change(使 `changerecord` 路径真实存在)。4. 回写候选的 `changerecord` / `version_bump`。5. 跑 `judge.py` 验收 `ACCEPT` + 跑 `bench.py` 回归。6. 回滚:纯文本 + git。

## Open Questions

无(设计已定:落点在既有技能方法库节 + 边界显式化 + 不动核心)。
