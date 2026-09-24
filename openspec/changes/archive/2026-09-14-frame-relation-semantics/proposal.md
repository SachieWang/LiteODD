## Why

frame.yaml 的 8 个关系类型是**光秃秃的 id**,没有含义、没有 `from`/`to` 方向约定。后果已在两个目标实证:

- `targets/dsh`:domain model 自造了 5 个未声明关系词(`applies`/`consumes`/`hasScope`/`isA`/`uses`)——因为词表无语义,作者只能自行发明;
- `targets/plant-maint`(F):8 个词都有自然用例,但 `from`/`to` 方向由作者自行约定,换一个作者可能相反。

ontology-frame 主规格的「Generic relation type set」Scenario 甚至声称 *"relationship MUST use a relation type from the frame's set, or rejected"*,而实际并无该校验(见 `relation-conformance-report` 的发现)。本 change 给这 8 个关系**补语义与方向**,让它从"名字列表"变成可一致使用的契约。

> **不引入硬门**:方向/naming 的一致性仍维持"报告非门"(见 `add-heterogeneous-target` 的 G1),留待更多样本再做门的决定;本 change 只补语义内容,门槛由其它 change 决定。

## What Changes

- 给 frame.yaml 的每个 `relationType` 增加**可选**字段:`description`(一句话含义)与 `direction`(subject→object 方向约定)。
- 定义并记录 8 个关系的语义与方向(依据两个目标的真实用法):
  `composes`=整体由部分组成(subject 整体 → object 部件);`providedBy`=能力缝由实现提供;`usedBy`=被使用者使用;`triggers`=触发执行;`writes`=写入持久态;`reads`=读取持久态;`dependsOn`=依赖;`constrains`=约束。
- **add-only / meta-only**:只新增可选字段与说明,不改关系 id、不删任何内容、不引入硬门。

## Capabilities

### Modified Capabilities
- `methodology/ontology-frame`:新增"关系类型带语义与方向"要求。

## Impact

- 修改:`/meta/ontology/frame.yaml`(每个 relationType 加 `description` / `direction`)。
- **不动**:任何目标产物、四份 schema、引擎、硬门语义。
- 后续(不在本 change):把方向/naming 一致性纳入既有的 `relation-conformance` 报告(可选)。
