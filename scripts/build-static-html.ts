/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import jade from 'jade'
import yaml from 'js-yaml'
import stylus from 'stylus'
import nib from 'nib'
import bootstrap from 'bootstrap-styl'

interface Sample {
  name: string
  printTime: number
  [key: string]: unknown
}

interface GlobalConfig {
  colors: {
    background: number
    [key: string]: unknown
  }
  [key: string]: unknown
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const distDir = path.resolve(projectRoot, 'dist-static')
const samplesDirectory = path.resolve(projectRoot, 'modelSamples')
const globalConfig = yaml.load(
  fs.readFileSync(path.resolve(projectRoot, 'src/common/globals.yaml'), 'utf8')
) as GlobalConfig

function loadSamples(): Sample[] {
  const samples: Record<string, Sample> = {}
  fs.readdirSync(samplesDirectory)
    .filter(file => file.endsWith('.yaml'))
    .map(file => yaml.load(fs.readFileSync(path.join(samplesDirectory, file), 'utf8')) as Sample)
    .forEach(sample => { samples[sample.name] = sample })

  return Object.keys(samples)
    .map(key => samples[key])
    .sort((a, b) => a.printTime - b.printTime)
}

const samples = loadSamples()

const mockApp = {
  get: (key: string) => {
    if (key === 'env') return 'production'
    return null
  }
}

const commonLocals = {
  app: mockApp,
  pageTitle: null,
  samples
}

function compileTemplate(templatePath: string, outputPath: string, locals: Record<string, unknown> = {}) {
  const fullTemplatePath = path.resolve(projectRoot, templatePath)
  let html = jade.renderFile(fullTemplatePath, {
    ...commonLocals,
    ...locals,
    filename: fullTemplatePath
  })

  // Convert absolute paths to relative paths for static serving
  html = html
    .replace(/href="\/styles\//g, 'href="./styles/')
    .replace(/href="\/js\//g, 'href="./js/')
    .replace(/src="\/js\//g, 'src="./js/')
    .replace(/src="\/libs\//g, 'src="./libs/')
    .replace(/src="\/img\//g, 'src="./img/')
    .replace(/src="\/node_modules\//g, 'src="./node_modules/')
    .replace(/href="\/node_modules\//g, 'href="./node_modules/')
    .replace(/href="\/examples"/g, 'href="./examples.html"')
    .replace(/href="\/team"/g, 'href="./team.html"')
    .replace(/href="app#/g, 'href="./app.html#')
    .replace(/href="\/"/g, 'href="./"')
    // Also handle paths without leading slash (relative paths in templates)
    .replace(/src="img\//g, 'src="./img/')
    .replace(/href="download\//g, 'href="./download/')

  const fullOutputPath = path.resolve(distDir, outputPath)
  fs.mkdirSync(path.dirname(fullOutputPath), { recursive: true })
  fs.writeFileSync(fullOutputPath, html)
  console.log(`Generated: ${outputPath}`)
}

compileTemplate('views/app/app.jade', 'app.html', { page: 'editor' })
compileTemplate('views/landingpage/landingpage.jade', 'index.html', { page: 'landing' })
compileTemplate('views/landingpage/team.jade', 'team.html', { page: 'landing', pageTitle: 'Team' })
compileTemplate('views/landingpage/examples.jade', 'examples.html', { page: 'landing', pageTitle: 'Examples' })

console.log('HTML templates compiled successfully')

// Compile Stylus to CSS
const stylusSource = fs.readFileSync(
  path.resolve(projectRoot, 'public/styles/screen.styl'),
  'utf8'
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stylusInstance = stylus(stylusSource) as any

const compiledCss = await new Promise<string>((resolve, reject) => {
  stylusInstance
    .set('filename', path.resolve(projectRoot, 'public/styles/screen.styl'))
    .set('compress', true)
    .set('include css', true)
    .set('paths', [
      path.resolve(projectRoot, 'public/styles'),
      path.resolve(projectRoot, 'node_modules')
    ])
    .use(nib())
    .use(bootstrap())
    .define('backgroundColor', `#${('000000' +
      globalConfig.colors.background.toString(16)).slice(-6)}`)
    .render((err: Error | null, css: string) => {
      if (err) reject(err instanceof Error ? err : new Error(String(err)))
      else resolve(css)
    })
})

// Fix font paths for static serving (convert absolute to relative)
const css = compiledCss
  .replace(/url\("\/node_modules\//g, 'url("./node_modules/')
  .replace(/url\('\/node_modules\//g, "url('./node_modules/")

const cssOutputPath = path.resolve(distDir, 'styles/screen.css')
fs.mkdirSync(path.dirname(cssOutputPath), { recursive: true })
fs.writeFileSync(cssOutputPath, css)
console.log('Compiled: styles/screen.css')

// Copy required node_modules files
const nodeModulesToCopy = [
  'jquery/dist/jquery.min.js',
  'mousetrap/mousetrap.min.js'
]

for (const modulePath of nodeModulesToCopy) {
  const srcPath = path.resolve(projectRoot, 'node_modules', modulePath)
  const destPath = path.resolve(distDir, 'node_modules', modulePath)

  if (fs.existsSync(srcPath)) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true })
    fs.copyFileSync(srcPath, destPath)
    console.log(`Copied: node_modules/${modulePath}`)
  } else {
    console.warn(`Warning: ${srcPath} not found`)
  }
}

// Copy model sample files (STL files without extension)
const modelDir = path.resolve(distDir, 'model')
fs.mkdirSync(modelDir, { recursive: true })

for (const sample of samples) {
  const srcPath = path.resolve(samplesDirectory, sample.name)
  const destPath = path.resolve(modelDir, sample.name)
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath)
    console.log(`Copied model: ${sample.name}`)
  }
}

// Fix JavaScript paths for static serving
// The landingpage.js sets href="app#..." dynamically, we need "./app.html#..."
const jsDir = path.resolve(distDir, 'js')
const jsFilesToFix = ['landingpage.js', 'landingpage-legacy.js']

for (const jsFile of jsFilesToFix) {
  const jsPath = path.resolve(jsDir, jsFile)
  if (fs.existsSync(jsPath)) {
    let content = fs.readFileSync(jsPath, 'utf8')
    // Fix the dynamic href setting: "app#initialModel=" -> "./app.html#initialModel="
    content = content.replace(/"app#initialModel="/g, '"./app.html#initialModel="')
    fs.writeFileSync(jsPath, content)
    console.log(`Fixed paths in: ${jsFile}`)
  }
}


// Copy bootstrap fonts
const bootstrapFontsDir = path.resolve(projectRoot, 'node_modules/bootstrap-styl/fonts')
const destFontsDir = path.resolve(distDir, 'node_modules/bootstrap-styl/fonts')
if (fs.existsSync(bootstrapFontsDir)) {
  fs.mkdirSync(destFontsDir, { recursive: true })
  for (const file of fs.readdirSync(bootstrapFontsDir)) {
    fs.copyFileSync(
      path.resolve(bootstrapFontsDir, file),
      path.resolve(destFontsDir, file)
    )
  }
  console.log('Copied bootstrap fonts')
}

// Copy Font Awesome fonts
// The CSS references ../fonts/fontawesome-webfont.* relative to styles/screen.css
// So fonts need to be at fonts/fontawesome-webfont.*
const fontAwesomeFontsDir = path.resolve(projectRoot, 'node_modules/font-awesome/fonts')
const destFontsRootDir = path.resolve(distDir, 'fonts')
if (fs.existsSync(fontAwesomeFontsDir)) {
  fs.mkdirSync(destFontsRootDir, { recursive: true })
  for (const file of fs.readdirSync(fontAwesomeFontsDir)) {
    fs.copyFileSync(
      path.resolve(fontAwesomeFontsDir, file),
      path.resolve(destFontsRootDir, file)
    )
  }
  console.log('Copied Font Awesome fonts')
}

console.log('Static build complete')
