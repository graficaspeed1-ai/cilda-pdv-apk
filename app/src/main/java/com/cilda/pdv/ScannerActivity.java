package com.cilda.pdv;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.view.Gravity;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;

/** Leitor de código via scanners USB/Bluetooth em modo teclado (HID). */
public class ScannerActivity extends Activity {
    public static final String EXTRA_CODE = "com.cilda.pdv.EXTRA_CODE";
    private EditText codeInput;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(24, 24, 24, 24);
        root.setBackgroundColor(0xfff7f3f8);

        TextView title = new TextView(this);
        title.setText("Leitura de código de barras");
        title.setTextSize(22);
        title.setTextColor(0xffc90078);
        root.addView(title);

        TextView hint = new TextView(this);
        hint.setText("Conecte um leitor USB/OTG ou Bluetooth configurado como teclado e faça a leitura. O código será enviado automaticamente ao PDV quando o leitor pressionar Enter.");
        hint.setTextSize(16);
        hint.setTextColor(0xff333333);
        hint.setPadding(0, 16, 0, 16);
        root.addView(hint);

        codeInput = new EditText(this);
        codeInput.setSingleLine(true);
        codeInput.setTextSize(20);
        codeInput.setHint("Aguardando código...");
        codeInput.setImeOptions(EditorInfo.IME_ACTION_DONE);
        root.addView(codeInput, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        codeInput.setOnEditorActionListener(new TextView.OnEditorActionListener() {
            @Override
            public boolean onEditorAction(TextView v, int actionId, android.view.KeyEvent event) {
                submitCode();
                return true;
            }
        });

        Button send = new Button(this);
        send.setText("ENVIAR CÓDIGO");
        send.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { submitCode(); }
        });
        root.addView(send);

        Button cancel = new Button(this);
        cancel.setText("CANCELAR");
        cancel.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { setResult(RESULT_CANCELED); finish(); }
        });
        root.addView(cancel);

        setContentView(root);
        codeInput.requestFocus();
    }

    private void submitCode() {
        String code = codeInput.getText().toString().trim();
        if (code.length() == 0) return;
        Intent result = new Intent();
        result.putExtra(EXTRA_CODE, code);
        setResult(RESULT_OK, result);
        finish();
    }
}
