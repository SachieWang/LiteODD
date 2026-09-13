#!/usr/bin/env python3
# =============================================================================
# DSH 适配壳 —— cordis_define 入参构建器
# -----------------------------------------------------------------------------
# 为什么需要它:DSH 的动态插件是"把两段 JS 函数体当作参数传给 cordis_define",
# 手工把两个文件内容抄进工具参数既易错又会漂移。本脚本把 dynamic/*.js **原样**
# 拼成 cordis_define 的合法入参 JSON,一处改源、处处一致。
#
# 用法:
#   python meta/integrations/dsh/dynamic/build_payload.py            # 新建插件 payload
#   python meta/integrations/dsh/dynamic/build_payload.py --existing mthd-1   # 追加新版本
#
# 产物默认写到同目录 define.payload.json(git 忽略;它是从源生成的派生物)。
# 拿到 payload 后:把它的字段作为 cordis_define 的入参,再用返回的
# pluginId/packageId 调 cordis_run。
# =============================================================================
from __future__ import annotations

import argparse
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent

PURPOSE = ("把本体驱动方法论工具链接入 DSH:单一网关(check/bench/judge)的 5 个模型工具、"
           "契约只读快照,以及 Cordis Run 卡片里的判决面板。")


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Build the cordis_define payload from the two JS halves")
    p.add_argument("--existing", default=None, metavar="PLUGIN_ID",
                   help="已有插件 id:生成 kind=existing 的追加版本 payload(修 bug / 加字段)")
    p.add_argument("--id-prefix", default="mthd", help="新插件的语义前缀(3-6 个小写字母),默认 mthd")
    p.add_argument("--out", default=str(HERE / "define.payload.json"), help="输出 JSON 路径")
    a = p.parse_args(argv)

    host = (HERE / "methodology.host.js").read_text(encoding="utf-8")
    client = (HERE / "methodology.client.js").read_text(encoding="utf-8")

    if a.existing:
        plugin = {"kind": "existing", "pluginId": a.existing}
    else:
        plugin = {"kind": "new", "idPrefix": a.id_prefix}

    payload = {
        "plugin": plugin,
        "name": "methodology-adapter",
        "purpose": PURPOSE,
        "code": {"host": host, "client": client},
    }

    out = pathlib.Path(a.out)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[build] wrote {out}")
    print(f"[build] plugin={plugin['kind']} host={len(host)}B client={len(client)}B")
    return 0


if __name__ == "__main__":
    sys.exit(main())
