import { defineConfig } from 'tsup'
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

export default defineConfig({
  entry: ["src",
  "!src/**/__tests__/**",
  "!src/**/*.test.*",
  "!src/**/*.htm*",
  "!src/**/*.py"
],
  splitting: false,
  sourcemap: true,
  clean: true,
  onSuccess: async () => {
    // Copy plugin-loader.py
    const srcLoaderPy = join(process.cwd(), 'src/lib/plugin-loader.py')
    const distLoaderPy = join(process.cwd(), 'dist/lib/plugin-loader.py')
    
    if (existsSync(srcLoaderPy)) {
      const distDir = dirname(distLoaderPy)
      if (!existsSync(distDir)) {
        mkdirSync(distDir, { recursive: true })
      }
      copyFileSync(srcLoaderPy, distLoaderPy)
      console.log(`Copied ${srcLoaderPy} to ${distLoaderPy}`)
    }
    
    // Copy plugin-runner.py
    const srcRunnerPy = join(process.cwd(), 'src/lib/plugin-runner.py')
    const distRunnerPy = join(process.cwd(), 'dist/lib/plugin-runner.py')
    
    if (existsSync(srcRunnerPy)) {
      const distDir = dirname(distRunnerPy)
      if (!existsSync(distDir)) {
        mkdirSync(distDir, { recursive: true })
      }
      copyFileSync(srcRunnerPy, distRunnerPy)
      console.log(`Copied ${srcRunnerPy} to ${distRunnerPy}`)
    }
  },
})
