# 仓库根解析的 repo.conf 兜底层

## 病灶

`resolveRoot`(两半逐段一致)的候选只有:显式 `repo`、shell 默认 workdir、workspaceRegistry 路径。全局安装(`~/.local/share/ontology-methodology`)不在候选内 → 无关项目会话中 5 工具全部要求显式 `repo:`。这是「安装通道」(install.sh → 全局 DEST)与「发现通道」(workspace 探测)之间的**结构性缺口**:装得到,发现不了。

## 设计决策

### D1 登记文件与位置

- `~/.config/ontology-methodology/repo.conf`(POSIX)/ `%LOCALAPPDATA%\ontology-methodology\repo.conf`(Windows)。
- 纯文本多行,每行一个绝对路径,首行优先;注释行(`#`开头)与空行忽略。
- 选文本而非 JSON/YAML:一行 `cat`+循环即可消费,无需解析器;适配壳侧的探测脚本已在 shell 里。

### D2 优先级:R1 兜底(已确认)

解析链:**显式 repo → cwd/registry 探测 → repo.conf 逐行 → 报错**。

repo.conf 排在探测之后(而非最优先)的理由:开发 clone 会话(以本体仓库为工作区)必须继续命中开发 clone,否则改 master、跑 v0.1.0 tag 的版本错位且隐蔽——repo.conf 的语义是「机器默认安装位置」= 默认值(同 git config 的 local>global 层次),不是「全局锁定」。

### D3 单次往返不破坏

现行实现把所有候选的 `[ -f <cand>/meta/integrations/gateway.py ]` 检查合并成**一次** shell 往返(`REPO_INDEX=<n>` 协议)。repo.conf 读取必须并入同一往返,不允许"先 cat conf 再探测"的两次往返。实现:探测脚本前段加 conf 读取与逐行验证,命中输出 `REPO_INDEX=<n>`,编号空间与探测候选连续(conf 行追加在探测候选之后、同一数组同一循环)。

### D4 失效语义:静默跳过

- conf 文件不存在/不可读/为空 → 无 conf 候选,回退现行链路;
- conf 行指向的目录不存在或缺 gateway.py → 该行静默跳过;
- 绝不因坏 conf 抛错——坏配置只回到现状,不产生新故障。

### D5 登记侧自动化(install 脚本)

- install.sh / install.ps1 冒烟校验通过后、`say 装好` 之前执行登记;
- 逻辑:`DEST` 已在 conf 中 → 移到首行(去重);不在 → 作为首行插入;mkdir -p 父目录;
- 幂等:重复 install 同一 DEST 不产生重复行;
- 不提供卸载钩子(用户删目录后 conf 行自然失效、解析侧静默跳过——D4 已兜住)。

### D6 与既有等价断言的关系

`resolveRoot`/`candidateRoots` 段的等价断言自动覆盖两半同步;假 shell 需新增对 conf 语义的建模(命令含 conf 读取片段时,按 conf 行内容作答),否则回归对新分支失真。

## 备选与放弃理由

- **环境变量**(`METHODOLOGY_REPO`):每次会话要人记得 export,与「避免用户手动维护」冲突;且 install 脚本写 env 需改 shell rc,侵入性更强。放弃。
- **conf 最优先(R2)**:开发 clone 版本错位陷阱(见 D2)。放弃。
- **gateway.py 侧解析**:core 层 `Path(__file__)` 自持定位无此问题;解析缺口只在适配壳。不涉及。
- **把全局 DEST 注册进 workspaceRegistry**:DSH 的注册表归 DSH 管,本体安装脚本不应跨界写宿主状态。放弃。

## 风险与对策

| 风险 | 对策 |
|---|---|
| conf 行指向旧 tag 的安装(升级后 DEST 不变,内容已 checkout 新 tag) | 这正是期望行为:install.sh 更新同一 DEST 并重写 conf 首行 |
| conf 被多用户/多机器共享 | conf 在用户 HOME 下,天然按用户隔离 |
| 探测脚本变长导致注入/转义问题 | conf 行经 `q()` 单引号转义后拼入循环,与现行候选同一处理路径 |
| 已装 v0.1.0 profile 不含新逻辑 | 本变更只进 master;重装需新 tag——proposal 已声明,不阻塞 |
