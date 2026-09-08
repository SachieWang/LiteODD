## Context

Layer 0 已闭环且归档:元层 `/meta/`(frame + 4 metaschema + uv/Python 校验脚本 `check.py`)、对象层 `/targets/dsh/`(instances + components + 示范链)、主 specs 已同步。Layer 1 要在这条脊柱上长\"肌肉\"。动机见 proposal.md;三个技能的验收契约见 specs。

约束:奥卡姆 + K.I.S.S.;技能是 **meta 产物**,源存 `/meta/skills/`;同时安装副本到 `.agents/skills/` 使运行 agent 可加载(参照既有 OpenSpec 技能的 SKILL.md 格式/位置)。

## Goals / Non-Goals

**Goals:**
- 三个技能各自成文(`SKILL.md`,含触发/输入步骤/输出/质量门五段契约)。
- 三技能全部对接 Layer 0:先对齐本体(frame + 项目 instances)、按 metaschema 产出、用 `check.py` 过质量门。
- 安装副本到 `.agents/skills/` 供 agent 直接加载。

**Non-Goals:**
- 不改 Layer 0 的 frame/schema/校验脚本(只消费)。
- 不实现 Layer 3 自进化循环、不建 benchmark 工程集;仅把方法固化。
- 不把方法库(反模式/启发式)单独成库——并入各技能\"质量门/风险提示\"正文,保持轻。

## Decisions

1. **代表形式 = SKILL.md,存 `/meta/skills/<name>/SKILL.md`**。参照现有 OpenSpec 技能的 frontmatter(name/description/license/metadata)+ 正文格式;技能属 meta 产物,与框架分层一致。
   - 备选:只写设计文档不进可执行载体 → 无法让 agent 直接调用,弃。
2. **再安装副本到 `.agents/skills/<name>/SKILL.md`**。`/meta/skills/` 是版本化源(元层),`/meta/skills/` 与 `.agents/` 同工作区,副本为消费端接入点;两份保持内容一致(源为准)。
   - 备选:只在 .agents 写一份 → 丢失\"技能源在元层\"的统一归位;弃。
3. **五段契约 + 强制\"先对齐本体\"**。每个技能正文强制 `先查 frame/instances → 对齐 conceptRef → 按输出 schema 产出 → check.py 过质量门`,保证跨项目/agent/时刻同构。
   - 备选:自由 prompt → 无结构约束,破坏同构目标;弃。
4. **输出严格遵循 Layer 0 四 schema**。requirement / arch-report+adr / domain-model;质量门复用 `check.py`(三段不变量 + conceptRef 解析),不另写校验。

五段契约模板(每个技能沿用):
```
## 触发条件 Trigger
## 输入 Schema Input
## 步骤 Steps（1 先对齐本体 2 … 末 过质量门）
## 输出 Schema Output
## 质量门 Quality Gate
```

## Risks / Trade-offs

- [技能正文过长、与层叠重复] → 抽公共契约段,三技能一致复用;单技能只写差异步骤。
- [`/meta/skills/` 与 `.agents/skills/` 副本漂移] → 立\"源在 /meta、副本仅为接入点\"的规矩;改动只改源、副本随归档一起同步。
- [agent 直接调用时仍可能绕过契约] → 靠 Layer 2(治理/门控)补;本层只保证\"有契约可依\"。
- [KISS 与\"方法库\"取舍] → 反模式/启发式并入各技能质量门说明,暂不独立成库(可延后到 Layer 3)。

## Migration Plan

1. 目录:`/meta/skills/{requirement-understanding,architecture-assessment,domain-modeling}/SKILL.md` + `/meta/skills/README.md`。
2. 复制到 `.agents/skills/<name>/SKILL.md`。
3. 回滚:纯文本文件 + git;删除即回滚,无系统依赖。

## Open Questions

- 是否需要第四个\"总览/编排\"技能把三技能串成流水线(需求→架构→建模)——可延后(Layer 2 编排层再定)。
- `/meta/skills/` 与 `/meta/scripts/` 是否拆独立工具仓——沿用 Layer 0 的\"同工作区,必要时再拆\"决定。
