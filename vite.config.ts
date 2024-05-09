import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
    base: globalThis.eval('process.env.BASE'),
    build: { assetsDir: './' },
    plugins: [solid()],
})
