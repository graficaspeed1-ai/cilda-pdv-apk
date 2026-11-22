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
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.File;

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

    private ThermalPrinter printer;
    private volatile String currentHost = "";

    private ValueCallback<Uri> uploadMsg;
    private ValueCallback<Uri[]> uploadMsgArray;
    private Uri cameraUri;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

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
