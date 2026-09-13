#!/usr/bin/env node
// =============================================================================
// DSH 适配壳契约自检 (harness 契约验证,不需要启动 DSH)
// -----------------------------------------------------------------------------
// 为什么需要它:适配壳的"宿主契约"(沙箱全局、参数 DSL、output schema 子集、
// 包内 RPC、slot 注册协议)在方法论仓库里是**外部契约**——写错了不会在 Python
// 侧报错,而是在 DSH 里以 guard rejection / render failure 的形式出现。本脚本
// 用 **DSH 自带的真实校验器**(@deepseek-ai/dsh-tools 的
// parameterSchemaSpecToJsonSchema / valueSchemaSpecToJsonSchema /
// assertSupportedJsonSchema / validateJsonSchemaValue)把这些契约钉成可回归断言。
//
// 覆盖:
//   host 半  : 能作为函数体求值(= define 期语法预检)→ inject 声明 → apply 注册
//              5 个工具 + 3 个 RPC → 每个工具的原始参数合 Guard 规则、且转换出的
//              模型可见 JSON Schema 属受支持子集 → output schema 合法 →
//              用**真实 gateway.py 产出的信封**跑 execute,值过 output schema 校验
//   client 半: 能用**真实 closure 符号表**求值 → inject slots → 在 keyed slot
//              tool.view.cordis 的 self 键上注册 → 组件可渲染(不抛错)
//
// 用法:
//   node meta/integrations/dsh/tests/verify-adapter.mjs            # 快(仅 snapshot/judge)
//   node meta/integrations/dsh/tests/verify-adapter.mjs --full      # 追加真实 bench/gate 回归
//   DSH_PACKAGE_ROOT=/path/to/node_modules/@deepseek-ai/dsh node ... # 指定 DSH 安装位置
// =============================================================================
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const HERE = path.dirname(fileURLToPath(import.meta.url))          // .../dsh/tests
const DSH_ADAPTER = path.resolve(HERE, '..')                        // .../dsh
const REPO = path.resolve(HERE, '../../../..')                      // 仓库根
const FULL = process.argv.includes('--full')

let failures = 0
function check(label, condition, detail) {
  if (condition) {
    console.log('  ok   ' + label)
  } else {
    failures += 1
    console.log('  FAIL ' + label + (detail ? '\n       ' + detail : ''))
  }
}

// ---- 解析 DSH 安装位置,并加载它自带的真实校验器 ----------------------------
function resolveDshRoot() {
  if (process.env.DSH_PACKAGE_ROOT) return process.env.DSH_PACKAGE_ROOT
  const globalRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim()
  return path.join(globalRoot, '@deepseek-ai', 'dsh')
}
const DSH_ROOT = resolveDshRoot()
const toolsEntry = path.join(DSH_ROOT, 'node_modules', '@deepseek-ai', 'dsh-tools', 'lib', 'index.js')
if (!existsSync(toolsEntry)) {
  console.error('[verify] 找不到 DSH 的 dsh-tools:' + toolsEntry)
  console.error('[verify] 用 DSH_PACKAGE_ROOT=<...>/@deepseek-ai/dsh 指定安装位置')
  process.exit(2)
}
const DSH = await import(toolsEntry)

const HOST_BODY = readFileSync(path.join(DSH_ADAPTER, 'dynamic', 'methodology.host.js'), 'utf8')
const CLIENT_BODY = readFileSync(path.join(DSH_ADAPTER, 'dynamic', 'methodology.client.js'), 'utf8')

// ---- 跑真实 gateway.py,拿真实信封(不是手写 fixture) ----------------------
function venvPython() {
  const p = path.join(REPO, 'meta', 'scripts', '.venv', 'bin', 'python')
  return existsSync(p) ? p : null
}
function runGateway(args) {
  const py = venvPython()
  const env = { ...process.env, UV_CACHE_DIR: path.join(REPO, '.uv-cache'), UV_PYTHON_INSTALL_DIR: path.join(REPO, '.uv-python') }
  const out = py
    ? execFileSync(py, [path.join(REPO, 'meta', 'integrations', 'gateway.py'), ...args], { cwd: REPO, env, encoding: 'utf8' })
    : execFileSync('uv', ['run', '--project', 'meta/scripts', 'python', 'meta/integrations/gateway.py', ...args], { cwd: REPO, env, encoding: 'utf8' })
  return JSON.parse(out)
}
function safeGateway(args) {
  try { return runGateway(args) } catch (error) {
    // 非 0 exit 时 execFileSync 抛错,但 stdout 仍是合法信封
    if (error.stdout) { try { return JSON.parse(error.stdout) } catch { /* fallthrough */ } }
    throw error
  }
}

console.log('[verify] DSH: ' + DSH_ROOT)
console.log('[verify] repo: ' + REPO)

// ===========================================================================
// 1. HOST 半
// ===========================================================================
console.log('\n== host half ==')
const registered = []
const handlers = {}
const shellCalls = []
let cannedEnvelope = null
// shell 实现的**默认工作目录**。默认等于仓库根(理想环境);回归用例会把它改成
// 别的目录,以复现"插件跑在非仓库根 cwd 下"的真实故障(uv 报
// `Project directory 'meta/scripts' does not exist`)。
let shellDefaultWorkdir = REPO

function shellResult(spec, text, exitCode) {
  return {
    exitCode: exitCode === undefined ? 0 : exitCode,
    signal: null,
    timedOut: false,
    aborted: false,
    timeoutMs: spec.timeoutMs,
    stdout: { text, truncated: false },
    stderr: { text: '', truncated: false },
  }
}

// 假 shell:只记录命令并按需回放真实 gateway 信封,不真的起进程。
const fakeShell = {
  resolve(request) {
    return { ...request, workdir: request.workdir || shellDefaultWorkdir, timeoutMs: request.timeoutMs || 1000 }
  },
  async run(spec) {
    shellCalls.push(spec)
    // 仓库根探测命令:按命令里**实际写出的候选列表**回答,只有候选等于 REPO 才
    // 视为"该目录下有 gateway.py"。假 shell 因此不预设 host 的候选顺序。
    if (spec.command.includes('REPO_INDEX')) {
      const candidates = [...spec.command.matchAll(/'([^']*)'/g)].map(m => m[1])
      const index = candidates.indexOf(REPO)
      return index >= 0
        ? shellResult(spec, 'REPO_INDEX=' + index + '\n')
        : shellResult(spec, 'REPO_NONE\n', 3)
    }
    return shellResult(spec, JSON.stringify(cannedEnvelope))
  },
}
const mockHarness = {
  // 真实 sandbox 会在这里做 raw→DSL 转换与校验;测试中由 rawToDsl 复刻该规则。
  defineTool: (def) => def,
  registerTool: (_ctx, tool) => { registered.push(tool); return () => {} },
  handle: (method, fn) => { handlers[method] = fn; return () => {} },
}
const sandboxConsole = { log: () => {}, info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }

// 与 cordis-host-runner 的 createSandbox 相同的全局面:harness 是沙箱**全局**,
// 所以必须用 node:vm 建 realm(用 new Function 会得到 "harness is not defined");
// 与 precheckCode/evaluateHostCode 相同的包裹方式:(async () => { <body> })()。
const HOST_WRAPPED = '(async () => {\n' + HOST_BODY + '\n})()'
function evaluateHostHalf() {
  const sandbox = {
    harness: mockHarness,
    console: sandboxConsole,
    btoa: (s) => Buffer.from(s, 'utf-8').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('utf-8'),
    TextEncoder,
    TextDecoder,
  }
  const context = vm.createContext(sandbox)
  return vm.runInContext(HOST_WRAPPED, context, { filename: 'methodology.host.js' })
}

let plugin = null
try {
  // define 期预检:只编译不执行(precheckCode 用的就是这一步)。
  // oxlint-disable-next-line no-new-func -- 复刻 DSH define 期语法门
  new Function(HOST_WRAPPED)
  check('host body 过 define 期语法预检', true)
} catch (error) {
  check('host body 过 define 期语法预检', false, error.message)
}
try {
  plugin = await evaluateHostHalf()
  check('host body 在 vm realm 中求值为 plugin', true)
} catch (error) {
  check('host body 在 vm realm 中求值为 plugin', false, error.message)
}
check('返回 Cordis plugin 形状(有 apply)', plugin && typeof plugin.apply === 'function')
check('声明 shell 硬依赖', Array.isArray(plugin && plugin.inject) && plugin.inject.includes('shell'))

// 可选依赖:只暴露 .path 这一个标量(与真实 Workspace 实体同样只取叶子字段)。
const mockWorkspaceRegistry = { list: () => [{ path: REPO }] }
const mockCtx = {
  get: (name) => (name === 'shell' ? fakeShell : (name === 'workspaceRegistry' ? mockWorkspaceRegistry : undefined)),
  effect: (cb) => { const d = cb(); return typeof d === 'function' ? d : () => {} },
  on: () => () => {},
}
let applyError = null
try {
  plugin.apply(mockCtx)
} catch (error) {
  applyError = error
}
check('apply 无异常', applyError === null, applyError && applyError.stack)

const EXPECTED_TOOLS = ['methodology_bench', 'methodology_check', 'methodology_judge', 'methodology_gate', 'methodology_status']
const names = registered.map(t => t.name)
check('注册 5 个模型工具', names.length === 5, 'got: ' + names.join(', '))
for (const want of EXPECTED_TOOLS) check('  含 ' + want, names.includes(want))
check('注册 snapshot/judge/gate 三个包内 RPC', ['snapshot', 'judge', 'gate'].every(m => typeof handlers[m] === 'function'),
  'got: ' + Object.keys(handlers).join(', '))

// ---- 参数与输出 schema 的契约检查(用真实 DSH 校验器) ----------------------
console.log('\n== tool schemas (real DSH validators) ==')
/** 复刻 guard.normalizeParameterSchemaSpec 对 object 根(raw)的规则,把 raw 转成 DSL。 */
function rawToDsl(rawParameters) {
  const required = new Set(rawParameters.required || [])
  const dsl = {}
  for (const [key, prop] of Object.entries(rawParameters.properties)) {
    dsl[key] = { ...prop }
    if (required.has(key)) dsl[key].required = true
  }
  return dsl
}
for (const raw of registered) {
  // 跨 realm 复刻:guard 会把 VM 值重建为宿主对象后再交给 defineTool;
  // 这里用 JSON 往返模拟该边界(函数仍来自 VM,执行路径不变)。
  const tool = {
    ...raw,
    parameters: JSON.parse(JSON.stringify(raw.parameters)),
    output: { ...raw.output, schema: JSON.parse(JSON.stringify(raw.output.schema)) },
  }
  const params = tool.parameters
  const okShape = params && params.type === 'object' && params.properties && !Array.isArray(params.properties)
  check(tool.name + ': 参数为 object 根(raw 模式)', !!okShape)
  if (!okShape) continue
  const illegal = Object.entries(params.properties)
    .filter(([, p]) => Object.hasOwn(p, 'required') && p.type !== 'object')
    .map(([k]) => k)
  check(tool.name + ': raw 模式无属性级 required(Guard 会拒)', illegal.length === 0, 'violations: ' + illegal.join(', '))
  const badRequired = (params.required || []).filter(k => !Object.hasOwn(params.properties, k))
  check(tool.name + ': required 只点名已声明属性', badRequired.length === 0, 'violations: ' + badRequired.join(', '))
  try {
    const jsonSchema = DSH.parameterSchemaSpecToJsonSchema(rawToDsl(params))
    DSH.assertSupportedJsonSchema(jsonSchema)
    check(tool.name + ': 参数转出的模型 schema 属受支持子集', true)
  } catch (error) {
    check(tool.name + ': 参数转出的模型 schema 属受支持子集', false, error.message)
  }
  try {
    const valueSchema = DSH.valueSchemaSpecToJsonSchema(tool.output.schema)
    DSH.assertSupportedJsonSchema(valueSchema)
    check(tool.name + ': output schema 属受支持子集', true)
  } catch (error) {
    check(tool.name + ': output schema 属受支持子集', false, error.message)
  }
}

// ---- 用真实信封跑 execute,值必须过 output schema -------------------------
console.log('\n== execute against real gateway envelopes ==')
const envelopes = {
  snapshot: safeGateway(['snapshot', '--target', 'targets/dsh']),
  judgeAccept: safeGateway(['judge', '--candidate', 'meta/evolution/retro/accept-example.yaml']),
  judgeReject: safeGateway(['judge', '--candidate', 'meta/evolution/retro/reject-example.yaml']),
}
if (FULL) {
  envelopes.bench = safeGateway(['bench', '--target', 'targets/dsh'])
  envelopes.gate = safeGateway(['gate', '--target', 'targets/dsh', '--candidate', 'meta/evolution/retro/accept-example.yaml'])
}
// 无 judge 的 gate 形状(来自真实 judge 信封,抽掉 judge)覆盖 judge 缺席分支
const benchShaped = FULL ? envelopes.bench : { ...envelopes.judgeAccept, command: 'bench', judge: null }

const CASES = [
  ['methodology_status', { repo: REPO }, envelopes.snapshot],
  ['methodology_judge', { candidate: 'meta/evolution/retro/accept-example.yaml' }, envelopes.judgeAccept],
  ['methodology_judge', { candidate: 'meta/evolution/retro/reject-example.yaml' }, envelopes.judgeReject],
  ['methodology_check', { target: 'targets/dsh' }, benchShaped],
  ['methodology_bench', { target: 'targets/dsh' }, benchShaped],
  ['methodology_gate', { target: 'targets/dsh' }, benchShaped],
]
if (FULL) CASES.push(['methodology_gate', { target: 'targets/dsh', candidate: 'meta/evolution/retro/accept-example.yaml' }, envelopes.gate])

for (const [name, args, envelope] of CASES) {
  const tool = registered.find(t => t.name === name)
  const label = name + ' ' + JSON.stringify(args)
  if (!tool) { check(label, false, 'tool not registered'); continue }
  cannedEnvelope = envelope
  shellCalls.length = 0
  let value = null
  try {
    value = await tool.execute(args, { signal: undefined })
  } catch (error) {
    check(label + ': execute', false, error.message)
    continue
  }
  check(label + ': execute 返回对象', value && typeof value === 'object')
  try {
    const schema = DSH.valueSchemaSpecToJsonSchema(JSON.parse(JSON.stringify(tool.output.schema)))
    const violations = DSH.validateJsonSchemaValue(schema, JSON.parse(JSON.stringify(value)), '')
    check(label + ': 值过 output schema', violations.length === 0, JSON.stringify(violations).slice(0, 400))
  } catch (error) {
    check(label + ': 值过 output schema', false, error.message)
  }
  // 命令确实被拼出来了:先解析仓库根,再拼 venv/uv 回落 + UV_* 指到工作目录
  // 真正调用网关的那次 shell(探测命令里也含字面量 "gateway.py",用只有 RUNNER
  // 才有的 ".uv-cache" 来区分)
  const gatewayCall = shellCalls.find(c => c.command.includes('.uv-cache'))
  const cmd = gatewayCall ? gatewayCall.command : ''
  check(label + ': shell 命令可执行形状', cmd.includes('gateway.py') && cmd.includes('.uv-cache'), cmd)
  check(label + ': 网关调用显式钉住 workdir', !!gatewayCall && gatewayCall.workdir === REPO,
    gatewayCall && String(gatewayCall.workdir))
  // 领域性失败不走 isError:judge REJECT 应返回 ok=false 而不是抛错
  if (name === 'methodology_judge' && envelope.judge && envelope.judge.verdict !== 'ACCEPT') {
    check(label + ': REJECT 是结构化值而非工具错误', value.ok === false && value.judgeVerdict === 'REJECT/DEFER')
  }
  let blocks = null
  try { blocks = tool.output.render(args, value) } catch (error) { blocks = null; check(label + ': render', false, error.message) }
  if (blocks) {
    check(label + ': render 产出文本块', Array.isArray(blocks) && blocks.length > 0 && blocks[0].type === 'text' && typeof blocks[0].text === 'string')
  }
}

// ---- 包内 RPC 用真实信封走一遍 ---------------------------------------------
console.log('\n== host RPC ==')
for (const [method, args, envelope] of [
  ['snapshot', {}, envelopes.snapshot],
  ['judge', { candidate: 'meta/evolution/retro/accept-example.yaml' }, envelopes.judgeAccept],
  ['gate', { target: 'targets/dsh' }, benchShaped],
]) {
  cannedEnvelope = envelope
  try {
    const value = await handlers[method](args)
    check('host.call("' + method + '")', !!value && !!value.gateway)
  } catch (error) {
    check('host.call("' + method + '")', false, error.message)
  }
}
try {
  await handlers.gate({})
  check('host.call("gate") 缺 target 时报错', false)
} catch {
  check('host.call("gate") 缺 target 时报错', true)
}

// ---- 回归:shell 默认工作目录 ≠ 仓库根 --------------------------------------
// 这是旧版的真实故障:host 依赖 shell 的隐式 cwd,于是 gateway 根本没跑起来。
// 适配壳现在必须自己解析出仓库根,并把 workdir 钉死在解析结果上。
console.log('\n== 回归:默认工作目录不是仓库根 ==')
const statusTool = registered.find(t => t.name === 'methodology_status')
shellDefaultWorkdir = '/nonexistent/default-cwd'
cannedEnvelope = envelopes.snapshot
shellCalls.length = 0
try {
  const value = await statusTool.execute({}, { signal: undefined })
  check('默认 cwd 错误时仍解析出仓库根', value.root === REPO, 'root=' + value.root)
  // 真正调用网关的那次 shell(探测命令里也含字面量 "gateway.py",用只有 RUNNER
  // 才有的 ".uv-cache" 来区分)
  const gatewayCall = shellCalls.find(c => c.command.includes('.uv-cache'))
  check('  网关调用仍钉在解析出的仓库根', !!gatewayCall && gatewayCall.workdir === REPO)
  check('  探测只走一次 shell 往返', shellCalls.filter(c => c.command.includes('REPO_INDEX')).length === 1)
} catch (error) {
  check('默认 cwd 错误时仍解析出仓库根', false, error.message)
} finally {
  shellDefaultWorkdir = REPO
}
// 显式 repo 优先:不再做探测往返
shellCalls.length = 0
try {
  await statusTool.execute({ repo: REPO }, { signal: undefined })
  check('显式 repo 跳过探测(0 次探测往返)', shellCalls.filter(c => c.command.includes('REPO_INDEX')).length === 0)
} catch (error) {
  check('显式 repo 跳过探测(0 次探测往返)', false, error.message)
}

// ===========================================================================
// 2. CLIENT 半
// ===========================================================================
console.log('\n== client half ==')
// 与 cordis-client-runner 的 evaluator 相同的闭包符号表。
const CLIENT_PARAMS = ['React', 'console', 'styles', 'host', 'harness', 'setTimeout', 'setInterval',
  'clearTimeout', 'clearInterval', 'fetch', 'require', 'process', 'Buffer']
const trap = () => { throw new Error('withheld global touched') }
const React = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
  useEffect: () => {},
}
const insertedCss = []
const clientHost = { call: async () => { throw new Error('host.call 未在渲染冒烟测试中桩接') } }
let clientPlugin = null
try {
  const factory = new Function(...CLIENT_PARAMS, 'return (async () => {\n' + CLIENT_BODY + '\n})()')
  clientPlugin = await factory(React, console, { insert: (css) => { insertedCss.push(css); return () => {} } },
    clientHost, {}, trap, trap, trap, trap, trap, trap, undefined, undefined)
  check('client body 以真实闭包符号表求值', true)
} catch (error) {
  check('client body 以真实闭包符号表求值', false, error.message)
}
check('声明 slots 依赖', Array.isArray(clientPlugin && clientPlugin.inject) && clientPlugin.inject.includes('slots'))

const injections = []
const registrations = []
const fakeSlots = {
  inject: (slotName, cb) => { injections.push(slotName); cb(); return () => {} },
  register: (options, component) => { registrations.push({ options, component }); return () => {} },
}
let clientApplyError = null
try {
  clientPlugin.apply({ get: (name) => (name === 'slots' ? fakeSlots : undefined), effect: (cb) => { cb(); return () => {} } })
} catch (error) {
  clientApplyError = error
}
check('client apply 无异常', clientApplyError === null, clientApplyError && clientApplyError.stack)
check('注入 tool.view.cordis slot', injections.includes('tool.view.cordis'))
const reg = registrations[0]
check('在 keyed slot 上以 key="self" 注册',
  !!reg && reg.options && reg.options.name === 'tool.view.cordis' && reg.options.key === 'self',
  JSON.stringify(reg && reg.options))
check('组件是函数', !!reg && typeof reg.component === 'function')
check('插入了自有样式(styles.insert)', insertedCss.length > 0)
let renderError = null
let element = null
try {
  element = reg.component({ pluginId: 'p1', packageId: 'k1', pluginRunId: 'r1' })
} catch (error) {
  renderError = error
}
check('组件可渲染(空快照分支)', renderError === null && !!element, renderError && renderError.message)

// ===========================================================================
console.log('\n[verify] ' + (failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'))
process.exit(failures === 0 ? 0 : 1)
