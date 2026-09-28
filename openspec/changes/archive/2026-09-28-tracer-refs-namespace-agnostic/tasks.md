## 1. 代码修复

- [x] 1.1 `meta/trace/tracer.py` `refs()`:判定 `key.startswith("sp:")` → `key in _instances(target)`,补注释说明与 verify/coverage 同判据。
- [x] 1.2 `else` 分支(artifact id / supersedes 查询)保持原行为。

## 2. 文档同步

- [x] 2.1 `meta/trace/README.md`:`refs` 示例 `sp:<concept>` → `<concept-id>`(注明须在 instances.yaml 登记),新增 ADR-id 取代链查询一行。
- [x] 2.2 根 `README.md` Layer 4 命令表:`sp:<concept>` → `<concept-id>` 并注明双用法。

## 3. 回归(全部通过,2026-09-28)

- [x] 3.1 概念向量:`refs docs/examples/eshop-demo es:payment-gateway` → requirement/report/adr/domainModel 4 类引用(修复前为 no references)。
- [x] 3.2 命名空间回归:`refs targets/dsh sp:capability-seam` → 7 处引用;`refs targets/plant-maint sp:work-order` → 8 处引用(与修复前一致)。
- [x] 3.3 artifact id 向量:`refs targets/dsh ADR-001` → no references(无 ADR 取代它,行为不变)。
- [x] 3.4 未登记 key:`refs docs/examples/eshop-demo sp:not-registered` → no references。
- [x] 3.5 全链:`verify` + `report` 三目标(dsh / plant-maint / eshop-demo)exit 0,指标与基线一致;`bench.py` 两目标 PASS(check + engine)。
