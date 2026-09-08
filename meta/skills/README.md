# /meta/skills — 方法论技能包 (Layer 1, 元层产物)

本目录固化了方法论三个核心能力,属 **meta 层**(通用/可复用/随方法自身演进)。每个技能是 agent 可执行的 `SKILL.md`,带固定契约:**触发条件 / 输入Schema / 步骤 / 输出Schema / 质量门**,并强制 **先对齐本体 → 按元模型产出 → 过质量门**。

## 放置规则(双层)

- **源(权威)**在本目录 `/meta/skills/<name>/SKILL.md`。
- **harness 副本(消费端接入点)**在 `.agents/skills/<name>/SKILL.md`。改动只改源;副本随源同步(本层保证同构)。

## 三技能与输出 schema

| 技能 | 目录 | 输出 schema(元层) |
|---|---|---|
| requirement-understanding 需求理解 | `/meta/skills/requirement-understanding/` | `requirement.schema.json` |
| architecture-assessment 架构评估 | `/meta/skills/architecture-assessment/` | `arch-report.schema.json` + `adr.schema.json` |
| domain-modeling 领域建模 | `/meta/skills/domain-modeling/` | `domain-model.schema.json` |

## 质量门(共用一处)

三者都复用 `/meta/scripts/check.py`(uv + Python)跑三段不变量 + `conceptRef` 解析:

```
uv run --project meta/scripts python meta/scripts/check.py <project>   # 如 targets/dsh
```

产物先过结构合法与概念解析,再过各技能自己的语义抽查,才允许进入下游(Layer 2 治理/编排)。

## 与 Layer 0 的关系

- 消费:`/meta/ontology/frame.yaml`(类型)、`/meta/metaschema/*.schema.json`(结构)、目标项目 `instances.yaml`/`components.yaml`(实例)。
- 不修改 Layer 0;只把\"按脊柱产出\"固化成可执行程序。
