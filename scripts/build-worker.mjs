import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import * as esbuild from 'esbuild'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

async function buildWorker() {
  try {
    await esbuild.build({
      entryPoints: [join(projectRoot, 'lib/portfolio.worker.ts')],
      bundle: true,
      outfile: join(projectRoot, 'public/portfolio.worker.js'),
      format: 'esm',
      platform: 'browser',
      target: ['es2020'],
      minify: true,
      sourcemap: true,
      external: [],
      loader: {
        '.ts': 'ts',
        '.js': 'js',
        '.json': 'json',
      },
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      resolveExtensions: ['.ts', '.js', '.json'],
      mainFields: ['browser', 'module', 'main'],
      logLevel: 'info',
    })

    console.log('Worker build complete')
  } catch (error) {
    console.error('Worker build failed:', error)
    process.exit(1)
  }
}

buildWorker()
