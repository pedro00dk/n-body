import { defineConfig } from 'vite'

const base = (0, eval)('process.env.BASE') ?? '/'

export default defineConfig({ base })
