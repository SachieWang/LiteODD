## Why

让方法论不自封:Layer 0/1/2 已把\"脊柱/技能/确定性编排\"立起来,但还没有\"新陈代谢\"——实践复盘如何被吸收、如何保证收敛(不被 prompt 漂移带偏)、如何版本化留痕。本 change 引入 **Layer 3 反馈环/自进化**:**复盘捕获 → 收敛裁判(回归+版本+记录门) → meta-only 吸收 → 版本化留痕**,并把\"add-only 兼容\"内置为吸收纪律,使每次进化都是增量、可回退、可追溯。

## What Changes

- **新增反馈捕获**:`/meta/evolution/retro.md` 复盘模板 + 候选改进记录(每条:信号/证据/吸收目标 type/schema/skill/gate/method/反模式)。
- **收敛裁判**(确定性,`judge.py`):候选必须满足 ① 被记录为方法论 change(版本化)、② 基准回归通过、③ add-only 兼容(新增可选/注册/类型)。不满足一律**拒绝/延后**,防止漂移。
- **基准回归**(`bench.py`):复用 Layer 2 引擎闸门与 `check.py` 对种子实践集(如 `targets/dsh`)重跑,吸收后确认不退化;退化则拦截吸收。
- **meta-only 吸收纪律**:吸收只进 **meta 层**(frame 类型/关系、元模型可选字段、技能步骤、闸门注册、方法库反模式);**不修改目标项目产物**。目标项目只通过\"浮现通用新类型\"并以方法论 change 记录来喂 meta。
- **版本化留痕**:每次吸收必须带版本标记(DAG/gate/skill/frame 版本)并留 change 记录;吸收=发起一条方法论 change,裁判只负责闸门,不就地改 meta。
- **add-only 兼容**:吸收永远走新增(可选字段/注册项/类型),不删不破坏——与 Layer 2 纪律一致,进化不引发破坏性变更。

## Capabilities

### New Capabilities
- `methodology/evolution`: 自进化治理契约——复盘捕获、收敛裁判(回归+版本+记录门)、meta-only 吸收、版本化留痕、add-only 兼容;全部工具/宿主机解耦。

### Modified Capabilities
<!-- 无既有能力被修改 -->

## Impact

- 新增:`/meta/evolution/{retro.md, judge.py, bench.py, README.md, retro/<示例候选>.yaml}`。
- 复用:Layer 2 引擎闸门(`/meta/engine/gate_rules.py`/`engine.py`)、`check.py`、frame/metaschema、`targets/dsh` 种子集。
- 不改 frame/元模型/技能/闸门;纯新增自进化治理能力。与 OpenSpec/任何 harness 解耦。
