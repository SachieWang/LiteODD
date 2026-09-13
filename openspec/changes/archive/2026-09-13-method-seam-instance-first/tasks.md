## 1. 规格与技能落地

- [x] 1.1 在 `/meta/skills/requirement-understanding/SKILL.md` 的『方法库/反模式』节新增一条规则:**新概念先实例化后引用**——需求引入尚无实例的概念时,先增补可解析实例(`instantiateOf` 锚到元层类型),再产出需求条目与下游产物,不以"待定"推迟;verify 该行与 delta spec 的 Scenario 语义一致。
- [x] 1.2 在同一技能正文里划清边界:含糊/矛盾输入仍标注不确定性,本规则只针对"概念明确但尚未登记";verify 两处表述不互相吞并,且既有 `Ontology-first term alignment` / `Uncertainty flagged explicitly` 语义未被改写(步骤 1 原句保留、只追加"例外"分支)。
- [x] 1.3 同步 `/.agents/skills/requirement-understanding/SKILL.md`;verify 与源**逐字节一致**(`diff -q` 无输出)。

## 2. 记录与回写

- [x] 2.1 同步主规格并归档本 change 到 `openspec/changes/archive/2026-09-13-method-seam-instance-first/`,使候选的 `changerecord` 路径**真实存在**(judge 条件①的硬要求)。
- [x] 2.2 回写 `/targets/dsh/evolution/retro/takeaway-round2.yaml` 的 `changerecord` 指向该归档路径、`version_bump` 改为实际受影响面;verify YAML 可解析、路径存在、`target: method` 合法。

## 3. 验收(可机器判定)

- [x] 3.1 跑 `uv run --project meta/scripts python meta/evolution/judge.py targets/dsh/evolution/retro/takeaway-round2.yaml --target targets/dsh`;verify 三条件全 pass、`verdict = ACCEPT`、退出码 `0`——此前为 `record=fail` → `REJECT/DEFER`。
- [x] 3.2 跑 `uv run --project meta/scripts python meta/evolution/bench.py targets/dsh`;verify 退出码 `0`(`check.py` 与 `engine.py` 均 PASS),即技能正文改动未使基准退化。
- [x] 3.3 add-only 负向确认:本次只**新增**一条要求与一条提示,未删改既有要求;verify 主规格 diff 中无 REMOVED / 语义 MODIFIED。
