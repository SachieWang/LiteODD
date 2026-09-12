# /meta/trace — 方法论 Layer 4 可追溯层(元层产物)

对**全局 provenance** 做确定性校验与反向查询:把整个 artifact 集当作一张链接图,回答"这条需求/这个决策/这个领域实体**凭什么**如此"。属 meta 层,通用、与 OpenSpec/任何 harness 解耦。

## 组成

| 文件 | 职责 |
|---|---|
| `tracer.py` | 确定性可追溯工具:`verify` / `report` / `refs` / `why` |

## 用法(target 必填;meta 无默认目标)

```bash
T="uv run --project meta/scripts python meta/trace/tracer.py"
$T verify targets/<project>                     # 全局链接完整性(硬门);exit 0 = 通过
$T report targets/<project>                     # 覆盖度指标 + 孤儿概念
$T refs   targets/<project> sp:<concept>        # 反向查询:谁引用了该概念
$T why    targets/<project> REQ-<n>             # 某需求的下游链
```

## 完整性(硬门)vs 覆盖度(指标)

**完整性问题 = 自洽性错误(必然错误)硬门**:
- 每个 `conceptRef`/`targetRef` 可解析到实例
- artifact `id` 全局唯一
- ADR `supersedes` 指向存在的 ADR,且**无环**
- 被取代者 `status == superseded`;标 `superseded` 者确被取代

**覆盖度 = 质量信号(非门)**:某需求可能确无下游匹配,故只报告:
- 需求下游覆盖比(其概念是否被 report/ADR/domain-model 引用)
- 孤儿概念(被任何 artifact 引用为 0 的实例)

## 接入

DAG 收口阶段 `trace-check`(`deps: [arch-assess, domain-model]`,`gate: [link_integrity]`)。
闸门规则 `link_integrity` **直接调用 `tracer.verify_target`**(单一事实来源),故工具与流水线判定一致。

## 无图存储 / 无推理机

反向索引在**内存中即时计算**,只读目标仓的 artifact/instance 文件;无数据库、无图存储、无 SPARQL。
