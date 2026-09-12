# /meta/evolution — 反馈捕获模板 (Retro / Layer 3)

每次实践复盘把**信号 → 证据 → 吸收目标候选**记成一条候选,交给 `judge.py` 收敛裁判决定可否吸收。

## 模板字段(每候选必填)

```yaml
candidate:
  id: <候选 id>
  signal: <什么做法有效/失效(一句话)>
  evidence: <证据;最好是 Layer 2 审计轨迹 run-*.jsonl 或目标项目产物引用>
  target: <吸收目标,五选一>
    # frame        —— 新通用类型/关系(进 frame.yaml)
    # metaschema   —— 元模型可选新字段(进 *.schema.json,只能新增可选)
    # skill        —— 技能步骤/启发式(进 SKILL.md)
    # gate         —— 新确定性闸门规则(进 gate_rules.py 注册)
    # method       —— 反模式/方法沉淀
  changerecord: <已版本化的方法论 change 记录路径(judge 条件①,须存在)>
  version_bump: <受影响的契约版本标记,如 frame 1.0 -> 1.1>
  bench_status: <pass | fail | auto>   # judge 条件②(回归)
  addonly: <true | false>              # judge 条件③(add-only 兼容)
```

## 吸收目标(五类,均位于 meta 层)

| target | 落在哪里 | 吸收方式 |
|---|---|---|
| frame | `/meta/ontology/frame.yaml` | 加通用类型/关系(新增,不删) |
| metaschema | `/meta/metaschema/*.schema.json` | 加**可选**字段(不把可选变必填) |
| skill | `/meta/skills/*/SKILL.md` | 加步骤/启发式(不改既有契约) |
| gate | `/meta/engine/gate_rules.py` | 注册一条新闸门规则(单向注册) |
| method | 方法/反模式记录 | 沉淀一条(meta-only) |

## 纪律

- 复盘**只捕获**候选,不就地改 meta。**吸收 = 发起一条方法论 change**,judge 只是准入门。
- 任何候选必须先被记成**已版本化的方法论 change**,且过**基准回归**,且 **add-only 兼容**,否则拒收/延后(防 prompt 漂移)。
- 吸收只进 **meta 层**,不改任何目标项目产物。
