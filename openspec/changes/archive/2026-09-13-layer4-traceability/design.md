## Context

动机见 proposal.md;行为要求见 spec。现状:artifact 已带 `conceptRef`/`targetRef`/`supersedes`/`source`,但校验**逐条**(每份自洽),缺**全局链路**校验。约束:KISS、确定性、无图存储、与 OpenSpec/harness 解耦;沿用 uv+Python。

## Goals / Non-Goals

**Goals:**
- 一个确定性校验器覆盖全局 provenance:链接可解析、id 唯一、ADR 取代链存在且无环、取代状态一致。
- 一个**指标**(非门):需求的下游覆盖度 + 孤儿概念。
- 反向查询:概念/artifact 被谁引用、需求的下游链。
- 作为 DAG 收口阶段 `trace-check`。

**Non-Goals:**
- 不引图数据库/推理机/SPARQL(内存计算)。
- 不把覆盖度做成硬门(过严会误伤合法未匹配需求);它是指标。
- 不改四份 schema、不改既有闸门规则。

## Decisions

1. **单工具 `meta/trace/tracer.py`**(而非 `trace.py`——避免与 Python 标准库 `trace` 冲突),子命令 `verify` / `report` / `refs`。理由:KISS,一个确定性入口。
2. **闸门规则 `link_integrity` 复用 tracer 逻辑**:规则调用 `tracer.verify_target(target)`,保证"工具与他人看到的校验一致"(单一事实来源)。
3. **`trace-check` 阶段**:`deps: [arch-assess, domain-model]`,对全部 artifact 跑 `link_integrity`,是全链收口门(架构与建模都过门后才校验链路)。
4. **完整性=硬门,覆盖度=指标**:完整性是自洽性(错误必然),硬门合理;覆盖度是质量信号(某需求可能确无下游),仅报告。
5. **反向索引内存计算**:从 artifact 文件即时构建 `concept -> [artifacts]` 与 `id -> artifact` 映射,不落库、不缓存。
6. **add-only**:新增能力/规则/阶段;不动既有契约。

## 校验定义(确定性)

```
verify(完整性, 硬门):
  - 每个 conceptRef/targetRef 在 instances 内可解析
  - artifact id 全局唯一
  - ADR.supersedes 指向存在的 ADR id
  - supersedes 关系无环(拓扑/DFS)
  - 被取代者 status==superseded;status==superseded 者确被取代
report(指标, 非门):
  - 需求下游覆盖:每条需求的 concept 是否被 arch-report/ADR/domain-model 引用
  - 孤儿概念:被任何 artifact 引用为 0 的实例
refs(反向查询):
  - refs <concept>  -> 引用它的 artifact(按类型分组)
  - refs <id>       -> 引用/取代该 id 的 artifact
  - why <REQ-id>    -> 该需求的 concept + 引用这些 concept 的下游 artifact
```

## Risks / Trade-offs

- [覆盖度过严若设为硬门] → 明确设为指标,仅报告。
- [tracer 与 gate_rules 逻辑重复] → 闸门规则直接调用 tracer,单一事实来源。
- [dsh 现有 ADR 无 supersedes 链,校验形同虚设] → 负向测试构造循环/悬空取代以证明规则有效。
- [标准库名冲突] → 文件名用 `tracer.py`。

## Migration Plan

1. 加 `meta/trace/{tracer.py,README.md}`。2. 注册 `link_integrity`。3. 加 `trace-check` 阶段。4. 跑 verify/report/refs + 负向 + bench。5. 回滚:纯文本 + git。

## Open Questions

无。
