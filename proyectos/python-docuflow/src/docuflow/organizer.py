from __future__ import annotations

import csv
import hashlib
import shutil
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

CATEGORIES = {
    "Imágenes": {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tif", ".tiff"},
    "Documentos": {".pdf", ".doc", ".docx", ".odt", ".txt", ".rtf", ".csv", ".xls", ".xlsx", ".ppt", ".pptx"},
    "Audio": {".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"},
    "Vídeos": {".mp4", ".mov", ".avi", ".mkv", ".webm"},
    "Comprimidos": {".zip", ".rar", ".7z", ".tar", ".gz"},
}

@dataclass(frozen=True)
class FileAction:
    source: Path
    destination: Path
    category: str
    size_bytes: int
    status: str


def category_for(path: Path) -> str:
    extension = path.suffix.lower()
    return next((name for name, extensions in CATEGORIES.items() if extension in extensions), "Otros")


def _digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def _available_name(candidate: Path, reserved: set[str]) -> Path:
    current = candidate
    index = 1
    while str(current).casefold() in reserved or current.exists():
        current = candidate.with_name(f"{candidate.stem}_{index:03d}{candidate.suffix}")
        index += 1
    reserved.add(str(current).casefold())
    return current


def build_plan(source_dir: Path, output_dir: Path) -> list[FileAction]:
    source = source_dir.expanduser().resolve()
    output = output_dir.expanduser().resolve()
    if not source.is_dir():
        raise ValueError(f"La carpeta de origen no existe o no es una carpeta: {source}")
    if source == output or source in output.parents:
        raise ValueError("La carpeta de destino no puede estar dentro del origen.")

    actions: list[FileAction] = []
    reserved: set[str] = set()
    for item in sorted(source.rglob("*")):
        if item.is_symlink() or not item.is_file():
            continue
        try:
            resolved = item.resolve(strict=True)
            if output == resolved or output in resolved.parents:
                continue
            modified = datetime.fromtimestamp(item.stat().st_mtime)
            bucket = output / category_for(item) / modified.strftime("%Y-%m")
            destination = _available_name(bucket / item.name, reserved)
            actions.append(FileAction(item, destination, category_for(item), item.stat().st_size, "copiar"))
        except OSError as error:
            actions.append(FileAction(item, output / "_errores" / item.name, "Error", 0, f"no disponible: {error}"))
    return actions


def apply_plan(actions: list[FileAction]) -> list[FileAction]:
    results: list[FileAction] = []
    for action in actions:
        if action.status != "copiar":
            results.append(action)
            continue
        try:
            action.destination.parent.mkdir(parents=True, exist_ok=True)
            # Copy only: the original file remains untouched in the source folder.
            shutil.copy2(action.source, action.destination)
            results.append(FileAction(action.source, action.destination, action.category, action.size_bytes, "copiado"))
        except OSError as error:
            results.append(FileAction(action.source, action.destination, action.category, action.size_bytes, f"error: {error}"))
    return results


def write_report(actions: list[FileAction], report_path: Path) -> None:
    report = report_path.expanduser().resolve()
    report.parent.mkdir(parents=True, exist_ok=True)
    with report.open("w", newline="", encoding="utf-8-sig") as stream:
        writer = csv.writer(stream)
        writer.writerow(["origen", "destino_propuesto", "categoría", "tamaño_bytes", "estado"])
        for action in actions:
            writer.writerow([action.source, action.destination, action.category, action.size_bytes, action.status])

