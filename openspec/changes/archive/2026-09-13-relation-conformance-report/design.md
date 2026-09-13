## Context

量化"可复用"时发现:唯一目标 `targets/dsh` 的 domain model 用了 frame 未声明的关系类型(实测 **5 个**:`applies` / `consumes` / `hasScope` / `isA` / `uses`;DM-002 的 3 个全部未声明),且三层校验全部放行。动机见 proposal.md;行为要求见 delta spec。约束:确定性、非门、add-only、KISS、与 OpenSpec/harness 解耦。

本 change 是 Layer 4 报告面的**一次加性扩展**,不是新层。

## Goals / Non-Goals

**Goals:**
- 让"frame 声明的通用关系类型"与"domain model 实际使用的关系类型"之间的差异**可见**。
- 保持它**只报告、不拦截**:漂移不阻断任何流水线,也不改变任何退出码。
- 让 `targets/dsh` 的 `consumes` 作为**证据**留在原地,供后续判断使用。

**Non-Goals:**
- **不引入硬门**。理由是语义缺失:8 个关系类型没有含义与方向约定,硬门只会逼作者猜测。
- **不修 `consumes`**。改成一个"看起来更对"的声明内类型,等于用实现者的语感替代契约。
- **不给 frame 的关系类型定语义**。那是本体核心词汇的设计决策,且应当由**多个异质目标**共同逼出,而不是在单一同源目标上拍板。
- 不改 `frame.yaml`、不改 schema、不改 `gate_rules.py`、不改 `orchestrator.yaml`、不改任何 `targets/` 产物。

## Decisions

1. **放进 `tracer.py report`,而不是新增闸门规则。**
   本仓库已有"报告非门"的明确先例:`traceability` 规格里覆盖度指标写着 *"this metric is reported, not used as a hard gate"*。把同类指标放在同一处,不新增机制、不新增文件——符合奥卡姆。
   备选(注册一条不接入 orchestrator 的 gate 规则)会留下**死代码**,更糟。

2. **报告三个量,而不只报差异。**
   `declared`(frame 声明数)/ `used`(实际使用数)/ `undeclared`(用了但未声明)/ `unused`(声明了但从未使用)。只报 `undeclared` 会漏掉另一半事实:8 个关系里有 4 个从未被任何产物使用。

3. **`report` 恒返回 0。**
   非门的意义必须可由**退出码**观察,而不只是文档承诺——否则它会悄悄变成门。delta spec 用 Scenario 把这一点钉住。

4. **保留 `consumes` 作为证据。**
   与 `provenance_resolvable` 那次吸收(修正 REQ-001..005 的 source)不同:那次是**来源造假**,数据必须改;这次是**词汇分歧**,改掉它反而会抹掉"frame 词汇与实际用法存在缺口"这条信号。

5. **指标只读 frame 的 `relationTypes[].id`,容忍字符串写法。**
   frame 目前是 `- id: composes` 形态;同时容忍 `- composes` 纯字符串形态,避免指标本身成为脆弱点。

## Risks / Trade-offs

- [非门指标被无视] → 输出带明确计数与名单,且由 `report` 一并打印;`docs`/`README` 的后续引用会带上它。
- [有人顺手把它升级成门,却没先定语义] → 在 delta spec 的 Scenario 里写明"仍退出 0",并在本 design 记录"语义未定前不得升格为门"。
- [指标只覆盖 `domainModel`] → 目前只有 domain model 有 `relationships[]`;若将来别的 artifact 引入关系,再扩面(保持 add-only)。
- [改动触及 Layer 4 代码导致回归退化] → `bench.py`(check.py + engine.py)必须 PASS;`verify`(硬门)行为不得变化。

## Migration Plan

1. `tracer.py` 新增 `relation_conformance()` 与 `report` 输出段。2. 对 `targets/dsh` 实跑,确认漂移被看见且退出码仍为 0。3. 跑 `bench.py` 回归确认无退化。4. 同步主规格。5. 回滚:单文件 + git。

## Open Questions

- frame 的 8 个关系类型**应当**有含义与方向约定吗?若要有,应当由异质目标(见 `add-heterogeneous-target`)提供依据后再定,而不是现在由单一目标推测。本 change 只负责让缺口可见。
