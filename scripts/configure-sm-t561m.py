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

# Substituição completa da Activity por WebView nativo compatível com API 19.
# O endereço appassets é interceptado e mapeado diretamente para assets/www.
header = src[:src.index("public class MainActivity")]
header = re.sub(r"^import .*?(?:PermissionRequest|WebViewAssetLoader|ActivityCompat).*\\n", "", header, flags=re.M)
activity = r"""public class MainActivity extends Activity {
    private WebView webView;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                try {
                    android.net.Uri uri = android.net.Uri.parse(url);
                    if (!"appassets.androidplatform.net".equals(uri.getHost())) return null;
                    String path = uri.getPath();
                    if (path == null || !path.startsWith("/assets/")) return null;
                    String asset = path.substring("/assets/".length());
                    if (asset.length() == 0 || asset.contains("..")) return null;
                    String mime = "application/octet-stream";
                    if (asset.endsWith(".html")) mime = "text/html";
                    else if (asset.endsWith(".js")) mime = "application/javascript";
                    else if (asset.endsWith(".css")) mime = "text/css";
                    else if (asset.endsWith(".json") || asset.endsWith(".webmanifest")) mime = "application/json";
                    else if (asset.endsWith(".png")) mime = "image/png";
                    else if (asset.endsWith(".jpg") || asset.endsWith(".jpeg")) mime = "image/jpeg";
                    else if (asset.endsWith(".svg")) mime = "image/svg+xml";
                    else if (asset.endsWith(".woff")) mime = "application/font-woff";
                    else if (asset.endsWith(".woff2")) mime = "font/woff2";
                    return new android.webkit.WebResourceResponse(mime, "UTF-8", getAssets().open(asset));
                } catch (Exception e) {
                    return null;
                }
            }

            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                android.net.Uri uri = android.net.Uri.parse(url);
                return !"appassets.androidplatform.net".equals(uri.getHost());
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl("https://appassets.androidplatform.net/assets/www/index.html");
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
"""
src = header + activity
if "WebViewAssetLoader" in src or "WebResourceRequest" in src or "PermissionRequest" in src:
    raise SystemExit("APIs posteriores ao Android 4.4 ainda aparecem na Activity.")
java.write_text(src, encoding="utf-8")
print("SM-T561M: WebView local appassets interceptado para Android 4.4, assets/www servidos localmente.")
