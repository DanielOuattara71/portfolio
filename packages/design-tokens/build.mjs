// Generates dist/tokens.css and dist/motion.mjs from tokens.json (single source of truth).
// Theme rules: light on :root, dark via [data-theme="dark"] (explicit choice)
// or the system preference when no explicit light choice was made.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const tokens = JSON.parse(readFileSync(join(here, 'tokens.json'), 'utf8'))
const out = join(here, 'dist')
mkdirSync(out, { recursive: true })

const themes = tokens.color.themes.map((t) => t.id)
const [first, ...others] = themes
const colorValue = (token, theme) =>
  typeof token.value === 'string' ? token.value : token.value[theme] ?? token.value[first]

const lines = ['/* Index Studio — generated from tokens.json by build.mjs. Do not edit by hand. */']

// Light theme (first theme) + shadows
lines.push(':root {')
for (const t of tokens.color.tokens) lines.push(`  --${t.name}: ${colorValue(t, first)};`)
for (const s of tokens.shadow?.tokens ?? []) lines.push(`  --${s.name}: ${s.value};`)
lines.push('  color-scheme: light;', '}')

// Further themes: explicit choice, then system preference
for (const theme of others) {
  const block = tokens.color.tokens
    .filter((t) => typeof t.value === 'object' && theme in t.value)
    .map((t) => `  --${t.name}: ${t.value[theme]};`)
  lines.push(`:root[data-theme="${theme}"] {`, ...block, `  color-scheme: ${theme};`, '}')
  lines.push(`@media (prefers-color-scheme: ${theme}) {`, '  :root:not([data-theme]) {', ...block.map((l) => '  ' + l), `    color-scheme: ${theme};`, '  }', '}')
}

// Non-color families
lines.push(':root {')
for (const family of ['spacing', 'radius', 'duration', 'easing', 'layout', 'zIndex']) {
  for (const t of tokens[family]?.tokens ?? []) lines.push(`  --${t.name}: ${t.value};`)
}
for (const [key, stack] of Object.entries(tokens.type.families)) lines.push(`  --font-${key}: ${stack};`)
lines.push('}')

// One class per type style
for (const group of tokens.type.groups) {
  for (const s of group.styles) {
    const decl = [
      `font-family: var(--font-${s.family ?? group.family})`,
      `font-size: ${s.fontSize}`,
      `line-height: ${s.lineHeight}`,
      `font-weight: ${s.fontWeight}`,
      s.letterSpacing ? `letter-spacing: ${s.letterSpacing}` : null,
      s.fontStyle ? `font-style: ${s.fontStyle}` : null,
    ].filter(Boolean)
    lines.push(`.${s.name} { ${decl.join('; ')}; }`)
  }
}

writeFileSync(join(out, 'tokens.css'), lines.join('\n') + '\n')

// Motion constants for GSAP (seconds, as GSAP expects)
const ms = (v) => (v.endsWith('ms') ? parseFloat(v) / 1000 : v.endsWith('s') ? parseFloat(v) : Number(v))
const duration = Object.fromEntries((tokens.duration?.tokens ?? []).map((t) => [t.name.replace('duration-', ''), ms(t.value)]))
const easing = Object.fromEntries((tokens.easing?.tokens ?? []).map((t) => [t.name.replace('ease-', ''), t.value]))
writeFileSync(join(out, 'motion.mjs'), `// Generated from tokens.json\nexport const duration = ${JSON.stringify(duration, null, 2)}\nexport const easing = ${JSON.stringify(easing, null, 2)}\n`)
writeFileSync(join(out, 'motion.d.ts'), 'export declare const duration: Record<string, number>\nexport declare const easing: Record<string, string>\n')

console.log(`design-tokens: ${tokens.color.tokens.length} colors, ${themes.length} themes → dist/tokens.css, dist/motion.mjs`)
