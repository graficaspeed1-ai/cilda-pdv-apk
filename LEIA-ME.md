# Cilda Biju PDV (Vendas + Caixa) – como gerar o APK

1. Crie um repositório no GitHub (ex.: `cilda-pdv`).
2. Envie TODOS os arquivos desta pasta (inclusive a pasta oculta `.github`) para o repositório.
3. Abra a aba **Actions** > **Build APK** > **Run workflow** (ou ele roda sozinho ao enviar os arquivos).
4. Quando terminar (uns 5 a 10 min), clique na execução e baixe **cilda-biju-pdv-apk** em *Artifacts*.
5. Descompacte, copie `app-debug.apk` para o tablet e instale (permita "fontes desconhecidas").

Uso: abra o caixa na aba **Caixa** (informando o troco inicial) antes de vender. Ao fim do dia, conte o dinheiro e feche o caixa.
Os dados ficam salvos no próprio tablet. Para testar antes: abra `www/index.html` no navegador.
