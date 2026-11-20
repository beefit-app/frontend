import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


// A CSP so entra no artefato distribuido: em dev o plugin do React injeta o
// preamble de refresh inline, que exigiria 'unsafe-inline' em script-src e
// anularia justamente a protecao que interessa.
//
// style-src precisa de 'unsafe-inline' porque o Ionic e o proprio codigo aplicam
// estilo inline em quase toda tela. img-src e media-src precisam de blob: por
// causa dos object URLs de useAuthenticatedMediaUrl, e data: pelas fotos vindas
// da camera. connect-src recebe a origem da API porque no nativo a pagina roda em
// capacitor://localhost, uma origem diferente da do backend.
function beefitContentSecurityPolicy(apiUrl: string) {
  // frame-ancestors fica de fora: o navegador ignora essa diretiva quando ela vem
  // por <meta>, entao ela tem de ser servida como header HTTP pelo host da pagina.
  const buildDirectives = (apiOrigin: string) => [
    "default-src 'self'",
    "script-src 'self'",
    // fonts.googleapis.com serve a folha de estilo das fontes carregada em
    // src/styles/fonts.css; gstatic serve os arquivos .woff2.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    `img-src 'self' data: blob: ${apiOrigin}`,
    "media-src 'self' blob:",
    `connect-src 'self' ${apiOrigin}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]

  return {
    name: 'beefit-csp',
    apply: 'build' as const,
    transformIndexHtml(html: string) {
      // A origem so e resolvida aqui, e nao no corpo da funcao: o corpo roda ao
      // montar a configuracao, inclusive em `serve`, e um new URL() com
      // VITE_API_URL malformada derrubava o servidor de desenvolvimento com um
      // "Invalid URL" sem contexto. A guarda que valida a variavel so roda no build.
      let apiOrigin: string
      try {
        apiOrigin = new URL(apiUrl).origin
      } catch {
        throw new Error(
          `VITE_API_URL inválida para montar a Content-Security-Policy: ${apiUrl}`,
        )
      }

      return html.replace(
        '<head>',
        `<head>\n      <meta http-equiv="Content-Security-Policy" content="${buildDirectives(apiOrigin).join('; ')}" />`,
      )
    },
  }
}

function beefitAssetResolver() {
  return {
    name: 'beefit-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  if (command === 'build') {
    if (env.VITE_DEV_AUTH_BYPASS === 'true') {
      throw new Error('VITE_DEV_AUTH_BYPASS=true não é permitido em builds distribuídos.')
    }

    const apiUrl = env.VITE_API_URL?.trim()
    if (!apiUrl) {
      throw new Error('VITE_API_URL deve ser definida para gerar o build.')
    }

    const parsedApiUrl = new URL(apiUrl)
    const isLoopback = ['localhost', '127.0.0.1', '10.0.2.2'].includes(parsedApiUrl.hostname)
    const allowsInsecureLocalApi = env.VITE_ALLOW_INSECURE_LOCAL_API === 'true' && isLoopback
    if (parsedApiUrl.protocol !== 'https:' && !allowsInsecureLocalApi) {
      throw new Error('VITE_API_URL deve usar HTTPS; HTTP só é permitido para desenvolvimento local explícito.')
    }
  }

  return {
  plugins: [
    beefitAssetResolver(),
    beefitContentSecurityPolicy(env.VITE_API_URL?.trim() || 'https://localhost'),
    // The React and Tailwind plugins are both required for BeeFit, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      "/auth": "http://localhost:8080",
      "/api": "http://localhost:8080",
      "/users": "http://localhost:8080",
      "/images": "http://localhost:8080",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    // Em paralelo, o jsdom deixa testes de sessão e formulário acima do padrão de 5s,
    // embora passem isolados; o limite maior evita falsos negativos sem esconder travas.
    testTimeout: 15000,
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
