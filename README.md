# CILDA PDV Android

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

## Compatibilidade do APK com Android 4.4.4
- Durante o build, o workflow baixa uma cópia do HTML e dos scripts públicos do PDV, sem publicar ou alterar o site.
- Transpila os scripts para ES5 e injeta os polyfills de APIs ausentes antes do app.js.
- O WebView do APK intercepta somente a página principal e os scripts do domínio Netlify para servir a cópia compatível, mantendo a origem HTTPS do site e o armazenamento local do navegador.
- A preparação valida a ordem dos scripts e executa testes dos polyfills. A compilação não substitui teste funcional no tablet físico.
