# CILDA PDV Android wrapper

WebView simples (Android 4.4+ / API 19+) que abre https://cildabijueacessorios.netlify.app/

## Gerar o APK
GitHub > Actions > "Build CILDA PDV APK" > Run workflow.
Ao terminar, baixe o artifact `CILDA-PDV-APK` (app-debug.apk) no fim da página da execução.

Atenção: o app carrega o site real; qualquer venda/edição afeta os dados reais da loja.

## Tablet Samsung Galaxy Tab E (SM-T561M, Android 4.4.4)
- minSdk 19 (compatível). O APK é assinado com v1 (obrigatório no KitKat).
- O WebView do KitKat é um Chromium ~30 e NÃO atualiza. O site precisa funcionar sem JS/CSS moderno
  (sem fetch/Promise/let/const/arrow functions/CSS grid sem polyfill/transpilação).
- Certificado: o app aceita erro SSL apenas para cildabijueacessorios.netlify.app.
