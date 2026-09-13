## 1. 立项与选型

- [ ] 1.1 选定异质领域与**真实**来源(可在该目标 `ontology/sources.yaml` 登记 id 或引用真实文件),确认满足"领域异质":非 agent、非开发者工具。
- [ ] 1.2 用 `/meta/templates/` 建立对象层三文件(`instances.yaml` / `components.yaml` / `sources.yaml`),规模不小于 10 个实例;verify 三文件齐备且每个实例标 `instantiateOf`。

## 2. 用冻结的 meta 跑全链

- [ ] 2.1 Layer 0:`check.py <target>` PASS(三段不变量 + 全部 `conceptRef` 可解析)。
- [ ] 2.2 Layer 1:用三技能产出需求 / 架构报告 / ADR / 领域模型;verify 每条需求带可校验 `source` 与可解析 `conceptRef`。
- [ ] 2.3 Layer 2:`engine.py <target> --assume-approval` 全阶段过门(含 `realm-check` 与 `trace-check` 收口)。
- [ ] 2.4 Layer 4:`tracer.py verify <target>` PASS。

## 3. 验收(可机器判定)

- [ ] 3.1 **F1 合规与过门**:`check.py` PASS + `engine.py` 全阶段过门 + `tracer.py verify` PASS。
- [ ] 3.2 **F2 覆盖度**:`tracer.py report` 显示需求下游覆盖 **100%**、孤儿概念 **0**。
- [ ] 3.3 **F3 覆盖度断言**:`tracer.py report` 显示 **7/7 概念类型**与 **8/8 关系类型**均有真实用例;确实不可达者,必须记为"不可达判定"并写明理由——**禁止静默留空**。
- [ ] 3.4 **F4 meta 零改动**:`git diff --stat -- meta/ontology meta/metaschema meta/skills meta/engine meta/evolution meta/trace` 为空。
- [ ] 3.5 **F5 失败即转吸收**:若 3.4 失败(确实必须改 meta),把每个必须改动的点记成 `retro 候选`(含真实存在的 change 记录)、过 `judge`,**不得在本 change 内就地放宽契约**。

## 4. 结论与后续

- [ ] 4.1 给出结论:通用性**成立**或**不成立**,并列出对应证据(F4 的 diff 结果 / F5 的候选清单)。
- [ ] 4.2 依据结论,决定是否为 frame 的 8 个关系类型补语义与方向约定、以及是否新增关系类型(见本 change design 的 Open Questions);该决定**另开方法论 change**,不在本 change 内进行。
