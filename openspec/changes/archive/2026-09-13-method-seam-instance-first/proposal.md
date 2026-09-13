## Why

`targets/dsh/evolution/retro/takeaway-round2.yaml` 记下一条实践信号:本轮新增"终端缝"能力缝时,先增补了可解析实例 `sp:terminal-seam`,需求(REQ-005)与领域模型(DM-003)才都能带可解析 `conceptRef`、全链过门;反之领域模型会落后于需求。

但这条规则至今**没有版本化 change 记录**。实测 `judge.py` 判定为 `REJECT/DEFER`,三条件里 `bench=pass`、`addonly=pass`,**只差条件① `record`**:

```
FAIL[1] 未记录为版本化方法论 change(缺存在且版的 change 记录 / 版本 / 合法 target / id)
```

候选自身的注释就写着 `# 尚无方法论 change 记录 → 应 DEFER 待记录`。这意味着"可自进化"这项能力目前只有**半个证明**:反馈环能捕获、能判定,但这条候选永远停在门口。本 change 把它补成完整闭环。

## What Changes

- **新增一条 method 类吸收**:需求理解技能遇到**尚无实例的新概念**时,必须**先增补可解析实例**(`instantiateOf` 锚到元层类型),再产出需求条目与下游产物;不得以"待定"推迟。
- **划清与既有「标注不确定性」的边界**:真正含糊/矛盾的输入仍标注不确定性;新规则只针对"概念明确但尚未登记"的情形,避免两条要求互相吞并。
- **落点遵循既定设计**:Layer 1 已决定"方法库/反模式**不单独成库**,并入各技能『方法库/反模式』正文"(`2026-09-09-layer1-skills/design.md`),故本规则进 `requirement-understanding/SKILL.md` 的该节,**而非新建 `meta/method/`**。
- **同步 `.agents/skills/` 消费副本**,保持源与副本逐字节一致。
- **回写候选**:把 `takeaway-round2.yaml` 的 `changerecord` 指向本 change、`version_bump` 改为实际受影响面。
- **add-only**:只新增一条要求与一行方法库提示,不删不改既有契约语义。

## Capabilities

### New Capabilities
<!-- 无新增能力 -->

### Modified Capabilities
- `methodology/requirement-understanding`: 新增"新概念先实例化后引用"要求。

## Impact

- 修改:`/meta/skills/requirement-understanding/SKILL.md`(方法库/反模式 + 边界说明)、`.agents/skills/requirement-understanding/SKILL.md`(同步副本)。
- 修正:`targets/dsh/evolution/retro/takeaway-round2.yaml`(对象层实践记录,不入版本库)。
- 复用:既有技能五段契约、既有校验与回归。**不改** frame、**不改**四份 schema、**不改**引擎与编排语义、不新增依赖。
