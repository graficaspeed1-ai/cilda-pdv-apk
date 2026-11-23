#!/usr/bin/env bash
set -euo pipefail
base="${PDV_SOURCE_URL:-https://cildabijueacessorios.netlify.app}"
assets="app/src/main/assets/cilda"
source_dir="$assets/src"
mkdir -p "$source_dir"
curl --fail --location --retry 3 --retry-delay 2 "$base/" -o "$assets/index.html"
for file in app.js sync.js config.js boot.js; do
  curl --fail --location --retry 3 --retry-delay 2 "$base/$file" -o "$source_dir/$file"
done
if [ -z "${TSC_BIN:-}" ]; then
  npm install --global typescript@5.8.3
  TSC_BIN="$(command -v tsc)"
fi
"$TSC_BIN" --allowJs --noCheck --target ES5 --downlevelIteration --module none --lib ES2015,DOM --rootDir "$source_dir" --outDir "$assets" "$source_dir/app.js" "$source_dir/sync.js" "$source_dir/config.js" "$source_dir/boot.js"
python3 - "$assets/index.html" <<'PY'
import re, sys
from pathlib import Path
p = Path(sys.argv[1])
html = p.read_text(encoding='utf-8')
# Netlify injects a public HUD script into its response; it is not part of the PDV and is removed from this APK-only copy.
html = re.sub(r'<script\\b[^>]*src=[\"\\']/.netlify/scripts/hud[^\"\\']*[\"\\'][^>]*>\\s*</script>', '', html, flags=re.I)
srcs = re.findall(r'<script\b[^>]*\bsrc=["\']([^"\']+)["\'][^>]*>\s*</script>', html, re.I)
expected = ['app.js', 'config.js', 'sync.js', 'boot.js']
if srcs != expected:
    raise SystemExit('HTML inesperado: scripts externos devem estar em ordem e ser app.js, config.js, sync.js, boot.js. Encontrado: ' + repr(srcs))
all_tags = re.findall(r'<script\b[^>]*>(.*?)</script>', html, re.I | re.S)
if len(all_tags) != len(srcs) or any(tag.strip() for tag in all_tags):
    raise SystemExit('HTML contém script inline ou tags não esperadas; interrompendo para não carregar JS não transpileado.')
anchor = '<script src="app.js"></script>'
if anchor not in html:
    raise SystemExit('Não foi encontrado o ponto seguro para inserir compat.js.')
html = html.replace(anchor, '<script src="compat.js"></script>\n' + anchor, 1)
p.write_text(html, encoding='utf-8')
PY
for file in app.js sync.js config.js boot.js compat.js; do node --check "$assets/$file"; done
node tools/android44-compat-check.js
rm -rf "$source_dir"
echo 'Assets Android 4.4 preparados e verificados.'
