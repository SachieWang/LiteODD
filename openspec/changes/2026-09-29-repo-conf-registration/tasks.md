# tasks: repo.conf 登记 + 解析兜底

## 1. 登记侧(install 脚本)

- [ ] 1.1 `install.sh`:冒烟通过后写 `~/.config/ontology-methodology/repo.conf`(DEST 去重提首行;mkdir -p;幂等)
- [ ] 1.2 `install.ps1`:同语义(`%LOCALAPPDATA%\ontology-methodology\repo.conf`)
- [ ] 1.3 头注释「刻意不做的事」段同步(登记职责已加入)

## 2. 解析侧(两半同步,等价断言钉住)

- [ ] 2.1 `bundle/lib/index.js` `resolveRoot`/探测脚本:合并 conf 读取进单次往返;conf 候选追加在探测候选后;失效行静默跳过;失败报错补「可运行本体 install.sh 自动登记」指引
- [ ] 2.2 `dynamic/methodology.host.js`:同 2.1 逐段一致
- [ ] 2.3 `bundle/shared/tools.core.js` `P_REPO` 描述同步(解析链含 repo.conf)

## 3. 回归(verify-adapter)

- [ ] 3.1 假 shell 建模 conf 语义:命令含 conf 读取时按 conf 行作答(存在/缺失/失效三种 conf)
- [ ] 3.2 新断言:候选全 miss + conf 命中 → root=conf 行;conf 行全失效 → 回退报错;显式 repo → 0 次探测往返;探测仍只 1 次往返
- [ ] 3.3 既有 106 项断言全绿(等价断言自动覆盖两半同步)

## 4. 文档

- [ ] 4.1 `dsh/README.md` §五:解析顺序表补第 4 层 repo.conf;§排障表补「conf 失效行静默跳过」说明
- [ ] 4.2 `meta/integrations/README.md`:适配层条目补「全局安装经 repo.conf 自动发现」

## 5. 全链回归

- [ ] 5.1 `node meta/integrations/dsh/tests/verify-adapter.mjs` 全绿
- [ ] 5.2 手动登记本机全局安装(`~/.local/share/ontology-methodology`)到 repo.conf 并冒烟:在非本体目录下无参调 `methodology_status` 应命中全局安装
- [ ] 5.3 gateway gate 全链(spec 校验 + bench)
