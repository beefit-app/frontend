import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function beefitAssetResolver() {
  return {
    name: 'beefit-asset-resolver',
    resolveId(id) {
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
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
