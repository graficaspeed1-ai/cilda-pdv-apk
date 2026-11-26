# Cilda Biju – Frente de Caixa (APK) – Galaxy Tab E 9.6 (SM-T561M)

Funciona em Android 4.4 ou superior, sem precisar atualizar nada no tablet.
O app é nativo e leve (não depende de navegador atualizado) e guarda as vendas do dia no próprio tablet.

## Gerar o APK
1. Crie um repositório no GitHub (ex.: `cilda-pdv`).
2. Envie TODOS os arquivos desta pasta (inclusive a pasta oculta `.github`), mantendo as pastas.
3. Aba **Actions** > **Build APK** > **Run workflow** (ou roda sozinho ao enviar).
4. Em uns 5 a 10 min, baixe **cilda-biju-pdv-apk** em *Artifacts* e descompacte.

## Instalar no tablet
1. Copie `app-debug.apk` para o tablet (cabo USB, Drive ou e-mail).
2. Configurações > **Tela de bloqueio e segurança** (ou **Segurança**) > ative **Fontes desconhecidas**.
3. Abra o arquivo (app "Meus arquivos") e toque em Instalar.
Se já houver uma versão antiga do app, desinstale antes.

Para testar antes de gerar o APK: abra `app/src/main/assets/index.html` no navegador.
