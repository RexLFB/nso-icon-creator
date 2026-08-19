import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base is set for GitHub Pages project sites (served from /<repo>/).
// Override with BASE_PATH=/ to host at the root of a domain instead.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/nso-icon-creator/',
  plugins: [react()],
})
