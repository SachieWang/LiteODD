## Context

动机见 proposal.md。两处问题都源于"规范写对了、执行漏了":dual-realm 规范没被贯彻(实践记录留在 meta),对象层文件形态只在代码里隐式存在。约束:add-only、确定性、KISS、与 OpenSpec/harness 解耦。

## Goals / Non-Goals

**Goals:**
- 把 dsh 专属复盘记录移出 meta → `targets/dsh/evolution/retro/`;meta 只留模板/工具/通用示例。
- meta 工具去除具体目标耦合(不再默认 `targets/dsh`)。
- 立起对象层契约:三文件 + 最小字段 + 模板 + `realm_structure` 确定性校验(含首次校验 `components.yaml`)。

**Non-Goals:**
- 不改四份 artifact schema、不改 frame、不改审批/编排既有语义。
- 不把实例文件本身放进 meta(meta 只放**模板与规范**)。
- 不校验 `components.yaml` 的 `path` 是否真实存在(超出本轮范围)。

## Decisions

1. **实践记录归位**:meta 放**模板**(`retro.md`)、**工具**(`judge.py`/`bench.py`)、**通用示例**;**具体复盘记录**放目标对象层 `targets/<project>/evolution/retro/`。理由:dual-realm 契约 + 避免目标内容进入通用工具库。
2. **meta 工具目标中性**:移除 `check.py`/`gate_rules.py`/`bench.py`/`judge.py` 的 `default "targets/dsh"`,并让 `orchestrator.yaml` 不再写死 `target`。**目标在运行时显式给出**;缺失即报错。理由:meta 层内嵌具体目标名 = 隐藏耦合,违背"通用工具库"。
   - 备选:保留默认但改成中性占位 → 仍会误跑;显式要求更干净。
3. **对象层契约 = 三文件 + 最小字段**:`instances.yaml`(instances[]: id 唯一 + instantiateOf→frame 类型)、`components.yaml`(components[]: ref→可解析实例)、`sources.yaml`(sources[]: id 唯一 + kind)。三文件为对象层**必需**。
4. **模板放 meta**(`/meta/templates/*.template.yaml`):通用、无目标内容,指导创建、保证同构。
5. **`realm_structure` 闸门规则(加性注册)** + **`realm-check` 前置阶段**:该规则读取 `ctx["target"]`,校验三文件结构;`req-understand` 依赖 `realm-check`,结构不合规则 halt 下游。这是 `components.yaml` **首次被机器校验**。
   - 备选:把结构校验塞进 `check.py` → 但 `check.py` 面向 artifact 集;对象层结构属引擎前置校验,放闸门注册表更一致。
6. **add-only**:新增能力/规则/模板;结构校验引入的"必须存在"是对对象层的新要求(ADDED),不动既有 schema。

## Risks / Trade-offs

- [要求显式 target 会牺牲一点便利] → 换来确定性/无隐藏耦合;文档同步更新。
- [新增 `realm-check` 可能让既有目标失败] → 先在 `targets/dsh` 跑 bench 验证通过;若失败正是门禁价值。
- [三文件强制可能对极简项目过重] → 三文件都很薄,模板一键复用;仍可后续按 add-only 放宽。
- [移动文件可能漏改引用] → 全仓 grep `meta/evolution/retro/takeaway` 确认无悬挂引用。

## Migration Plan

1. 移动 takeaway → `targets/dsh/evolution/retro/`。2. 中性化 accept-example。3. 去默认目标(5 处)。4. 加模板 + `realm_structure` + `realm-check`。5. 跑 bench(含新 stage)与负向(破坏实例 ref)验证。6. 回滚:纯文本 + git。

## Open Questions

无。
