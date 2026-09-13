## 1. 立项与选型

- [x] 1.1 选定异质领域:**制造业「设备台账与维保」**(非 agent、非开发者工具)。来源为 `targets/plant-maint/sources/plant-ops-brief.md`——纯领域语言写作(背景/痛点/目标/角色/约束),**刻意不含 frame 类型词汇**,以免后续映射被验收标准反向拟合。
- [x] 1.2 用 `/meta/templates/` 建立对象层三文件;`instances.yaml` **20 个实例**,每个标 `instantiateOf`,并含 `mappingGaps` 段记录无处安放的领域词。

## 2. 用冻结的 meta 跑全链

- [x] 2.1 Layer 0:`check.py targets/plant-maint` → `checked 12 artifact(s); 0 failure(s)`,`all 20 instance(s) resolve instantiateOf to a frame type`。
- [x] 2.2 Layer 1:产出需求 6(REQ-001..006)、架构报告 1(REP-001)、ADR 2(ADR-001/002)、领域模型 3(DM-001..003),共 12 份;每条需求带可校验 `source` 与可解析 `conceptRef`。
- [x] 2.3 Layer 2:`engine.py targets/plant-maint --assume-approval` → 五阶段(realm-check → req-understand → arch-assess → domain-model → trace-check)**全过,exit 0**;含 `provenance_resolvable`、`invariant_present`、`link_integrity`。
- [x] 2.4 Layer 4:`tracer.py verify targets/plant-maint` → `PASS: link integrity OK`。

## 3. 验收(可机器判定)

- [x] 3.1 **F1** ✅ check PASS + engine 全阶段过门 + verify PASS(见 2.1 / 2.3 / 2.4)。
- [x] 3.2 **F2** ✅ `tracer.py report` → `requirements: 6/6 downstream-covered`;`orphan concepts: 0`。
- [x] 3.3 **F3** ✅ 概念类型 **7/7**(Assembly 2 / Component 2 / Seam 3 / ExecutionUnit 3 / PersistentState 4 / EventStream 2 / ContextBoundary 4);关系类型 **8/8 declared types used**,且**零未声明**。无可达性例外需要声明。
- [x] 3.4 **F4** ✅ `git diff --stat -- meta/` 为空;`targets/dsh` 的 11 份产物未动。
- [x] 3.5 **F5** 未触发:本目标**不需要**修改任何 meta 层文件。

### 3.6 验收过程中的两次真实修正(指标起作用,而非事后粉饰)

- **孤儿概念 2 个**:初次建模时我自行加入了 `sp:process-cell`(简报中**无依据**),并把 `sp:sensor-reading` 悬空。指标把它们揪出后按证据分别处理:删除无依据的 `process-cell`;把有依据的 `sensor-reading` 接到真实因果链(`SensorReading triggers AlarmEvent`)。
- **引擎崩栈**:`sources.yaml` 的 `note` 含裸 `": "` 导致 YAML 解析失败,`check.py` 放行而 `realm_check` 抛未捕获异常。修正数据后复跑;缺口本身记为 G5。

## 4. 结论与后续

- [x] 4.1 **结论:通用性「未被证伪,且 meta 零改动通过」——不等于「已证通用」。**

  **支持面**:一个与 dsh 完全异质的领域,在 **meta 层零改动**的前提下跑通五层全链;8 个关系类型在本领域**全部**有自然用例,且没有出现任何需要自造的关系词。这是可 diff 的事实。

  **限制面(必须一并记录)**:本次产物的作者**事先知道** frame 的 8 个关系词表,因此"用满 8 个"**不能完全排除拟合**。更干净的反向证据来自 dsh——那 5 个未声明关系类型(`applies`/`consumes`/`hasScope`/`isA`/`uses`)是在不知情前提下自发产生的。要真正证明通用性,需要**不知道词表的作者**或**更多异质样本**。

- [x] 4.2 **决定**:关系词表**不需要新增类型**(F3 显示 8/8 够用);G1–G4 仍属真实缺口,各自另开方法论 change(本轮不开,仅留痕)。

## 5. 本次暴露的缺口(不修改 meta,只记录)

| # | 缺口 | 证据 | 建议 target |
|---|---|---|---|
| G1 | 关系类型只有 id,**无含义、无 `from`/`to` 方向约定** | frame 的 `relationTypes` 是裸 id 列表;本次模型的 from/to 约定由作者自行决定,换一个作者可能相反 | frame(补**可选**语义字段) |
| G2 | **「规则/规程」类概念无对应类型** | 检修安全规程(REQ-005 的核心)只能勉强塞进 `PersistentState`,丢失了"它约束其他执行单元"的语义 | frame(新类型)或明确"不作为概念" |
| G3 | **人员/角色无对应类型** | 简报 §四 的 5 类角色只能作为字段承担,`Actor`/`Role` 缺失 | frame(新类型)或明确"角色不是概念" |
| G4 | `components.yaml` 的 **`path` 假定代码路径** | 非软件领域无自然取值,本次以"逻辑归属定位符"填充,属语义拉伸 | metaschema / 契约 |
| G5 | **引擎对格式非法的对象层 YAML 抛未捕获栈** | `note` 含裸 `": "` 时 `check.py` 放行、`realm_check` 崩栈(exit 1 + traceback),未点名文件与行号;与"确定性引擎应给可读错误"相悖 | gate(`gate_rules` 的 `load_yaml` 加错误处理) |

> **留痕说明**:本目标的产物位于 `targets/plant-maint/`(被 `.gitignore` 忽略),故全部证据(命令、输出、计数、结论与缺口)都记录在本文件内,随本 change 入库。
> 按纪律,以上缺口**不在本 change 内修改**,也不以占位符写成候选(捕获技能要求 `changerecord` 真实存在);需要时各自另开方法论 change。
