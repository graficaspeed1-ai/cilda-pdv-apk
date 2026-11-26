# Cilda Biju – Frente de Caixa (APK) – Galaxy Tab E 9.6 (SM-T561M)

## Antes de começar (no tablet)
- Configurações > Sobre o dispositivo > **Versão do Android**. O app precisa de **Android 5.1 ou superior**
  (5.1.1 é a última versão oficial do SM-T561M). No Android 4.4 o app não instala.
- Abra a **Play Store**, procure "Android System WebView" e atualize (é ele que desenha o app).

## Gerar o APK
1. Crie um repositório no GitHub (ex.: `cilda-pdv`).
2. Envie TODOS os arquivos desta pasta (inclusive a pasta oculta `.github`).
3. Aba **Actions** > **Build APK** > **Run workflow** (ou roda sozinho ao enviar).
4. Em uns 5 a 10 min, baixe **cilda-biju-pdv-apk** em *Artifacts* e descompacte.

## Instalar no tablet
1. Copie `app-debug.apk` para o tablet (cabo USB, Drive ou e-mail).
2. Configurações > **Tela de bloqueio e segurança** > ative **Fontes desconhecidas**.
3. Abra o arquivo (app "Meus arquivos") e toque em Instalar.

O app abre sempre na horizontal e guarda as vendas do dia no próprio tablet.
Para testar antes: abra `www/index.html` no navegador.
