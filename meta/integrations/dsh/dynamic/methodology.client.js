// =============================================================================
// DSH 适配壳 —— Cordis 动态插件 **Client 半**(code.client)
// -----------------------------------------------------------------------------
// 定位:适配层的"感知面 + 交互面"。它把 host 半通过 harness.handle 暴露的
// 包内私有 RPC(snapshot / judge / gate)渲染成 Cordis Run 卡片里的一个面板:
// 直接看到当前候选与三条件判决,并在卡片上原地触发闸门 —— 免去"切回终端敲脚本"。
//
// 运行环境约束(浏览器半 closure,见 cordis-plugin-development skill):
//   - 这是 **函数体**,不是模块:没有 import / require / JSX / TS。
//   - 可用闭包符号只有:React / console / styles / host / harness(陷阱)/
//     setTimeout 等陷阱 / process(undefined)/ Buffer(undefined)。
//   - 建元素只能用 React.createElement;定时器要走 timer service;
//     网络一律回 host 半(host.call),浏览器半不发请求。
//   - 只读当前需要的标量字段,不要整体复制/序列化 DSH 的 live 对象。
//
// 该面板注册在 keyed slot `tool.view.cordis` 的 `self` 键上:
// 运行期 self 绑定 pluginId + packageId,所以同一包多次运行时,最新一次 Run 卡片
// 承载本 UI,旧卡片自动降级 —— 不需要也不能把 pluginRunId 写进 key。
// =============================================================================
return {
  inject: ['slots'],
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return

    // ---- 轻量样式:只用主题变量/currentColor,不写死色值 -------------------
    const CSS = [
      '.md-adapter { font-size: 12px; line-height: 1.6; color: inherit; }',
      '.md-adapter h4 { margin: 0 0 6px; font-size: 12px; font-weight: 600; }',
      '.md-adapter .md-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }',
      '.md-adapter .md-muted { opacity: 0.65; }',
      '.md-adapter .md-box { border: 1px solid currentColor; border-radius: 6px; padding: 8px; margin-top: 6px; opacity: 0.95; }',
      '.md-adapter button { font: inherit; padding: 2px 8px; border-radius: 4px; border: 1px solid currentColor; background: transparent; color: inherit; cursor: pointer; }',
      '.md-adapter button[disabled] { opacity: 0.5; cursor: default; }',
      '.md-adapter ul { margin: 4px 0 0; padding-left: 16px; }',
      '.md-adapter code { font-family: ui-monospace, monospace; opacity: 0.9; }',
      '.md-adapter .md-fail { font-weight: 600; }',
    ].join('\n')
    ctx.effect(() => styles.insert(CSS))

    function conditionLabel(name, value) {
      const mark = value === 'pass' ? '✓' : (value === 'fail' ? '✗' : '?')
      return mark + ' ' + name
    }

    function Panel(props) {
      const [target, setTarget] = React.useState('targets/dsh')
      const [busy, setBusy] = React.useState('')
      const [error, setError] = React.useState('')
      const [snap, setSnap] = React.useState(null)
      const [result, setResult] = React.useState(null)

      function loadSnapshot() {
        setError('')
        host.call('snapshot', {})
          .then(function (env) { setSnap(env && env.snapshot ? env.snapshot : null) })
          .catch(function (err) { setError(String(err && err.message ? err.message : err)) })
      }

      React.useEffect(function () { loadSnapshot() }, [])

      function runJudge(candidatePath) {
        setBusy('judge')
        setError('')
        host.call('judge', { candidate: candidatePath, target: target })
          .then(function (env) { setResult(env); setBusy('') })
          .catch(function (err) { setError(String(err && err.message ? err.message : err)); setBusy('') })
      }

      function runGate() {
        setBusy('gate')
        setError('')
        host.call('gate', { target: target })
          .then(function (env) { setResult(env); setBusy('') })
          .catch(function (err) { setError(String(err && err.message ? err.message : err)); setBusy('') })
      }

      const children = []
      children.push(React.createElement('h4', { key: 'title' }, '方法论闸门适配层 (Layer 3)'))
      children.push(React.createElement('div', { key: 'target', className: 'md-row' },
        React.createElement('span', { className: 'md-muted' }, 'target'),
        React.createElement('input', {
          value: target,
          onChange: function (event) { setTarget(event.target.value) },
          style: { font: 'inherit', padding: '2px 6px', minWidth: '160px' },
        }),
        React.createElement('button', { onClick: runGate, disabled: busy !== '' },
          busy === 'gate' ? '跑全链中…' : '跑全链 (bench + judge)'),
        React.createElement('button', { onClick: loadSnapshot, disabled: busy !== '' }, '刷新快照'),
      ))

      if (snap) {
        const frame = snap.frame || {}
        children.push(React.createElement('div', { key: 'frame', className: 'md-muted' },
          'frame v' + String(frame.schemaVersion) + ' · 概念类型 ' + ((frame.conceptTypes || []).length)
          + ' · 阶段 ' + ((snap.orchestratorStages || []).join(' → '))))
        const rows = (snap.candidates || []).map(function (c) {
          return React.createElement('li', { key: c.path },
            React.createElement('code', null, String(c.id || c.path)),
            ' [' + String(c.target || '?') + '] bench=' + String(c.benchStatus || '?')
            + ' add-only=' + String(c.addOnly === true ? 'true' : (c.addOnly === false ? 'false' : '?'))
            + ' change=' + (c.changeRecordExists ? '存在' : '缺失') + ' ',
            React.createElement('button', {
              onClick: function () { runJudge(c.path) },
              disabled: busy !== '',
            }, '判定'),
          )
        })
        children.push(React.createElement('div', { key: 'cands', className: 'md-box' },
          React.createElement('div', null, '复盘候选 ' + rows.length + ' 条'),
          rows.length > 0 ? React.createElement('ul', null, rows)
            : React.createElement('div', { className: 'md-muted' }, 'meta/evolution/retro/ 下暂无候选'),
        ))
      }

      if (error) {
        children.push(React.createElement('div', { key: 'err', className: 'md-box md-fail' }, '错误: ' + error))
      }

      if (result) {
        const g = result.gateway || {}
        const j = result.judge || null
        const steps = (result.steps || []).map(function (s, index) {
          return React.createElement('li', { key: String(s.name) + index },
            (s.ok ? 'ok ' : 'FAIL ') + String(s.name) + ': ' + String(s.summary || ''))
        })
        const verdictText = String(g.verdict || '?') + ' (exit ' + String(g.exitCode) + ')'
        children.push(React.createElement('div', { key: 'res', className: 'md-box' },
          React.createElement('div', { className: g.verdict === 'pass' ? '' : 'md-fail' },
            String(g.command || '?') + ' → ' + verdictText),
          React.createElement('ul', null, steps),
          j ? React.createElement('div', null,
            'judge ' + String(j.verdict) + ': '
            + conditionLabel('记录', (j.conditions || {}).record) + ' · '
            + conditionLabel('回归', (j.conditions || {}).bench) + ' · '
            + conditionLabel('add-only', (j.conditions || {}).addonly),
            React.createElement('ul', null, (j.notes || []).map(function (n, index) {
              return React.createElement('li', { key: 'n' + index }, String(n))
            })),
          ) : null,
        ))
      }

      return React.createElement('div', { className: 'md-adapter' }, children)
    }

    slots.inject('tool.view.cordis', function () {
      return slots.register({ name: 'tool.view.cordis', key: 'self' }, Panel)
    })
  },
}
