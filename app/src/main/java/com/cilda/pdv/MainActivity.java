package com.cilda.pdv;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.CookieSyncManager;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceResponse;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.File;
import java.io.IOException;

/**
 * WebView simples para o PDV CILDA.
 * Compatível com Android 4.4.4 (API 19) - Samsung Galaxy Tab E SM-T561M.
 * Suporta upload de arquivo e foto pela câmera (input type=file).
 */
public class MainActivity extends Activity {
    private WebView webView;
    private static final String HOME_URL = "https://cildabijueacessorios.netlify.app/";
    private static final String HOME_HOST = "cildabijueacessorios.netlify.app";
    private static final int REQ_FILE = 1001;
    private static final int REQ_SCAN = 1002;

    // Injetado em toda página: guarda o último campo focado, define __fillBarcode
    // e captura leitura de leitor físico (USB/Bluetooth) quando nenhum campo está focado.
    private static final String TRACK_JS =
            "(function(){if(window.__trk)return;window.__trk=1;"
            + "document.addEventListener('focus',function(e){var t=e.target;"
            + "if(t&&t.tagName&&/^(INPUT|TEXTAREA)$/.test(t.tagName))window.__lastInput=t;},true);"
            + "window.__fillBarcode=function(c){try{"
            + "if(typeof window.onBarcodeScanned==='function'){window.onBarcodeScanned(c);return 'cb';}"
            + "var el=window.__lastInput;"
            + "if(!el||!document.body.contains(el)||el.offsetWidth===0){el=null;"
            + "var l=document.querySelectorAll('input[type=search],input[type=text],input:not([type])');"
            + "for(var i=0;i<l.length;i++){if(l[i].offsetWidth>0){el=l[i];break;}}}"
            + "if(!el)return 'noinput';"
            + "el.focus();"
            + "var ds=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value');"
            + "if(ds&&ds.set){ds.set.call(el,c);}else{el.value=c;}"
            + "var f=function(t,k){var e=document.createEvent('Event');e.initEvent(t,true,true);"
            + "if(k){e.keyCode=k;e.which=k;e.key='Enter';}el.dispatchEvent(e);};"
            + "f('input');f('change');f('keydown',13);f('keypress',13);f('keyup',13);"
            + "return 'ok';}catch(x){return 'err:'+x;}};"
            + "var buf='',last=0;"
            + "document.addEventListener('keypress',function(e){"
            + "var t=e.target;if(t&&t.tagName&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))return;"
            + "var now=new Date().getTime();if(now-last>100)buf='';last=now;"
            + "var ch=e.charCode||e.which||e.keyCode;"
            + "if(ch===13){if(buf.length>=3){window.__fillBarcode(buf);}buf='';return;}"
            + "if(ch>=32)buf+=String.fromCharCode(ch);},true);"
            + "})();";

    // Faz window.print() do site imprimir na térmica (texto do recibo)
    private static final String PRINT_JS =
            "(function(){if(window.__prn)return;window.__prn=1;var orig=window.print;"
            + "window.print=function(){try{if(!window.AndroidPrinter){if(orig)orig.call(window);return;}"
            + "var sels=['#recibo','#cupom','#receipt','#comprovante','#print-area','#area-impressao',"
            + "'.recibo','.cupom','.receipt','.comprovante','.print-area'];var txt='';"
            + "for(var i=0;i<sels.length;i++){var c=document.querySelector(sels[i]);"
            + "if(c){var t=(c.innerText||c.textContent||'').trim();if(t){txt=t;break;}}}"
            + "if(!txt)txt=document.body.innerText||'';"
            + "txt=txt.replace(/\\r/g,'').replace(/\\t+/g,'  ');"
            + "window.AndroidPrinter.printText(txt);}catch(e){}};"
            + "})();";

    // Tablet UI is injected only inside this APK WebView; public website remains unchanged.
    private static final String TABLET_MODE_JS =
            "(function(){try{document.body.className+=' cilda-apk-tablet';var s=document.getElementById('cilda-apk-tablet-style');if(!s){s=document.createElement('style');s.id='cilda-apk-tablet-style';s.type='text/css';s.appendChild(document.createTextNode(\"body.cilda-apk-tablet{background:#f7f3f8;color:#221622;font-family:Arial,sans-serif}\\nbody.cilda-apk-tablet header{background:#ed008c;color:#fff;border-bottom:0;padding:6px 10px;min-height:64px}\\nbody.cilda-apk-tablet header h1.logo img{height:48px}\\nbody.cilda-apk-tablet header .nav{display:flex;flex-wrap:wrap}\\nbody.cilda-apk-tablet header .tab,body.cilda-apk-tablet header .chip{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:8px;padding:5px 8px;font-size:12px;margin:2px}\\nbody.cilda-apk-tablet header .tab[aria-current=page]{background:#fff;color:#ed008c}\\nbody.cilda-apk-tablet #stat{color:#fff;font-size:11px}\\nbody.cilda-apk-tablet main{display:flex!important;flex-direction:row!important;align-items:stretch;padding:8px!important;max-width:none!important;margin:0!important;height:calc(100vh - 64px);overflow:hidden}\\nbody.cilda-apk-tablet main>section{display:flex;flex-direction:column;flex:1 1 58%;width:58%;min-width:0;overflow:hidden}\\nbody.cilda-apk-tablet .tools{margin-bottom:5px;flex-wrap:nowrap}\\nbody.cilda-apk-tablet #q{flex:1;min-width:0;padding:8px 10px;border:2px solid #e4d8e8;border-radius:8px;font-size:16px}\\nbody.cilda-apk-tablet #mic{display:none}\\nbody.cilda-apk-tablet #cats{display:flex;flex-wrap:nowrap;overflow-x:auto;padding-bottom:2px;white-space:nowrap}\\nbody.cilda-apk-tablet #cats .chip{padding:8px 11px;margin:3px;flex:none;font-size:14px}\\nbody.cilda-apk-tablet #cats .chip[aria-pressed=true]{background:#ed008c;color:#fff;border-color:#ed008c}\\nbody.cilda-apk-tablet #grid{display:flex!important;flex-wrap:wrap;align-content:flex-start;overflow:auto;padding:2px}\\nbody.cilda-apk-tablet .card{width:30%;min-width:105px;min-height:128px;padding:9px;margin:4px;border-radius:9px;background:#fff;border:1px solid #e5dce8}\\nbody.cilda-apk-tablet .card .pimg{width:100%;max-height:90px;object-fit:contain;aspect-ratio:1;margin:0}\\nbody.cilda-apk-tablet .nm{font-size:15px;line-height:1.25}\\nbody.cilda-apk-tablet .sku{font-size:12px}\\nbody.cilda-apk-tablet .pr{font-size:20px;color:#ed008c;margin-top:auto}\\nbody.cilda-apk-tablet aside#cart{position:static!important;transform:none!important;transition:none!important;flex:0 0 42%;width:42%;max-width:42%;max-height:100%;overflow:auto;align-self:stretch;border:2px solid #f2b3dc;border-radius:12px;padding:8px;background:#fff}\\nbody.cilda-apk-tablet aside h2{font-size:16px;color:#ed008c}\\nbody.cilda-apk-tablet aside .it{padding:6px 0}\\nbody.cilda-apk-tablet aside .qty button{width:42px;height:42px;border-radius:8px;background:#fff;border-color:#ed008c;color:#ed008c;font-size:18px}\\nbody.cilda-apk-tablet aside .tot{font-size:22px;color:#ed008c}\\nbody.cilda-apk-tablet aside .pays{display:flex;flex-wrap:wrap}\\nbody.cilda-apk-tablet aside .pays .chip{width:48%;padding:7px 4px;margin:2px;min-height:36px;font-size:12px}\\nbody.cilda-apk-tablet aside .go{background:#ed008c;border-radius:9px;padding:10px;font-size:16px}\\nbody.cilda-apk-tablet #bar{display:none!important}\\nbody.cilda-apk-tablet #modal{z-index:100}\\nbody.cilda-apk-tablet #modal .box{max-height:88vh;overflow:auto}\nbody.cilda-apk-tablet #modal{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:9999!important;background:rgba(20,10,20,.48)!important}\nbody.cilda-apk-tablet #modal .box{position:fixed!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;width:min(92vw,560px)!important;max-width:92vw!important;max-height:88vh!important;margin:0!important;box-sizing:border-box!important;overflow:auto!important;box-shadow:0 12px 35px rgba(0,0,0,.35)!important;border-radius:14px!important}\\n@media(max-width:900px){body.cilda-apk-tablet main{display:flex!important;flex-direction:row!important;padding:6px!important;height:calc(100vh - 64px)}body.cilda-apk-tablet main>section{width:58%!important;flex:1 1 58%!important}body.cilda-apk-tablet aside#cart{position:static!important;transform:none!important;width:42%!important;flex:0 0 42%!important;max-width:42%!important;max-height:100%!important}body.cilda-apk-tablet .card{width:32%;min-width:100px}}\\n@media(max-width:620px){body.cilda-apk-tablet .card{width:31%}body.cilda-apk-tablet header .nav .chip,body.cilda-apk-tablet header .tab{padding:4px 6px;font-size:10px}}\"));document.head.appendChild(s);}if(typeof window.go==='function'){window.go('sell');}}catch(e){}})();";

    // Smartphone portrait layout: switch POS into stacked, touch-friendly view.
    private static final String MOBILE_MODE_JS =
            "(function(){try{var s=document.getElementById('cilda-apk-mobile-style');if(!s){s=document.createElement('style');s.id='cilda-apk-mobile-style';"
            + "s.type='text/css';s.appendChild(document.createTextNode('"
            + "@media(max-width:700px) and (orientation:portrait){"
            + "body.cilda-apk-tablet header{padding:4px 6px;min-height:44px}body.cilda-apk-tablet header h1.logo img{height:34px}"
            + "body.cilda-apk-tablet header .nav{display:flex;flex-wrap:nowrap;overflow-x:auto;white-space:nowrap}body.cilda-apk-tablet header .nav>*{flex:none}"
            + "body.cilda-apk-tablet main{flex-direction:column!important;height:calc(100vh - 48px)!important;overflow:auto!important;padding:5px!important}"
            + "body.cilda-apk-tablet main>section{width:100%!important;flex:0 0 auto!important;max-height:56vh;overflow:auto}"
            + "body.cilda-apk-tablet .tools{flex-wrap:wrap}body.cilda-apk-tablet #q{font-size:16px;min-height:42px}"
            + "body.cilda-apk-tablet #cats{max-height:48px}body.cilda-apk-tablet #grid{max-height:40vh;overflow:auto}"
            + "body.cilda-apk-tablet .card{width:47%!important;min-width:0!important;min-height:108px!important;margin:2px!important;padding:5px!important}"
            + "body.cilda-apk-tablet .card .pimg{max-height:68px!important}body.cilda-apk-tablet .nm{font-size:12px!important}body.cilda-apk-tablet .pr{font-size:15px!important}"
            + "body.cilda-apk-tablet aside#cart{width:100%!important;max-width:none!important;flex:0 0 auto!important;max-height:42vh!important;overflow:auto!important;margin-top:6px!important;padding:7px!important}"
            + "body.cilda-apk-tablet aside .pays .chip{width:48%!important;min-height:42px!important}body.cilda-apk-tablet aside .qty button{min-width:38px!important;min-height:38px!important}"
            + "body.cilda-apk-tablet #modal .box{width:96%!important;max-width:96vw!important;max-height:90vh!important;overflow:auto!important}}"
            + "@media(max-width:700px) and (orientation:landscape){body.cilda-apk-tablet main{height:calc(100vh - 52px)!important;padding:4px!important}body.cilda-apk-tablet .card{width:32%!important;min-width:95px!important}body.cilda-apk-tablet aside#cart{max-height:100%!important}}"
            + "'));document.head.appendChild(s);} }catch(e){}})();";

    private ThermalPrinter printer;
    private volatile String currentHost = "";

    private ValueCallback<Uri> uploadMsg;
    private ValueCallback<Uri[]> uploadMsgArray;
    private Uri cameraUri;

    // Serve a KitKat-compatible copy of the web scripts without changing the live PDV site.
    private WebResourceResponse getBundledResource(String requestUrl) {
        try {
            Uri uri = Uri.parse(requestUrl);
            if (!HOME_HOST.equals(uri.getHost())) return null;
            String path = uri.getPath();
            String asset = null;
            String mime = "text/javascript";
            if (path == null || path.length() == 0 || "/".equals(path) || "/index.html".equals(path)) {
                asset = "cilda/index.html";
                mime = "text/html";
            } else if ("/app.js".equals(path)) asset = "cilda/app.js";
            else if ("/sync.js".equals(path)) asset = "cilda/sync.js";
            else if ("/config.js".equals(path)) asset = "cilda/config.js";
            else if ("/boot.js".equals(path)) asset = "cilda/boot.js";
            else if ("/compat.js".equals(path)) asset = "cilda/compat.js";
            if (asset == null) return null;
            return new WebResourceResponse(mime, "UTF-8", getAssets().open(asset));
        } catch (IOException e) {
            return null;
        }
    }

    private boolean isHomeDocumentUrl(String url) {
        try {
            Uri uri = Uri.parse(url);
            String path = uri.getPath();
            return HOME_HOST.equals(uri.getHost()) &&
                    (path == null || path.length() == 0 || "/".equals(path) || "/index.html".equals(path));
        } catch (Exception ignored) {
            return false;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 19) {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }

        if (Build.VERSION.SDK_INT >= 19
                && (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        webView = new WebView(this);
        printer = new ThermalPrinter(this);
        webView.addJavascriptInterface(new PrintBridge(), "AndroidPrinter");
        FrameLayout root = new FrameLayout(this);
        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        Button scanBtn = new Button(this);
        scanBtn.setText("LER CÓDIGO");
        scanBtn.setAlpha(0.9f);
        scanBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startActivityForResult(new Intent(MainActivity.this, ScannerActivity.class), REQ_SCAN);
            }
        });
        float d = getResources().getDisplayMetrics().density;
        FrameLayout.LayoutParams blp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM | Gravity.RIGHT);
        blp.rightMargin = (int) (16 * d);
        blp.bottomMargin = (int) (16 * d);
        Button printBtn = new Button(this);
        printBtn.setText("IMPRESSORA");
        printBtn.setAlpha(0.9f);
        printBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                printer.choose(null);
            }
        });
        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.addView(printBtn);
        bar.addView(scanBtn);
        root.addView(bar, blp);
        setContentView(root);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadsImagesAutomatically(true);
        settings.setDefaultTextEncodingName("UTF-8");
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        if (Build.VERSION.SDK_INT >= 21) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        }

        CookieSyncManager.createInstance(this);
        CookieManager.getInstance().setAcceptCookie(true);

        webView.setWebChromeClient(new WebChromeClient() {
            // Android 4.4 e anteriores (métodos ocultos chamados pelo WebView)
            public void openFileChooser(ValueCallback<Uri> callback) {
                openFileChooser(callback, "", null);
            }

            public void openFileChooser(ValueCallback<Uri> callback, String acceptType) {
                openFileChooser(callback, acceptType, null);
            }

            public void openFileChooser(ValueCallback<Uri> callback, String acceptType, String capture) {
                cancelPending();
                uploadMsg = callback;
                launchChooser();
            }

            // Android 5.0+
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                cancelPending();
                uploadMsgArray = callback;
                launchChooser();
                return true;
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                WebResourceResponse bundled = getBundledResource(url);
                if (bundled != null) return bundled;
                return super.shouldInterceptRequest(view, url);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    view.loadUrl(url);
                } else {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                    } catch (Exception ignored) {
                    }
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript(TRACK_JS, null);
                view.evaluateJavascript(PRINT_JS, null);
                if (HOME_HOST.equals(Uri.parse(url).getHost())) {
                    view.evaluateJavascript(TABLET_MODE_JS, null);
                    view.evaluateJavascript(MOBILE_MODE_JS, null);
                }
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                String h = null;
                try {
                    h = Uri.parse(url).getHost();
                } catch (Exception ignored) {
                }
                currentHost = h == null ? "" : h;
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                String host = Uri.parse(error.getUrl()).getHost();
                if (HOME_HOST.equals(host)) {
                    handler.proceed();
                } else {
                    handler.cancel();
                }
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                // On Android 4.4 this callback also fires for subresources (fonts/images); do not replace the whole PDV for those.
                if (!isHomeDocumentUrl(failingUrl)) return;
                String html = "<html><body style='font-family:sans-serif;text-align:center;padding:60px'>"
                        + "<h2>Sem conexão com o PDV</h2>"
                        + "<p>" + description + "</p>"
                        + "<p>Verifique o Wi-Fi e toque abaixo.</p>"
                        + "<p><a href='" + HOME_URL + "' style='font-size:24px'>Tentar novamente</a></p>"
                        + "</body></html>";
                view.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
            }
        });
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        if (savedInstanceState != null) webView.restoreState(savedInstanceState);
        else webView.loadUrl(HOME_URL);
    }

    private void cancelPending() {
        if (uploadMsg != null) {
            uploadMsg.onReceiveValue(null);
            uploadMsg = null;
        }
        if (uploadMsgArray != null) {
            uploadMsgArray.onReceiveValue(null);
            uploadMsgArray = null;
        }
    }

    /** Abre um seletor com "Câmera" + arquivos/galeria. */
    private void launchChooser() {
        Intent contentIntent = new Intent(Intent.ACTION_GET_CONTENT);
        contentIntent.addCategory(Intent.CATEGORY_OPENABLE);
        contentIntent.setType("*/*");

        Intent chooser = Intent.createChooser(contentIntent, "Escolher arquivo ou foto");

        cameraUri = null;
        try {
            File dir = getExternalCacheDir();
            if (dir != null) {
                File photo = File.createTempFile("pdv_", ".jpg", dir);
                cameraUri = Uri.fromFile(photo);
                Intent cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
                chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{cameraIntent});
            }
        } catch (Exception e) {
            cameraUri = null;
        }

        try {
            startActivityForResult(chooser, REQ_FILE);
        } catch (Exception e) {
            cancelPending();
            Toast.makeText(this, "Não foi possível abrir câmera/arquivos", Toast.LENGTH_LONG).show();
        }
    }

    private void fillBarcode(String code) {
        webView.evaluateJavascript(TRACK_JS, null);
        webView.evaluateJavascript("window.__fillBarcode(" + JSONObject.quote(code) + ");", null);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_SCAN) {
            if (resultCode == RESULT_OK && data != null) {
                String code = data.getStringExtra(ScannerActivity.EXTRA_CODE);
                if (code != null && code.length() > 0) {
                    Toast.makeText(this, "Código: " + code, Toast.LENGTH_SHORT).show();
                    fillBarcode(code);
                }
            }
            return;
        }
        if (requestCode != REQ_FILE) {
            super.onActivityResult(requestCode, resultCode, data);
            return;
        }

        Uri result = null;
        if (resultCode == RESULT_OK) {
            if (data != null && data.getData() != null) {
                result = data.getData();
            } else if (cameraUri != null) {
                File f = new File(cameraUri.getPath());
                if (f.exists() && f.length() > 0) result = cameraUri;
            }
        }

        if (uploadMsg != null) {
            uploadMsg.onReceiveValue(result);
            uploadMsg = null;
        }
        if (uploadMsgArray != null) {
            uploadMsgArray.onReceiveValue(result != null ? new Uri[]{result} : null);
            uploadMsgArray = null;
        }
    }

    /** Funções chamáveis pelo site: AndroidPrinter.printText(texto) e AndroidPrinter.selectPrinter() */
    private class PrintBridge {
        @JavascriptInterface
        public void printText(String text) {
            if (!HOME_HOST.equals(currentHost)) return;
            printer.print(text);
        }

        @JavascriptInterface
        public void selectPrinter() {
            if (!HOME_HOST.equals(currentHost)) return;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    printer.choose(null);
                }
            });
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else Toast.makeText(this, "Use o menu do PDV para navegar", Toast.LENGTH_SHORT).show();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
    }
}
