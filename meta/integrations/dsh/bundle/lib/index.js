// =============================================================================
// 方法论适配壳 —— 常驻 bundle Host 半(静态 Cordis 插件)
// -----------------------------------------------------------------------------
// 与 dynamic/methodology.host.js 的关系:工具定义、schema、execute 逻辑从
// ../shared/tools.core.js import(单一事实源);两边由 tests/verify-adapter.mjs
// 的等价断言强制一致。差异只允许是包裹方式:
//   动态:harness.defineTool + harness.registerTool(沙箱全局)
//   静态:ctx.tools.register(defineTool(...))(官方 07-into-the-harness 形态)
// 常驻形态不注册 host.call RPC —— 没有浏览器半消费它(6.1 分步,C2 再议)。
// =============================================================================
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  RUNNER, GATEWAY_REL, q, GATE_SCHEMA, STATUS_SCHEMA,
  P_REPO, P_TARGET, P_CANDIDATE, textBlock,
  toGateValue, toStatusValue,
} from '../shared/tools.core.js'

export const name = 'methodology-adapter'
export const inject = ['tools', 'shell']

export function apply(ctx) {
  const shell = ctx.shell

  function candidateRoots() {
    const out = []
    const push = function (value) {
      if (typeof value !== 'string' || value.length === 0) return
      if (out.indexOf(value) === -1) out.push(value)
    }
    try {
      const probe = shell.resolve({ command: 'true' })
      if (probe && typeof probe.workdir === 'string') push(probe.workdir)
    } catch (error) { /* 探测失败不致命:继续用工作区候选 */ }
    const registry = ctx.get('workspaceRegistry')
    if (registry !== undefined) {
      try {
        const workspaces = registry.list()
        for (let i = 0; i < workspaces.length; i++) {
          push(workspaces[i] ? workspaces[i].path : '')
        }
      } catch (error) { /* 注册表不可用则忽略 */ }
    }
    return out
  }

  async function resolveRoot(args, exec) {
    const explicit = args && typeof args.repo === 'string' ? args.repo : ''
    if (explicit.length > 0) return explicit
    const roots = candidateRoots()
    if (roots.length === 0) {
      throw new Error('methodology adapter 无法解析仓库根:未提供 repo,也没有可探测的候选目录。请显式传 repo(方法论仓库根的绝对路径)。')
    }
    const quoted = []
    for (let i = 0; i < roots.length; i++) quoted.push(q(roots[i]))
    const script = 'i=0; for d in ' + quoted.join(' ') + '; do '
      + 'if [ -f "$d/' + GATEWAY_REL + '" ]; then echo "REPO_INDEX=$i"; exit 0; fi; '
      + 'i=$((i+1)); done; echo REPO_NONE; exit 3'
    const request = { command: script, timeoutMs: 30000 }
    if (exec && exec.signal) request.signal = exec.signal
    const result = await shell.run(shell.resolve(request))
    const stdout = result.stdout && result.stdout.text ? result.stdout.text : ''
    const matched = stdout.match(/REPO_INDEX=(\d+)/)
    if (matched) {
      const hit = roots[Number(matched[1])]
      if (typeof hit === 'string') return hit
    }
    throw new Error('methodology adapter 未能在候选目录中找到 ' + GATEWAY_REL + ';候选: '
      + roots.join(' , ') + '。请用 repo 参数显式指定方法论仓库根。')
  }

  async function runGateway(subArgs, args, exec) {
    const root = await resolveRoot(args, exec)
    const command = 'cd ' + q(root) + ' && ' + RUNNER + ' ' + subArgs.join(' ')
    const request = { command: command, workdir: root, timeoutMs: 600000, stdoutMaxBytes: 4194304 }
    if (exec && exec.signal) request.signal = exec.signal
    const result = await shell.run(shell.resolve(request))
    const stdout = result.stdout && result.stdout.text ? result.stdout.text : ''
    const stderr = result.stderr && result.stderr.text ? result.stderr.text : ''
    let env = null
    try {
      env = JSON.parse(stdout)
    } catch (error) {
      throw new Error('methodology gateway 输出不是 JSON(exit ' + String(result.exitCode) + ')。'
        + '仓库根解析为 ' + root + '(候选: ' + candidateRoots().join(' , ') + ')。'
        + '请确认该目录下存在 ' + GATEWAY_REL + ',或用 repo 参数显式指定。'
        + ' stdout 尾部: ' + stdout.slice(-400) + ' | stderr 尾部: ' + stderr.slice(-400))
    }
    if (env.gateway && Number(env.gateway.exitCode) === 2) {
      throw new Error('methodology gateway 用法/基础设施错误: ' + String(env.error || '(无说明)'))
    }
    return env
  }

  function register(name, description, parameters, run) {
    const tool = defineTool({
      name: name,
      description: description,
      parameters: parameters,
      output: {
        schema: GATE_SCHEMA,
        render: function (toolArgs, value) { return textBlock(value.summary) },
      },
      execute: run,
    })
    ctx.tools.register(tool)
  }

  const COMMON = '本工具是集成适配壳,只触发 meta/integrations/gateway.py 并搬运结果;'
    + '吸收是否合规的裁决仍只由 core 的 judge.py/bench.py 定义,壳不复制、不改写。'

  // 静态 defineTool 的 parameters 走 DSL 形态:根就是属性映射,属性值是值 schema,
  // 必填用属性级 required —— 与动态半 raw 形态经沙箱转换后的结果等价。
  register('methodology_bench',
    COMMON + ' 跑 Layer 3 基准回归:check.py(Layer 0 合规)+ engine.py(Layer 2 确定性闸门)。全部通过才 ok=true。',
    { target: { ...P_TARGET, required: true }, repo: P_REPO },
    async function (args, exec) {
      return toGateValue(await runGateway(['bench', '--target', q(args.target)], args, exec))
    })

  register('methodology_check',
    COMMON + ' 只跑 Layer 0 单一合规校验 check.py(三段不变量 + conceptRef 解析),不做回归。',
    { target: { ...P_TARGET, required: true }, repo: P_REPO },
    async function (args, exec) {
      return toGateValue(await runGateway(['check', '--target', q(args.target)], args, exec))
    })

  register('methodology_judge',
    COMMON + ' 对一条复盘候选跑 Layer 3 收敛裁判 judge.py:结构化返回三条条件'
    + '(record/bench/addonly)与 ACCEPT / REJECT、DEFER。judge 判定 ACCEPT 只表示"准入门通过",'
    + '真正吸收仍需发起一条版本化的方法论 change。',
    {
      candidate: { ...P_CANDIDATE, required: true },
      target: { type: 'string', description: 'bench_status=auto 时必需;judge 用它实跑基准回归。' },
      repo: P_REPO,
    },
    async function (args, exec) {
      const sub = ['judge', '--candidate', q(args.candidate)]
      if (args.target) sub.push('--target', q(args.target))
      return toGateValue(await runGateway(sub, args, exec))
    })

  register('methodology_gate',
    COMMON + ' 单一网关:一次调用跑完 bench(Layer 3 回归)并在给出候选时续跑 judge。'
    + '这是替代"人手动连敲三条命令"的入口。',
    {
      target: { ...P_TARGET, required: true },
      candidate: { type: 'string', description: '可选;给出则续跑 judge。' },
      repo: P_REPO,
    },
    async function (args, exec) {
      const sub = ['gate', '--target', q(args.target)]
      if (args.candidate) sub.push('--candidate', q(args.candidate))
      return toGateValue(await runGateway(sub, args, exec))
    })

  const statusTool = defineTool({
    name: 'methodology_status',
    description: '读取方法论契约的只读快照(感知面):frame 版本与概念/关系类型、元模型清单、'
      + '编排阶段、五类吸收目标、当前复盘候选及其自述字段、目标项目清单、以及唯一权威闸门命令。'
      + '写候选或判断"下一步该跑什么"之前先看它,免去每轮手动翻 retro.md / frame.yaml。',
    parameters: { repo: P_REPO },
    output: {
      schema: STATUS_SCHEMA,
      render: function (toolArgs, value) { return textBlock(value.summary) },
    },
    execute: async function (args, exec) {
      return toStatusValue(await runGateway(['snapshot'], args, exec))
    },
  })
  ctx.tools.register(statusTool)

  console.log('methodology adapter (resident bundle) active: 5 tools')
}
