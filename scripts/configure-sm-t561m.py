#!/usr/bin/env python3
"""Ajusta a compilação do CILDA Vendas para o Galaxy Tab E SM-T561M."""
from pathlib import Path
import sys

root = Path(sys.argv[1]).resolve()
gradle = root / "app" / "build.gradle"
manifest = root / "app" / "src" / "main" / "AndroidManifest.xml"
if not gradle.is_file() or not manifest.is_file():
    raise SystemExit("Projeto inválido: app/build.gradle ou AndroidManifest.xml não encontrado.")

lines = gradle.read_text(encoding="utf-8").splitlines()
seen = {"applicationId": False, "minSdk": False, "targetSdk": False}
for i, line in enumerate(lines):
    key = line.strip().split(" ", 1)[0] if line.strip() else ""
    if key == "applicationId":
        lines[i] = "        applicationId 'br.com.cilda.vendas'"
        seen["applicationId"] = True
    elif key in ("minSdk", "minSdkVersion"):
        lines[i] = "        minSdk 19"
        seen["minSdk"] = True
    elif key in ("targetSdk", "targetSdkVersion"):
        lines[i] = "        targetSdk 28"
        seen["targetSdk"] = True
    elif key == "versionCode":
        lines[i] = "        versionCode 2"
    elif key == "versionName":
        lines[i] = "        versionName '1.1.0-sm561m'"

if not all(seen.values()):
    for i, line in enumerate(lines):
        if line.strip().startswith("defaultConfig"):
            additions = []
            if not seen["applicationId"]:
                additions.append("        applicationId 'br.com.cilda.vendas'")
            if not seen["minSdk"]:
                additions.append("        minSdk 19")
            if not seen["targetSdk"]:
                additions.append("        targetSdk 28")
            lines[i + 1:i + 1] = additions
            break
    else:
        raise SystemExit("Bloco defaultConfig não encontrado no Gradle.")
gradle.write_text("\n".join(lines) + "\n", encoding="utf-8")

m = manifest.read_text(encoding="utf-8")
if "<application" not in m:
    raise SystemExit("Tag application não encontrada no Manifest.")
if 'android:label="' in m:
    import re
    m = re.sub('android:label="[^"]*"', 'android:label="CILDA Vendas"', m, count=1)
else:
    m = m.replace("<application", '<application android:label="CILDA Vendas"', 1)
if "supports-screens" not in m:
    m = m.replace("<application", '<supports-screens android:smallScreens="true" android:normalScreens="true" android:largeScreens="true" android:xlargeScreens="true" android:anyDensity="true" />\n    <application', 1)
if "android.hardware.camera" not in m:
    m = m.replace("<application", '<uses-feature android:name="android.hardware.camera" android:required="false" />\n    <application', 1)
# O Tab E é usado em paisagem; fixa essa orientação nas telas nativas.
if 'android:screenOrientation=' not in m:
    m = m.replace("<activity", '<activity android:screenOrientation="landscape"', 2)
manifest.write_text(m, encoding="utf-8")
print("SM-T561M: minSdk 19, targetSdk 28, CILDA Vendas independente, tela paisagem e câmera opcional.")
