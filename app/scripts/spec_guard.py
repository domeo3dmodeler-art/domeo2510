#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OpenAPI Guard for Domeo

Проверяет согласованность OpenAPI-спеки с нашими правилами защиты /api/admin/**.
Выход: код 0 — всё ок; код 1 — есть ошибки (печатает подробности).

Правила v1:
  A. Любой путь, начинающийся с /api/admin, должен требовать bearerAuth.
  B. Для таких путей обязательно наличие 401 в возможных ответах.
  C. Публичные пути не должны требовать bearerAuth (если не перечислены в whitelist).
  D. В каждом operation объекте должен быть хотя бы один tag.

Поддерживает openapi.{yml,yaml,json}. Путь к файлу передаётся параметром --spec.
Пример: `python3 scripts/spec_guard.py --spec openapi.yaml`
"""
import argparse
import json
import sys
from pathlib import Path

try:
    import yaml  # type: ignore
except Exception:
    print("[spec_guard] pip install pyyaml", file=sys.stderr)
    sys.exit(2)

ADMIN_PREFIX = "/api/admin"
REQUIRE_SECURITY = "bearerAuth"  # имя схемы безопасности в components.securitySchemes
PUBLIC_WHITELIST = set([  # публичные пути, где security допустима (если понадобится)
])


def load_spec(path: Path):
    if not path.exists():
        raise FileNotFoundError(f"Spec not found: {path}")
    text = path.read_text(encoding="utf-8")
    if path.suffix in (".yaml", ".yml"):
        return yaml.safe_load(text)
    elif path.suffix == ".json":
        return json.loads(text)
    else:
        # пробуем как yaml
        return yaml.safe_load(text)


def get_security_names(sec_list):
    names = []
    if isinstance(sec_list, list):
        for item in sec_list:
            if isinstance(item, dict):
                names.extend(list(item.keys()))
    return set(names)


def op_security_names(op):
    # Порядок приоритета: operation.security > root.security (fallback)
    if isinstance(op, dict) and "security" in op:
        return get_security_names(op["security"]) or set()
    return set()


def root_security_names(spec):
    return get_security_names(spec.get("security", []))


def has_bearer(op_names, root_names):
    return (REQUIRE_SECURITY in op_names) or (REQUIRE_SECURITY in root_names)


def check_required_tag(op, path, method, problems):
    tags = op.get("tags", []) if isinstance(op, dict) else []
    if not tags:
        problems.append({
            "type": "missing_tag",
            "path": path,
            "method": method,
            "msg": "Operation must have at least one tag"
        })


def check_admin_security(op, path, method, problems, root_sec_names):
    responses = (op.get("responses") or {}) if isinstance(op, dict) else {}
    op_sec = op_security_names(op)
    needs_bearer = True  # любой /api/admin/** обязателен к защите
    if not has_bearer(op_sec, root_sec_names):
        problems.append({
            "type": "admin_missing_bearer",
            "path": path,
            "method": method,
            "msg": f"{path} {method}: must require {REQUIRE_SECURITY}"
        })
    if "401" not in responses:
        problems.append({
            "type": "admin_missing_401",
            "path": path,
            "method": method,
            "msg": f"{path} {method}: must declare 401 response"
        })


def check_public_security(op, path, method, problems, root_sec_names):
    if path in PUBLIC_WHITELIST:
        return
    op_sec = op_security_names(op)
    if REQUIRE_SECURITY in op_sec or REQUIRE_SECURITY in root_sec_names:
        problems.append({
            "type": "public_should_not_require_bearer",
            "path": path,
            "method": method,
            "msg": f"{path} {method}: public endpoint should not require {REQUIRE_SECURITY}"
        })


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--spec", required=True, help="Path to openapi.{yaml,yml,json}")
    args = parser.parse_args()

    spec_path = Path(args.spec)
    try:
        spec = load_spec(spec_path)
    except Exception as e:
        print(f"[spec_guard] Failed to load spec: {e}", file=sys.stderr)
        return 2

    paths = spec.get("paths", {})
    if not isinstance(paths, dict) or not paths:
        print("[spec_guard] No paths in spec", file=sys.stderr)
        return 1

    problems = []
    root_sec_names = root_security_names(spec)

    for path, path_item in paths.items():
        if not isinstance(path_item, dict):
            continue
        for method, op in path_item.items():
            if method.lower() not in {"get", "post", "put", "patch", "delete", "options", "head"}:
                continue
            if not isinstance(op, dict):
                continue
            # Rule D: tags
            check_required_tag(op, path, method, problems)

            if path.startswith(ADMIN_PREFIX):
                check_admin_security(op, path, method, problems, root_sec_names)
            else:
                check_public_security(op, path, method, problems, root_sec_names)

    if problems:
        print("[spec_guard] FAIL — violations found:\n")
        for p in problems:
            print(f"- {p['type']}: {p['path']} {p['method']} — {p['msg']}")
        return 1

    print("[spec_guard] OK — spec is compliant")
    return 0


if __name__ == "__main__":
    sys.exit(main())