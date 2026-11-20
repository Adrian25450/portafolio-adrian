from __future__ import annotations

import argparse
from pathlib import Path

from .organizer import apply_plan, build_plan, write_report


def _format_size(size: int) -> str:
    amount = float(size)
    for unit in ("B", "KB", "MB", "GB"):
        if amount < 1024 or unit == "GB":
            return f"{amount:.0f} {unit}" if unit == "B" else f"{amount:.1f} {unit}"
        amount /= 1024
    return f"{amount:.1f} GB"


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="docuflow",
        description="Clasifica archivos por tipo y mes. Por defecto solo muestra una vista previa.",
    )
    parser.add_argument("source", type=Path, help="Carpeta que contiene los archivos")
    parser.add_argument("--output", type=Path, required=True, help="Carpeta destino para las copias organizadas")
    parser.add_argument("--apply", action="store_true", help="Copia los archivos según el plan; nunca elimina los originales")
    parser.add_argument("--report", type=Path, help="Guarda el plan o el resultado en un archivo CSV")
    args = parser.parse_args()

    try:
        plan = build_plan(args.source, args.output)
    except (OSError, ValueError) as error:
        parser.error(str(error))

    actions = apply_plan(plan) if args.apply else plan
    for action in actions:
        print(f"{action.status:12} | {action.category:14} | {_format_size(action.size_bytes):>9} | {action.source.name} -> {action.destination}")

    if args.report:
        write_report(actions, args.report)
        print(f"\nReporte CSV: {args.report.expanduser().resolve()}")

    count = sum(action.status in {"copiar", "copiado"} for action in actions)
    total = sum(action.size_bytes for action in actions)
    mode = "copiados" if args.apply else "en vista previa"
    print(f"\n{count} archivo(s) {mode} · {_format_size(total)}")
    if not args.apply:
        print("No se modificó el origen. Ejecuta de nuevo con --apply para copiar los archivos.")


if __name__ == "__main__":
    main()

