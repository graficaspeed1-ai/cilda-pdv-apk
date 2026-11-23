package com.cilda.pdv;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.widget.Toast;

public class MainActivity extends Activity {
  private WebView web;
  private boolean tabletApplied = false;
  private static final String BASE_URL = "file:///android_asset/index.html";
  @Override public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    requestWindowFeature(Window.FEATURE_NO_TITLE);
    getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
    setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
    immersive();
    web = new WebView(this);
    web.setBackgroundColor(0xfff7f3f9);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setDatabaseEnabled(true);
    s.setAllowFileAccess(true);
    s.setAllowContentAccess(true);
    s.setAllowFileAccessFromFileURLs(true);
    s.setAllowUniversalAccessFromFileURLs(false);
    s.setCacheMode(WebSettings.LOAD_DEFAULT);
    s.setBuiltInZoomControls(false);
    s.setDisplayZoomControls(false);
    s.setSupportZoom(false);
    s.setUseWideViewPort(true);
    s.setLoadWithOverviewMode(true);
    web.setWebChromeClient(new WebChromeClient());
    web.setWebViewClient(new WebViewClient() {
      @Override public void onPageFinished(WebView view, String url) {
        if (!tabletApplied && url != null && url.startsWith("file:///android_asset/")) {
          tabletApplied = true;
          injectTabletMode();
        }
      }
      @Override public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
        Toast.makeText(MainActivity.this, "Falha ao carregar o PDV. Verifique a internet.", Toast.LENGTH_LONG).show();
      }
    });
    setContentView(web);
    // Sempre iniciar os assets locais desta versão para não restaurar URL remota antiga.
    web.loadUrl(BASE_URL);
  }
  private void injectTabletMode() {
    try {
      String css = readAsset("tablet.css").replace("\\", "\\\\").replace("'", "\\'").replace("\r", "").replace("\n", "\\n");
      String js = "(function(){var s=document.createElement('style');s.type='text/css';s.appendChild(document.createTextNode('"+css+"'));document.head.appendChild(s);document.body.classList.add('pdv-tablet');var b=document.getElementById('t-sell');if(b)b.click();})();";
      if (android.os.Build.VERSION.SDK_INT >= 19) web.evaluateJavascript(js, null);
      else web.loadUrl("javascript:"+js);
    } catch (Exception e) { Toast.makeText(this,"Não foi possível ativar o modo tablet.",Toast.LENGTH_SHORT).show(); }
  }
  private String readAsset(String file) throws Exception {
    java.io.InputStream in=getAssets().open(file); java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream(); byte[] b=new byte[4096]; int n;
    while((n=in.read(b))>0)out.write(b,0,n); in.close(); return new String(out.toByteArray(),"UTF-8");
  }
  private void immersive() {
    getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
  }
  @Override public void onWindowFocusChanged(boolean hasFocus) { super.onWindowFocusChanged(hasFocus); if(hasFocus)immersive(); }
  @Override public void onBackPressed() { if(web!=null&&web.canGoBack())web.goBack(); else super.onBackPressed(); }
  @Override protected void onSaveInstanceState(Bundle out) { if(web!=null)web.saveState(out); super.onSaveInstanceState(out); }
  @Override protected void onDestroy() { if(web!=null){web.stopLoading();web.destroy();} super.onDestroy(); }
}
