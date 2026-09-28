# 设计:tracer refs 与命名空间解耦

## 判据选择

三个候选:
1. ~~保留 `sp:` 前缀,样例改用 `sp:`~~ —— 治标,缺陷仍在:任何新目标项目自选命名空间都会踩同一个坑。
2. ~~任意含 `:` 的 key 视为概念~~ —— 隐式约定比显式硬编码更糟;`ADR-001` 无冒号尚可,但概念 id 的形态本就由目标项目自定,不应猜。
3. **`key in _instances(target)`** —— 实例解析判据(采纳)。

理由:同一文件内 `verify_target`(L95:`c not in inst` 报错)与 `coverage`(L151:`{c: set() for c in inst}`)已把"概念 = instances.yaml 中可解析的 id"确立为单一事实来源;`refs` 的概念分支理应同源。这同时是 dual-realm-layout 的落实:meta 工具只认目标项目登记的实例,不内嵌任何目标知识。

## 行为矩阵(修复前后)

| key 形态 | 修复前 | 修复后 |
|---|---|---|
| `es:payment-gateway`(已登记,非 sp 命名空间) | 空(缺陷) | 4 类引用,正确 |
| `sp:capability-seam`(已登记,sp 命名空间) | 概念引用列表 | 同左,不变 |
| `ADR-001`(artifact id) | supersedes 查询(空) | 同左,不变 |
| `sp:xxx`(未登记) | 概念分支,空 | artifact 分支,空(输出不变) |
| 任意未登记 key | supersedes 查询,空 | 同左,不变 |

唯一行为变化是缺陷本身:非 `sp:` 命名空间的已登记概念从"永远空"变为正确解析。

## 不做的事

- 不给 `refs` 加"key 既非实例也非 artifact id 时警告"——查询命令保持零副作用,空结果即语义(无引用)。与 verify(硬门报错)职责不同。
- 不动 bench 覆盖面(把 `refs` 加进回归)——`refs` 是查询非门,bench 原则上门命令优先;可留待演进。
