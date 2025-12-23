import path from "node:path"
import { mkdir } from "node:fs/promises"
import {
  API_URL,
  BASE_DEPENDENCIES,
  CORE_DEPENDENCIES,
  REGISTRY_URL,
  type DesignSystemConfig,
} from "./shadcn-data"

export type InstallPaths = {
  uiDir: string
  utilsPath: string
  stylePath: string
  examplePath?: string
}

export type ShadcnAliases = {
  ui: string
  utils: string
  style: string
  components?: string
  hooks?: string
  lib?: string
}

export type InstallResult = {
  components: number
  dependencies: string[]
  devDependencies: string[]
  uiDir: string
  utilsPath: string
  stylePath: string
  examplePath?: string
  previewDir?: string
  previewBlocks?: number
}

type RegistryFile = {
  name: string
  homepage: string
  items: Array<{
    name: string
    type: string
  }>
}

type RegistryItemFile = {
  path: string
  content?: string
  type?: string
}

type RegistryItem = {
  name: string
  type: string
  dependencies?: string[]
  devDependencies?: string[]
  registryDependencies?: string[]
  files?: RegistryItemFile[]
}

type RegistryBaseItem = {
  cssVars?: {
    light?: Record<string, string>
    dark?: Record<string, string>
  }
}

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true })
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  return (await response.json()) as T
}

function transformComponentContent(
  content: string,
  config: DesignSystemConfig,
  aliases: NormalizedAliases
) {
  const basePrefix = `@/registry/bases/${config.base}`
  let output = content.replace(/^["']use client["'];?\s*\n/, "")
  output = output.replaceAll(`${basePrefix}/ui/`, `${aliases.ui}/`)
  output = output.replaceAll(`${basePrefix}/lib/utils`, aliases.utils)
  return transformIcons(output, config.iconLibrary)
}

function transformBlockContent(
  content: string,
  config: DesignSystemConfig,
  aliases: NormalizedAliases,
  exampleImport: string
) {
  const basePrefix = `@/registry/bases/${config.base}`
  let output = content.replace(/^["']use client["'];?\s*\n/, "")
  output = output.replaceAll(`${basePrefix}/ui/`, `${aliases.ui}/`)
  output = output.replaceAll(`${basePrefix}/lib/utils`, aliases.utils)
  output = output.replaceAll(`${basePrefix}/components/example`, exampleImport)
  return transformIcons(output, config.iconLibrary)
}

function transformExampleContent(
  content: string,
  config: DesignSystemConfig,
  aliases: NormalizedAliases
) {
  const basePrefix = `@/registry/bases/${config.base}`
  let output = content.replace(/^["']use client["'];?\s*\n/, "")
  output = output.replaceAll(`${basePrefix}/lib/utils`, aliases.utils)
  return output
}

const ICON_LIBRARY_KEYS = ["lucide", "tabler", "hugeicons", "phosphor"] as const

const ICON_IMPORTS: Record<
  (typeof ICON_LIBRARY_KEYS)[number],
  { imports: string[]; usage: string }
> = {
  lucide: {
    imports: ["import { ICON } from \"lucide-react\""],
    usage: "<ICON />",
  },
  tabler: {
    imports: ["import { ICON } from \"@tabler/icons-react\""],
    usage: "<ICON />",
  },
  hugeicons: {
    imports: [
      "import { HugeiconsIcon } from \"@hugeicons/react\"",
      "import { ICON } from \"@hugeicons/core-free-icons\"",
    ],
    usage: "<HugeiconsIcon icon={ICON} strokeWidth={2} />",
  },
  phosphor: {
    imports: ["import { ICON } from \"@phosphor-icons/react\""],
    usage: "<ICON strokeWidth={2} />",
  },
}

function buildIconTag(
  iconName: string,
  otherProps: string,
  iconLibrary: (typeof ICON_LIBRARY_KEYS)[number]
) {
  const usage = ICON_IMPORTS[iconLibrary].usage
  const match = usage.match(/<(\w+)([^>]*)\/>/)
  if (!match) {
    return `<${iconName}${otherProps ? ` ${otherProps}` : ""} />`
  }

  const [, componentName, defaultProps] = match
  if (componentName === "ICON") {
    const props = otherProps ? ` ${otherProps}` : ""
    return `<${iconName}${props} />`
  }
  const usageWithIcon = defaultProps.replace(/\bICON\b/g, iconName)
  const props = `${usageWithIcon} ${otherProps}`.trim()
  return `<${componentName}${props ? ` ${props}` : ""} />`
}

function transformIcons(content: string, iconLibrary: string) {
  if (!ICON_LIBRARY_KEYS.includes(iconLibrary as never)) {
    return content
  }

  const targetLibrary = iconLibrary as (typeof ICON_LIBRARY_KEYS)[number]
  const iconsUsed = new Set<string>()
  let keepIconPlaceholderImport = false

  const iconPlaceholderRegex = /<IconPlaceholder\b([^>]*?)\/>/g
  let updated = content.replace(
    iconPlaceholderRegex,
    (match, attrs: string) => {
      const attributes = parseJsxAttributes(attrs)
      if (!attributes.length) return match

      let iconName: string | null = null
      const otherAttrs: string[] = []

      for (const attr of attributes) {
        const name = attr.name
        const value = attr.value

        if (name === targetLibrary) {
          const parsed = extractStringLiteral(value)
          if (parsed) {
            iconName = parsed
          }
          continue
        }

        if (ICON_LIBRARY_KEYS.includes(name as never)) {
          continue
        }

        if (value) {
          otherAttrs.push(`${name}=${value}`)
        } else {
          otherAttrs.push(name)
        }
      }

      if (!iconName) {
        keepIconPlaceholderImport = true
        return match
      }
      iconsUsed.add(iconName)

      const otherProps = otherAttrs.join(" ")
      return buildIconTag(iconName, otherProps, targetLibrary)
    }
  )

  if (!iconsUsed.size) {
    return updated
  }

  if (!keepIconPlaceholderImport) {
    updated = updated.replace(
      /import\s*{\s*([\s\S]*?)\s*}\s*from\s*["']([^"']+)["'];?/g,
      (full, imports: string, modulePath: string) => {
        const names = imports
          .split(",")
          .map((name: string) => name.trim())
          .filter(Boolean)
        const filtered = names.filter(
          (name: string) => name !== "IconPlaceholder"
        )
        if (!filtered.length) return ""
        return `import { ${filtered.join(", ")} } from "${modulePath}";`
      }
    )
  }

  const importLines = ICON_IMPORTS[targetLibrary].imports
  const iconImports = importLines
    .map((line) => {
      if (!line.includes("ICON")) return line
      const iconList = Array.from(iconsUsed).join(", ")
      return line.replace("ICON", iconList)
    })
    .join("\n")

  updated = `${iconImports}\n${updated}`
  return updated
}

type JsxAttr = { name: string; value?: string }

function parseJsxAttributes(input: string): JsxAttr[] {
  const attrs: JsxAttr[] = []
  let i = 0
  const len = input.length

  while (i < len) {
    while (i < len && /\s/.test(input[i]!)) i += 1
    if (i >= len) break

    let name = ""
    while (i < len && /[A-Za-z0-9_:-]/.test(input[i]!)) {
      name += input[i]!
      i += 1
    }
    if (!name) break

    while (i < len && /\s/.test(input[i]!)) i += 1
    if (input[i] !== "=") {
      attrs.push({ name })
      continue
    }
    i += 1
    while (i < len && /\s/.test(input[i]!)) i += 1

    if (i >= len) {
      attrs.push({ name })
      break
    }

    const ch = input[i]!
    if (ch === '"' || ch === "'") {
      const quote = ch
      i += 1
      let value = ""
      while (i < len && input[i] !== quote) {
        value += input[i]!
        i += 1
      }
      i += 1
      attrs.push({ name, value: `${quote}${value}${quote}` })
      continue
    }

    if (ch === "{") {
      let depth = 0
      let value = ""
      while (i < len) {
        const c = input[i]!
        value += c
        if (c === "{") depth += 1
        if (c === "}") {
          depth -= 1
          if (depth === 0) {
            i += 1
            break
          }
        }
        i += 1
      }
      attrs.push({ name, value })
      continue
    }

    let value = ""
    while (i < len && !/\s/.test(input[i]!)) {
      value += input[i]!
      i += 1
    }
    attrs.push({ name, value })
  }

  return attrs
}

function extractStringLiteral(value?: string): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const inner = trimmed.slice(1, -1).trim()
    if (
      (inner.startsWith('"') && inner.endsWith('"')) ||
      (inner.startsWith("'") && inner.endsWith("'"))
    ) {
      return inner.slice(1, -1)
    }
  }
  return null
}

function buildCssVars(vars: Record<string, string> | undefined) {
  if (!vars) return ""
  return Object.entries(vars)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join("\n")
}

const FONT_META: Record<
  string,
  { import: string; family: string }
> = {
  "geist-sans": {
    import: "@fontsource-variable/geist-sans",
    family: "'Geist Variable', sans-serif",
  },
  inter: {
    import: "@fontsource-variable/inter",
    family: "'Inter Variable', sans-serif",
  },
  "noto-sans": {
    import: "@fontsource-variable/noto-sans",
    family: "'Noto Sans Variable', sans-serif",
  },
  "nunito-sans": {
    import: "@fontsource-variable/nunito-sans",
    family: "'Nunito Sans Variable', sans-serif",
  },
  figtree: {
    import: "@fontsource-variable/figtree",
    family: "'Figtree Variable', sans-serif",
  },
  roboto: {
    import: "@fontsource-variable/roboto",
    family: "'Roboto', sans-serif",
  },
  raleway: {
    import: "@fontsource-variable/raleway",
    family: "'Raleway', sans-serif",
  },
  "dm-sans": {
    import: "@fontsource-variable/dm-sans",
    family: "'DM Sans', sans-serif",
  },
  "public-sans": {
    import: "@fontsource-variable/public-sans",
    family: "'Public Sans', sans-serif",
  },
  outfit: {
    import: "@fontsource-variable/outfit",
    family: "'Outfit', sans-serif",
  },
  "jetbrains-mono": {
    import: "@fontsource-variable/jetbrains-mono",
    family: "'JetBrains Mono Variable', monospace",
  },
  "geist-mono": {
    import: "@fontsource-variable/geist-mono",
    family: "'Geist Mono Variable', monospace",
  },
}

function buildThemeInline(
  cssVars: RegistryBaseItem["cssVars"],
  fontKey?: string
) {
  const keys = new Set<string>()
  Object.keys(cssVars?.light ?? {}).forEach((key) => keys.add(key))
  Object.keys(cssVars?.dark ?? {}).forEach((key) => keys.add(key))

  const lines: string[] = []
  const fontMeta = fontKey ? FONT_META[fontKey] : undefined
  if (fontMeta) {
    lines.push(`  --font-sans: ${fontMeta.family};`)
  }

  const sortedKeys = Array.from(keys).sort()
  for (const key of sortedKeys) {
    if (key === "radius") continue
    lines.push(`  --color-${key}: var(--${key});`)
  }

  if (keys.has("radius")) {
    lines.push("  --radius-sm: calc(var(--radius) - 4px);")
    lines.push("  --radius-md: calc(var(--radius) - 2px);")
    lines.push("  --radius-lg: var(--radius);")
    lines.push("  --radius-xl: calc(var(--radius) + 4px);")
    lines.push("  --radius-2xl: calc(var(--radius) + 8px);")
    lines.push("  --radius-3xl: calc(var(--radius) + 12px);")
    lines.push("  --radius-4xl: calc(var(--radius) + 16px);")
  }

  if (!lines.length) return ""
  return `@theme inline {\n${lines.join("\n")}\n}\n`
}

async function writeStyleFile(
  config: DesignSystemConfig,
  cssVars: RegistryBaseItem["cssVars"],
  targetPath: string
) {
  const lightVars = buildCssVars(cssVars?.light)
  const darkVars = buildCssVars(cssVars?.dark)
  const themeInline = buildThemeInline(cssVars, config.font)
  const fontMeta = FONT_META[config.font]

  const importLines = [
    '@import "tailwindcss";',
    '@import "tw-animate-css";',
    '@import "shadcn/tailwind.css";',
  ]
  if (fontMeta) {
    importLines.push(`@import "${fontMeta.import}";`)
  }

  const css = `${importLines.join("\n")}

@custom-variant dark (&:is(.dark *));

:root {
${lightVars}
}

.dark {
${darkVars}
}

${themeInline}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply font-sans bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}
`

  await ensureDir(path.dirname(targetPath))
  await Bun.write(targetPath, css)
}

type NormalizedAliases = {
  ui: string
  utils: string
  style: string
  components?: string
}

function normalizeAliasImport(value: string) {
  return value.replace(/\/$/, "")
}

function normalizeModuleImport(value: string) {
  return normalizeAliasImport(value).replace(/\.(tsx?|jsx?)$/, "")
}

function normalizeAliases(aliases: ShadcnAliases): NormalizedAliases {
  return {
    ui: normalizeAliasImport(aliases.ui),
    utils: normalizeModuleImport(aliases.utils),
    style: normalizeModuleImport(aliases.style),
    components: aliases.components
      ? normalizeAliasImport(aliases.components)
      : undefined,
  }
}

export async function installShadcnAll(
  config: DesignSystemConfig,
  paths: InstallPaths,
  aliases: ShadcnAliases
): Promise<InstallResult> {
  const initTemplate = "next"
  const uiDir = path.resolve(paths.uiDir)
  const utilsPath = path.resolve(paths.utilsPath)
  const stylePath = path.resolve(paths.stylePath)
  const previewDir = path.resolve(uiDir, "..", "preview")
  const examplePath = path.resolve(paths.examplePath ?? path.join(previewDir, "example.tsx"))
  const normalizedAliases = normalizeAliases(aliases)
  const exampleImport = normalizedAliases.components
    ? `${normalizedAliases.components}/example`
    : "./example"

  await ensureDir(uiDir)
  await ensureDir(previewDir)

  const registry = await fetchJson<RegistryFile>(
    `${REGISTRY_URL}/styles/${config.base}-${config.style}/registry.json`
  )

  const uiItems = registry.items.filter((item) => item.type === "registry:ui")
  const blockItems = registry.items.filter(
    (item) => item.type === "registry:block"
  )
  const exampleItem = registry.items.find(
    (item) => item.type === "registry:component" && item.name === "example"
  )
  const utilsItem = registry.items.find((item) => item.name === "utils")

  if (!utilsItem) {
    throw new Error("Registry utils item not found.")
  }

  const utilsRegistryItem = await fetchJson<RegistryItem>(
    `${REGISTRY_URL}/styles/${config.base}-${config.style}/utils.json`
  )

  const utilsFile = utilsRegistryItem.files?.[0]
  if (!utilsFile?.content) {
    throw new Error("Utils file content missing in registry.")
  }

  await ensureDir(path.dirname(utilsPath))
  await Bun.write(utilsPath, utilsFile.content)

  const dependencies = new Set<string>()
  const devDependencies = new Set<string>(["@tailwindcss/vite"])

  for (const item of uiItems) {
    const component = await fetchJson<RegistryItem>(
      `${REGISTRY_URL}/styles/${config.base}-${config.style}/${item.name}.json`
    )

    if (component.dependencies) {
      component.dependencies.forEach((dep) => dependencies.add(dep))
    }

    if (component.devDependencies) {
      component.devDependencies.forEach((dep) => devDependencies.add(dep))
    }

    const files = component.files ?? []
    for (const file of files) {
      if (!file.content) continue
      if (!file.path.includes("/ui/")) continue

      const target = path.join(uiDir, path.basename(file.path))
      const content = transformComponentContent(
        file.content,
        config,
        normalizedAliases
      )
      await ensureDir(path.dirname(target))
      await Bun.write(target, content)
    }
  }

  if (blockItems.length) {
    for (const blockItem of blockItems) {
      const block = await fetchRegistryItem(
        config,
        blockItem.name,
        blockItem.files?.[0]?.path
      )
      if (!block) {
        continue
      }

      if (block.dependencies) {
        block.dependencies.forEach((dep) => dependencies.add(dep))
      }

      const blockFile = block.files?.find((file) => file.content)
      if (!blockFile?.content) continue

      const targetPath = path.join(previewDir, `${blockItem.name}.tsx`)
      const content = transformBlockContent(
        blockFile.content,
        config,
        normalizedAliases,
        exampleImport
      )
      await ensureDir(path.dirname(targetPath))
      await Bun.write(targetPath, content)
    }
  }

  if (exampleItem) {
    const example = await fetchJson<RegistryItem>(
      `${REGISTRY_URL}/styles/${config.base}-${config.style}/${exampleItem.name}.json`
    )
    const exampleFile = example.files?.find((file) => file.content)
    if (exampleFile?.content) {
      const content = transformExampleContent(
        exampleFile.content,
        config,
        normalizedAliases
      )
      await ensureDir(path.dirname(examplePath))
      await Bun.write(examplePath, content)
    }
  }

  const initParams = new URLSearchParams({
    base: config.base,
    style: config.style,
    baseColor: config.baseColor,
    theme: config.theme,
    iconLibrary: config.iconLibrary,
    font: config.font,
    menuAccent: config.menuAccent,
    menuColor: config.menuColor,
    radius: config.radius,
    template: initTemplate,
  })

  const registryBase = await fetchJson<RegistryBaseItem>(
    `${API_URL}/init?${initParams.toString()}`
  )

  await writeStyleFile(config, registryBase.cssVars, stylePath)

  if (utilsRegistryItem.dependencies) {
    utilsRegistryItem.dependencies.forEach((dep) => dependencies.add(dep))
  }

  const baseDeps = BASE_DEPENDENCIES[config.base] ?? []
  const deps = new Set<string>([...CORE_DEPENDENCIES, ...baseDeps])
  for (const dep of dependencies) {
    deps.add(dep)
  }
  const fontMeta = FONT_META[config.font]
  if (fontMeta) {
    devDependencies.add(fontMeta.import)
  }

  return {
    components: uiItems.length,
    dependencies: Array.from(deps).sort(),
    devDependencies: Array.from(devDependencies).sort(),
    uiDir,
    utilsPath,
    stylePath,
    examplePath: exampleItem ? examplePath : undefined,
    previewDir: blockItems.length ? previewDir : undefined,
    previewBlocks: blockItems.length || undefined,
  }
}

async function fetchRegistryItem(
  config: DesignSystemConfig,
  name: string,
  filePath?: string
): Promise<RegistryItem | null> {
  const url = `${REGISTRY_URL}/styles/${config.base}-${config.style}/${name}.json`
  try {
    return await fetchJson<RegistryItem>(url)
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error
    }
    if (!error.message.includes(": 404")) {
      throw error
    }
  }

  if (!filePath) {
    return null
  }

  const fallbackUrl = `https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/bases/${config.base}/blocks/${name}.tsx`
  const response = await fetch(fallbackUrl)
  if (!response.ok) {
    return null
  }
  const content = await response.text()

  return {
    name,
    type: "registry:block",
    files: [
      {
        path: filePath,
        content,
        type: "registry:block",
      },
    ],
  }
}
