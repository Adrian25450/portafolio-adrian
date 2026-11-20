# DocuFlow Organizer 🗂️

Herramienta de línea de comandos en Python para revisar, clasificar y copiar lotes de archivos, con una vista previa segura y reporte CSV.

## Problema que aborda

Cuando documentos, imágenes y archivos descargados se mezclan en una carpeta, cuesta encontrarlos y revisar qué se va a mover. DocuFlow genera una estructura por tipo de archivo y mes de modificación, detecta nombres repetidos y permite revisar el plan antes de aplicarlo.

## Funciones

- 🔎 Vista previa por defecto: no escribe ni modifica archivos fuente.
- 🗃️ Clasificación de documentos, imágenes, audio, videos, comprimidos y otros.
- 📅 Subcarpetas por año y mes de modificación.
- 🧩 Resolución de colisiones agregando sufijos sin sobrescribir.
- 📋 Reporte CSV con origen, destino propuesto, categoría, tamaño y estado.
- 📄 Modo de aplicación que copia archivos y conserva los originales.
- 🐍 Implementado con la biblioteca estándar de Python.

## Requisitos

Python 3.10 o superior. No requiere dependencias externas.

## Uso

Desde esta carpeta, instala el paquete en modo editable:

```bash
python -m pip install -e .
```

Vista previa (predeterminada):

```bash
docuflow ./entrada --output ./organizado --report ./reporte.csv
```

Copiar siguiendo el plan:

```bash
docuflow ./entrada --output ./organizado --apply --report ./organizado/reporte.csv
```

## Ejemplo de salida

```text
copiar       | Documentos     |  248.0 KB | factura.pdf -> .../Documentos/2026-11/factura.pdf
copiar       | Imágenes       |    2.1 MB | foto.png -> .../Imágenes/2026-11/foto.png

2 archivo(s) en vista previa · 2.3 MB
No se modificó el origen. Ejecuta de nuevo con --apply para copiar los archivos.
```

## Decisiones técnicas

`pathlib` administra rutas, `shutil.copy2` conserva metadatos de las copias y `csv` genera el reporte. Las colisiones de nombre se resuelven antes de copiar; no se borran originales.

## Para describirlo en el CV

> Desarrollé una herramienta CLI en Python para clasificar archivos por tipo y fecha, generar reportes CSV y copiar lotes con vista previa, manejo de nombres duplicados y conservación de los originales.

Proyecto demostrativo de portafolio. Usa tus propias carpetas de prueba y revisa el plan antes de aplicar.

