#!/usr/bin/env python3
"""Ajusta a compilação do CILDA Vendas para o Galaxy Tab E SM-T561M."""
from pathlib import Path
import re
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
        lines[i] = "        versionCode 3"
    elif key == "versionName":
        lines[i] = "        versionName '1.2.0-sm561m'"

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

webkit_found = False
for candidate in root.rglob("*"):
    if candidate.is_file() and candidate.suffix in (".gradle", ".kts", ".toml", ".properties"):
        data = candidate.read_text(encoding="utf-8")
        updated = data.replace("androidx.webkit:webkit:1.12.1", "androidx.webkit:webkit:1.6.1")
        if candidate.suffix == ".toml":
            updated = re.sub(r'(webkit[^\n]*?version\s*=\s*")[^"]+', r'\g<1>1.6.1', updated, flags=re.I)
        if "androidx.webkit:webkit:1.6.1" in updated or re.search(r'webkit[^\n]*1\.6\.1', updated, re.I):
            webkit_found = True
        if updated != data:
            candidate.write_text(updated, encoding="utf-8")
if not webkit_found:
    raise SystemExit("Não foi possível ajustar a dependência AndroidX WebKit para API 19.")

lines.extend([
    "",
    "// Compatibilidade SM-T561M: impedir resolução transitiva do WebKit API 21+.",
    "configurations.all {",
    "    resolutionStrategy.eachDependency { details ->",
    "        if (details.requested.group == 'androidx.webkit' && details.requested.name == 'webkit') {",
    "            details.useVersion '1.6.1'",
    "        }",
    "    }",
    "}",
])
gradle.write_text("\n".join(lines) + "\n", encoding="utf-8")

m = manifest.read_text(encoding="utf-8")
if "<application" not in m:
    raise SystemExit("Tag application não encontrada no Manifest.")
if 'android:label="' in m:
    m = re.sub('android:label="[^"]*"', 'android:label="CILDA Vendas"', m, count=1)
else:
    m = m.replace("<application", '<application android:label="CILDA Vendas"', 1)
if "supports-screens" not in m:
    m = m.replace("<application", '<supports-screens android:smallScreens="true" android:normalScreens="true" android:largeScreens="true" android:xlargeScreens="true" android:anyDensity="true" />\n    <application', 1)
if "android.hardware.camera" not in m:
    m = m.replace("<application", '<uses-feature android:name="android.hardware.camera" android:required="false" />\n    <application', 1)
if 'android:screenOrientation=' not in m:
    m = m.replace("<activity", '<activity android:screenOrientation="landscape"', 2)
manifest.write_text(m, encoding="utf-8")

# Corrige o WebView legado: Capacitor usa appassets.androidplatform.net/assets/www/.
java_files = list((root / "app" / "src" / "main" / "java").rglob("MainActivity.java"))
if len(java_files) != 1:
    raise SystemExit("Esperado um MainActivity.java; encontrados: " + str([str(p) for p in java_files]))
java = java_files[0]
src = java.read_text(encoding="utf-8")
marker = "    private WebResourceResponse getBundledResource(String requestUrl) {"
if marker not in src:
    raise SystemExit("MainActivity encontrado em " + str(java) + " mas sem método esperado. Conteúdo:\\n" + src)
start = src.index(marker)
end = src.index("    private boolean isHomeDocumentUrl(String url) {", start)
method = '''    private boolean isTrustedHost(String host) {
        return HOME_HOST.equals(host) || "appassets.androidplatform.net".equals(host);
    }

    private WebResourceResponse getBundledResource(String requestUrl) {
        try {
            Uri uri = Uri.parse(requestUrl);
            String host = uri.getHost();
            String path = uri.getPath();
            String asset = null;
            String mime = "application/octet-stream";

            if ("appassets.androidplatform.net".equals(host)) {
                if (path == null || !path.startsWith("/assets/")) return null;
                asset = path.substring("/assets/".length());
                if (asset.length() == 0 || asset.contains("..")) return null;
                if (asset.endsWith(".html")) mime = "text/html";
                else if (asset.endsWith(".js")) mime = "application/javascript";
                else if (asset.endsWith(".css")) mime = "text/css";
                else if (asset.endsWith(".json")) mime = "application/json";
                else if (asset.endsWith(".svg")) mime = "image/svg+xml";
                else if (asset.endsWith(".png")) mime = "image/png";
                else if (asset.endsWith(".jpg") || asset.endsWith(".jpeg")) mime = "image/jpeg";
                else if (asset.endsWith(".gif")) mime = "image/gif";
                else if (asset.endsWith(".woff")) mime = "application/font-woff";
                else if (asset.endsWith(".woff2")) mime = "font/woff2";
                else if (asset.endsWith(".ttf")) mime = "font/ttf";
                else if (asset.endsWith(".webp")) mime = "image/webp";
            } else if (HOME_HOST.equals(host)) {
                if (path == null || path.length() == 0 || "/".equals(path) || "/index.html".equals(path)) {
                    asset = "cilda/index.html";
                    mime = "text/html";
                } else if ("/app.js".equals(path)) asset = "cilda/app.js";
                else if ("/sync.js".equals(path)) asset = "cilda/sync.js";
                else if ("/config.js".equals(path)) asset = "cilda/config.js";
                else if ("/boot.js".equals(path)) asset = "cilda/boot.js";
                else if ("/compat.js".equals(path)) asset = "cilda/compat.js";
                if (asset != null && mime.equals("application/octet-stream")) mime = "application/javascript";
            } else {
                return null;
            }

            if (asset == null) return null;
            return new WebResourceResponse(mime, "UTF-8", getAssets().open(asset));
        } catch (IOException e) {
            return null;
        }
    }

'''
src = src[:start] + method + src[end:]
src = re.sub(
    r'private boolean isHomeDocumentUrl\(String url\) \{.*?\n    \}',
    '''private boolean isHomeDocumentUrl(String url) {
        try {
            Uri uri = Uri.parse(url);
            String host = uri.getHost();
            String path = uri.getPath();
            if (HOME_HOST.equals(host)) {
                return path == null || path.length() == 0 || "/".equals(path) || "/index.html".equals(path);
            }
            return "appassets.androidplatform.net".equals(host)
                    && path != null && path.endsWith("/assets/www/index.html");
        } catch (Exception ignored) {
            return false;
        }
    }''',
    src, count=1, flags=re.S
)
src = src.replace('if (HOME_HOST.equals(Uri.parse(url).getHost())) {', 'if (isTrustedHost(Uri.parse(url).getHost())) {')
src = src.replace('if (HOME_HOST.equals(host)) {\n                    handler.proceed();', 'if (isTrustedHost(host)) {\n                    handler.proceed();')
src = src.replace('if (!HOME_HOST.equals(currentHost)) return;', 'if (!isTrustedHost(currentHost)) return;')
java.write_text(src, encoding="utf-8")
print("SM-T561M: WebView local appassets interceptado para Android 4.4, assets/www servidos localmente.")
