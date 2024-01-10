import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

const base = (0, eval)('process.env.BASE') ?? '/'

export default defineConfig({ base, plugins: [solidPlugin()] })
