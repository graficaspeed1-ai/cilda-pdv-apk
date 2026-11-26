#!/usr/bin/env python3
"""Aplica ajustes seguros de compatibilidade ao APK CILDA Vendas para Galaxy Tab E SM-T561M."""
from pathlib import Path
import re
import sys

root = Path(sys.argv[1]).resolve()
gradle = root / "app" / "build.gradle"
manifest = root / "app" / "src" / "main" / "AndroidManifest.xml"

if not gradle.is_file() or not manifest.is_file():
    raise SystemExit("Estrutura Android inesperada: app/build.gradle ou AndroidManifest.xml ausente.")

g = gradle.read_text(encoding="utf-8")
# O tablet usa Android 4.4.2/4.4.4 (API 19): manter o mínimo API 19 e um target compatível.
if re.search(r"minSdk\\s+\\d+", g):
    g = re.sub(r"minSdk\\s+\\d+", "minSdk 19", g, count=1)
elif re.search(r"minSdkVersion\\s+\\d+", g):
    g = re.sub(r"minSdkVersion\\s+\\d+", "minSdkVersion 19", g, count=1)
else:
    g = re.sub(r"defaultConfig\\s*\\{", "defaultConfig {\\n        minSdk 19", g, count=1)

if re.search(r"targetSdk\\s+\\d+", g):
    g = re.sub(r"targetSdk\\s+\\d+", "targetSdk 28", g, count=1)
elif re.search(r"targetSdkVersion\\s+\\d+", g):
    g = re.sub(r"targetSdkVersion\\s+\\d+", "targetSdkVersion 28", g, count=1)
else:
    g = re.sub(r"defaultConfig\\s*\\{", "defaultConfig {\\n        targetSdk 28", g, count=1)

# Identificador próprio para permitir instalar Vendas sem substituir o PDV principal.
if re.search(r"applicationId\\s+['\"][^'\"]+['\"]", g):
    g = re.sub(r"applicationId\\s+['\"][^'\"]+['\"]", "applicationId 'br.com.cilda.vendas'", g, count=1)
else:
    g = re.sub(r"defaultConfig\\s*\\{", "defaultConfig {\\n        applicationId 'br.com.cilda.vendas'", g, count=1)

g = re.sub(r"versionCode\\s+\\d+", "versionCode 2", g, count=1)
g = re.sub(r"versionName\\s+['\"][^'\"]+['\"]", "versionName '1.1.0-sm561m'", g, count=1)
gradle.write_text(g, encoding="utf-8")

m = manifest.read_text(encoding="utf-8")
if "<application" not in m:
    raise SystemExit("Tag <application> não encontrada no Manifest.")
# Nome claro no launcher e compatibilidade com telas do tablet.
if re.search(r"android:label\\s*=\\s*['\"][^'\"]*['\"]", m):
    m = re.sub(r"android:label\\s*=\\s*['\"][^'\"]*['\"]", 'android:label="CILDA Vendas"', m, count=1)
else:
    m = m.replace("<application", '<application android:label="CILDA Vendas"', 1)

if "supports-screens" not in m:
    m = m.replace("<application", '<supports-screens android:smallScreens="true" android:normalScreens="true" android:largeScreens="true" android:xlargeScreens="true" android:anyDensity="true" />\\n    <application', 1)

# Evita exigir câmera como hardware obrigatório; modelos/versões podem variar.
if "android.hardware.camera" not in m:
    m = m.replace("<application", '<uses-feature android:name="android.hardware.camera" android:required="false" />\\n    <application', 1)

manifest.write_text(m, encoding="utf-8")
print("Configuração aplicada: SM-T561M, Android mínimo API 19, target API 28, paisagem e app independente.")
