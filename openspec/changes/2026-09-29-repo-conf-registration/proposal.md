## Why

适配壳的仓库根解析(`resolveRoot`)只认三类候选:显式 `repo` 参数、shell 默认 workdir、workspaceRegistry 工作区。全局安装的本体(`install.sh --dest ~/.local/share/ontology-methodology`)**不在任何候选之列**——装到任意无关项目(如 palantir)的会话里,5 个 `methodology_*` 工具每次都必须显式传 `repo:`,与「一键安装、零配置可用」的目标相悖。

install 脚本既然是本体的官方初始化机制,就应由它在安装时把 DEST 登记到机器级配置文件,解析侧优先消费该登记——用户无需手动维护,重装/升级自动更新。

## What Changes

- **登记侧**:`install.sh` / `install.ps1` 在安装成功后把 `$DEST`(绝对路径)写入 `~/.config/ontology-methodology/repo.conf`:`DEST 存在则移至首行,不存在则追加为首行`;幂等,多行共存(为将来多版本安装留口)。
- **解析侧**:`bundle/lib/index.js` 与 `dynamic/methodology.host.js` 的 `resolveRoot` 同步扩展(R1 兜底语义):
  - 解析链变为:显式 `repo` → cwd/registry 探测(现行)→ **repo.conf 逐行** → 报错;
  - repo.conf 读取与逐行验证**合并进现有单次 shell 往返**(探测脚本读 conf 并对每行做 `[ -f <line>/meta/integrations/gateway.py ]`,不增加往返);
  - conf 行失效(目录不存在/无 gateway.py)→ 静默跳过;conf 不存在/为空 → 回退现行链路,**坏配置不产生新故障**。
- **防漂移**:verify-adapter 假 shell 建模 repo.conf 语义(命令含读 conf 片段时按 conf 行作答),新增断言:①探测仍只走一次往返;②候选全 miss 时 conf 行兜底命中;③conf 行失效时跳过并回退报错;④显式 repo 仍跳过一切探测。
- **文档**:`dsh/README.md` §五解析顺序、`meta/integrations/README.md` 适配层条目、`P_REPO` 参数描述同步。

## Capabilities

### New Capabilities
<!-- 无 -->

### Modified Capabilities
- `methodology/integration-adapter`: 仓库根解析链新增 repo.conf 兜底层;install 脚本新增登记职责。

## Impact

- 修改:`install.sh`、`install.ps1`(登记段)、`bundle/lib/index.js` 与 `dynamic/methodology.host.js`(resolveRoot 段,两半同步)、`bundle/shared/tools.core.js`(仅 P_REPO 描述文字)、`verify-adapter.mjs`(假 shell 建模 + 新断言)、`dsh/README.md`、`meta/integrations/README.md`。
- 不修改:gateway.py、core 五脚本(它们 `Path(__file__)` 自持定位,无同类隐患——已审计)。
- 兼容性:已装 profile 的 bundle 是 v0.1.0 tag 拷贝,本变更进 master 后需打新 tag 重装才生效;repo.conf 未登记时行为与现状完全一致(零回归面)。
