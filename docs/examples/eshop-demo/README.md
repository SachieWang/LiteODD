# eShop-demo —— 脱敏教学样例(对象层完整可跑集)

本目录是 [docs/tutorial.md](../../../docs/tutorial.md) 的**配套可复现样例**:一套最小但完整的对象层
(3 份 ontology 文件 + 4 份产物 JSON),全部为虚构数据,不指向任何真实代码库。用途:

1. **照抄格式** —— 新用户在没有 `targets/` 实践产物的 clone 里,也能看到四类产物
   (requirement / arch-report / ADR / domain-model)的完整合规写法;
2. **实跑验证** —— 本样例本身能通过工具链全链校验(见下),可作为"装好之后的第一条冒烟命令"。

> 本目录是**文档的一部分**,不是实践产物:它放在 `docs/` 下入版本库(`targets/` 的忽略
> 规则不受影响),不算对象层放置纪律的违例——就像元层 `meta/evolution/retro/*-example.yaml`
> 一样,通用/教学示例随方法本体分发。

## 内容

```
docs/examples/eshop-demo/
├── README.md                      # 本文件
├── ontology/
│   ├── instances.yaml             # 5 个脊柱实例(es:*),instantiateOf → frame 类型
│   ├── components.yaml            # 组件薄索引,ref → 实例 id
│   └── sources.yaml               # 来源注册表(需求 source 在此登记)
└── artifacts/
    ├── requirements/REQ-001.json  # 需求:结算支持切换支付通道
    ├── arch-reports/REP-001.json  # 架构评估:支付通道(Seam)
    ├── adr/ADR-001.json           # 决策:用可替换支付通道,不侵入订单流程
    └── domain-models/DM-001.json  # 领域模型:订单/结算/支付通道
```

## 与真实对象层的唯一差别

- 概念命名空间用 `es:`(虚构);真实项目自定(如 dsh 目标用 `sp:`)。
- `sources.yaml` 只登记了一条**无文件来源**(愿景)——这正是"访谈/愿景类来源必须显式登记、
  不得编造"的示范写法;若需求来自真实文件,用 `source: "file:<存在的相对路径>"` 即可,
  无需登记。
- 规模刻意最小(1 REQ / 1 REP / 1 ADR / 1 DM);真实目标可产出多份,规则不变。

## 冒烟验证(全链)

在**仓库根**执行(target 指向本样例目录即可,工具不要求 target 必须位于 `targets/` 下):

```bash
# 1) Layer 0:三段不变量(结构合法 + conceptRef 解析 + instantiateOf 指向 frame 类型)
uv run --project meta/scripts python meta/scripts/check.py docs/examples/eshop-demo

# 2) Layer 2:受控流水线(realm-check → 需求 → 架构 → 建模 → trace-check)
uv run --project meta/scripts python meta/engine/engine.py docs/examples/eshop-demo --assume-approval

# 3) Layer 4:链接完整性(硬门)+ 覆盖度指标
uv run --project meta/scripts python meta/trace/tracer.py verify docs/examples/eshop-demo
uv run --project meta/scripts python meta/trace/tracer.py report docs/examples/eshop-demo
uv run --project meta/scripts python meta/trace/tracer.py refs   docs/examples/eshop-demo es:payment-gateway
uv run --project meta/scripts python meta/trace/tracer.py why    docs/examples/eshop-demo REQ-001
```

四条命令全过(exit 0)即证明:本样例的每一份产物都合规、可追溯,可作为照抄模板。

## 设计动机

修复缺口 G1(见 2026-09-28 仓库文档审计):教程此前只有文字速写,完整产物示例全在
gitignored 的 `targets/` 里,新用户无法在 clone 后照抄复现。本样例即为此补齐的最小闭环。
