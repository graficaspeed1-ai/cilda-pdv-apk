# Cilda Biju – Vendas, Caixa e Conta (APK) – Galaxy Tab E 9.6 (SM-T561M)

Abas: **Vender**, **Caixa** (abrir/fechar) e **Conta** (leitor de código, smartphone como leitor, impressora e backup).
Funciona em Android 4.4 ou superior. Os dados ficam salvos no próprio tablet.

## Gerar o APK (GitHub)
1. Envie TODOS os arquivos desta pasta para o repositório, mantendo as pastas (`app/`, `.github/workflows/`...).
2. Aba **Actions** > **Build APK** > **Run workflow**. Baixe **cilda-biju-pdv-apk** em *Artifacts*.

## Instalar no tablet
Ative *Fontes desconhecidas* (Configurações > Segurança) e abra o `app-debug.apk`. Se houver versão antiga, desinstale antes.

## Smartphone como leitor
1. Coloque o arquivo `leitor.html` em um site com https (ex.: seu site do Netlify, arrastando o arquivo para o deploy).
2. Na aba Conta do tablet, confira o endereço (ex.: https://seusite.netlify.app/leitor.html) e toque em Salvar endereço.
3. No celular, abra o link mostrado em "Link para abrir no celular", permita a câmera e aponte para o código.
O tablet precisa de internet. O código de conexão é aleatório; se quiser trocar, toque em "Gerar novo código".

## Impressora
Instale o app RawBT (Play Store), pareie a impressora nele (Bluetooth, USB ou rede) e use "Imprimir teste" na aba Conta.
