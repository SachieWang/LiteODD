# /meta/evolution — 方法论 Layer 3:反馈环 / 自进化(元层产物)

让方法论**不自封**:实践复盘如何被安全吸收、如何收敛(防 prompt 漂移)、如何版本化留痕、如何不引发破坏。属 meta 层、与 OpenSpec/任何 harness 解耦。

## 组成

| 文件 | 职责 |
|---|---|
| `retro.md` | 反馈捕获模板(信号/证据/吸收目标/版本/add-only) |
| `retro/*.yaml` | 候选改进示例(accept / reject 各一条) |
| `judge.py` | **收敛裁判**(确定性三条件;只当准入,不就地吸收) |
| `bench.py` | **基准回归**(复用引擎闸门 + check.py 重跑种子集) |

## 收敛三条件(judge 裁决;任一不满足 → REJECT/DEFER 并点名)

```
① 已记录为版本化的方法论 change(changerecord 存在 + version_bump + 合法 target + id)
② 基准回归通过(bench.py 对种子集重跑全过)          ← 退化即拦截
③ add-only 兼容(只新增可选/注册/类型;不删、不把可选变必填)
```

## 确定性边界(与 Layer 2 一脉相承)

**LLM 提议 · 引擎裁决**:复盘捕获/提炼候选由 LLM 生产(提议);**是否吸收**由 judge 三条件 + bench 得分**确定性裁决**(引擎裁决),LLM 不裁决吸收。

## meta-only 吸收纪律

- **吸收只进 meta 层**(frame 类型/关系、元模型可选字段、skill 步骤、gate 注册、method 反模式);**不改任何目标项目产物**。
- 目标项目只是喂料源:它浮现通用新模式 → 记成方法论 change → 进 frame,不落到项目产物里。
- **吸收 = 发起一条方法论 change**(版本化、可评审、可回退);judge 只当准入门,不就地改 meta。

## 实践记录放哪

- **模板/工具/通用示例**在 meta(`retro.md`、`judge.py`、`bench.py`、`retro/*-example.yaml`)。
- **目标专属复盘记录**放对象层(如 `targets/<project>/evolution/retro/`),**不进 meta**。

## 用法

**target 必填**——meta 不内嵌默认目标。

```bash
# 基准回归(对指定目标全过才放行)
uv run --project meta/scripts python meta/evolution/bench.py targets/<project>   # exit 0 = pass

# 收敛裁判(接受/拒绝两例对照;bench_status=auto 时须给 --target)
uv run --project meta/scripts python meta/evolution/judge.py meta/evolution/retro/accept-example.yaml --target targets/<project>  # exit 0
uv run --project meta/scripts python meta/evolution/judge.py meta/evolution/retro/reject-example.yaml --target targets/<project>  # exit 1
```

## add-only 兼容(it与 Layer 2 纪律统一)

吸收永远新增(可选字段/注册项/类型);语义变更开**新版本并存**,不覆盖旧版;废弃保留+标注+并存到主版本引退。这保证方法论**进化增量、可回退、不引发破坏性变更**——正是自进化与\"避免未来破坏\"兼顾的机制。
