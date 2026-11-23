CILDA PDV Tablet - projeto Android

Este projeto recompila um APK de WebView em modo paisagem/tela cheia e injeta o CSS do layout tablet somente dentro do APK. O site oficial permanece sem alterações.


IMPORTANTE: O APK agora usa uma cópia local dos arquivos do PDV incluída no aplicativo, mantendo a integração Supabase configurada no bundle. O layout tablet é injetado somente no WebView do APK, sem alterar o site público. O build do GitHub transpila os scripts para ES5 e inclui polyfills para WebView antigo. A tela Vender é aberta ao terminar o carregamento.


Para gerar APK via GitHub Actions:
1. Crie um repositório GitHub novo e vazio.
2. Envie (upload) todos os arquivos/pastas deste projeto para a raiz do repositório.
3. Abra Actions e execute Build CILDA Tablet APK (Run workflow), ou faça commit na branch main.
4. Ao terminar, abra a execução e baixe o artifact CILDA-PDV-Tablet-APK.

O artifact contém app-debug.apk.

Observação: esta fonte não inclui chave de assinatura de release; o APK debug pode ser instalado para teste. Para atualizações, mantenha a mesma assinatura ou desinstale a versão anterior.
