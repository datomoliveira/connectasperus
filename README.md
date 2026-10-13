# 💎 Asperus Cast (ConnectAsperus)

> Sistema moderno e elegante de transmissão de fotos e vídeos curtos para TV com controle remoto PWA e estética **Liquid Glass** em preto e grafite brilhoso de alto contraste.

---

## ✨ Recursos Principais

- 📺 **Modo TV (Telão Interativo)**:
  - Pareamento instantâneo via **QR Code** de alta definição e código de sala de 4 caracteres.
  - Transmissão fluida de **Fotos (JPG, PNG, WebP)** e **Vídeos Curtos (MP4, WebM)**.
  - **Avanço automático inteligente**: detecta quando o vídeo curto termina e passa para a próxima mídia sem interrupção.
  - HUD flutuante em Liquid Glass com relógio, barra de progresso suave e contagem de tempo (auto-ocultável para modo cinema).
  - Suporte a Modo Tela Cheia (`F` ou botão no HUD) e atalhos de teclado (Espaço = Play/Pause, Setas = Avançar/Voltar).

- 📱 **Modo Controle PWA (Android & iOS)**:
  - **Instalável como App nativo (PWA)**: adicione à tela inicial com ícone personalizado e tela cheia.
  - Conexão em 1 segundo: basta apontar a câmera do celular para o QR Code da TV.
  - **Design Liquid Glass**:
    - Fundo preto ônix (`#070709`) com reflexos metálicos em grafite brilhoso.
    - Efeitos de desfoque de fundo profundo (`backdrop-filter: blur`), bordas especulares com brilho translúcido e relevo tátil.
  - **Timer Totalmente Controlável**:
    - Slider contínuo de **1 a 60 segundos** por imagem.
    - Presets rápidos de um toque: `3s`, `5s`, `8s`, `10s`, `15s`, `30s`.
    - Alternador de enquadramento na TV: **Ajustar à tela** ou **Preencher**.
  - **Gerenciador de Fila**:
    - Upload múltiplo de fotos e vídeos direto da galeria ou câmera do celular.
    - Botão **Demonstração Rápida** com fotos cósmicas e vídeos curtos para testar imediatamente.
    - Miniaturas dinâmicas, toque para pular direto para uma mídia na TV, reordenação e exclusão.

---

## 🚀 Como Iniciar

### 1. Iniciar o Sistema (Produção)
Para rodar tudo em um único comando na porta `3001`:

```bash
npm start
```

O terminal exibirá os endereços locais, por exemplo:
```
======================================================
💎 Asperus Cast Server rodando em http://localhost:3001
📡 Acesso na rede local: http://192.168.1.3:3001
======================================================
```

### 2. Abrir na TV
- No navegador da Smart TV (ou computador conectado à TV), abra:
  `http://192.168.1.3:3001/?role=tv`
- Uma tela com o **QR Code** e o código da sala será exibida.

### 3. Conectar pelo Celular
- Abra a **câmera padrão** do seu iPhone ou Android e aponte para o QR Code na TV.
- Toque no link que surgir na tela da câmera.
- O controle abrirá imediatamente já conectado à sala da TV!
- *(Opcional)* Para instalar como App no celular:
  - **No iOS (Safari)**: Toque em **Compartilhar** ➔ **Adicionar à Tela de Início**.
  - **No Android (Chrome)**: Toque no menu (3 pontinhos) ➔ **Instalar aplicativo** ou **Adicionar à tela inicial**.

---

## 🛠️ Ambiente de Desenvolvimento

Para editar os componentes com Hot Reload do Vite:

```bash
# Terminal 1: Iniciar servidor backend
npm run dev:server

# Terminal 2: Iniciar frontend Vite
npm run dev:client
```

Para gerar uma nova versão de produção:
```bash
npm run build:client
```

---

## 📂 Estrutura do Projeto

```
connectasperus/
├── client/                     # Aplicação Frontend React + Tailwind + PWA
│   ├── public/
│   │   ├── manifest.json       # Configuração PWA
│   │   ├── sw.js               # Service Worker
│   │   ├── icon-192.svg        # Ícone do aplicativo
│   │   └── icon-512.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── TvDisplay.jsx       # Interface cinematográfica da TV
│   │   │   ├── MobileRemote.jsx    # Controle PWA no celular
│   │   │   ├── LiquidGlassCard.jsx # Efeito de vidro líquido e reflexo
│   │   │   └── QrScannerModal.jsx  # Modal de digitação e pareamento
│   │   ├── hooks/
│   │   │   └── useSocket.js        # Comunicação em tempo real
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   └── vite.config.js
├── server/                     # Backend Node.js + Express + Socket.IO + Multer
│   ├── uploads/                # Armazenamento de fotos e vídeos enviados
│   ├── server.js               # Servidor WebSockets e API REST
│   └── package.json
└── package.json                # Scripts principais do projeto
```
