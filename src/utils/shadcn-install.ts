import path from "node:path"
import { mkdir } from "node:fs/promises"
import {
  BASE_DEPENDENCIES,
  CORE_DEPENDENCIES,
  REGISTRY_URL,
  type DesignSystemConfig,
} from "./shadcn-data"

export type InstallPaths = {
  uiDir: string
  utilsPath: string
  examplePath?: string
}

export type ShadcnAliases = {
  ui: string
  utils: string
  components?: string
}

export type InstallResult = {
  components: number
  dependencies: string[]
  devDependencies: string[]
  uiDir: string
  utilsPath: string
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
    files?: RegistryItemFile[]
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
  const usageWithIcon = (defaultProps ?? "").replace(/\bICON\b/g, iconName)
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

type NormalizedAliases = {
  ui: string
  utils: string
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
    components: aliases.components
      ? normalizeAliasImport(aliases.components)
      : undefined,
  }
}

function deriveHooksAlias(aliases: NormalizedAliases) {
  if (aliases.components) return `${aliases.components}/hooks`
  if (aliases.ui.endsWith("/ui")) {
    return `${aliases.ui.slice(0, -3)}/hooks`
  }
  return `${aliases.ui}/hooks`
}

export async function installShadcnAll(
  config: DesignSystemConfig,
  paths: InstallPaths,
  aliases: ShadcnAliases
): Promise<InstallResult> {
  const uiDir = path.resolve(paths.uiDir)
  const utilsPath = path.resolve(paths.utilsPath)
  const hooksDir = path.resolve(uiDir, "..", "hooks")
  const previewDir = path.resolve(uiDir, "..", "preview")
  const examplePath = path.resolve(paths.examplePath ?? path.join(previewDir, "example.tsx"))
  const normalizedAliases = normalizeAliases(aliases)
  const hooksAlias = deriveHooksAlias(normalizedAliases)
  const exampleImport = normalizedAliases.components
    ? `${normalizedAliases.components}/example`
    : "./example"

  await ensureDir(uiDir)
  await ensureDir(hooksDir)
  await ensureDir(previewDir)

  const registry = await fetchJson<RegistryFile>(
    `${REGISTRY_URL}/styles/${config.base}-${config.style}/registry.json`
  )

  const uiItems = registry.items.filter((item) => item.type === "registry:ui")
  const blockItems = registry.items.filter(
    (item) => item.type === "registry:block"
  )
  const hookItems = registry.items.filter(
    (item) => item.type === "registry:hook"
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
        .replaceAll(`@/registry/bases/${config.base}/hooks/`, `${hooksAlias}/`)
        .replaceAll(`@/registry/new-york-v4/hooks/`, `${hooksAlias}/`)
      await ensureDir(path.dirname(target))
      await Bun.write(target, content)
    }
  }

  if (hookItems.length) {
    for (const hookItem of hookItems) {
      const hook = await fetchRegistryItem(
        config,
        hookItem.name,
        hookItem.files?.[0]?.path
      )
      if (!hook) continue

      if (hook.dependencies) {
        hook.dependencies.forEach((dep) => dependencies.add(dep))
      }

      const hookFile = hook.files?.find((file) => file.content)
      if (!hookFile?.content) continue

      const targetPath = path.join(hooksDir, path.basename(hookFile.path))
      const basePrefix = `@/registry/bases/${config.base}`
      const content = hookFile.content
        .replace(/^["']use client["'];?\s*\n/, "")
        .replaceAll(`${basePrefix}/lib/utils`, normalizedAliases.utils)
      await ensureDir(path.dirname(targetPath))
      await Bun.write(targetPath, content)
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
        .replaceAll(`@/registry/bases/${config.base}/hooks/`, `${hooksAlias}/`)
        .replaceAll(`@/registry/new-york-v4/hooks/`, `${hooksAlias}/`)
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
        .replaceAll(`@/registry/bases/${config.base}/hooks/`, `${hooksAlias}/`)
        .replaceAll(`@/registry/new-york-v4/hooks/`, `${hooksAlias}/`)
      await ensureDir(path.dirname(examplePath))
      await Bun.write(examplePath, content)
    }
  }

  if (utilsRegistryItem.dependencies) {
    utilsRegistryItem.dependencies.forEach((dep) => dependencies.add(dep))
  }

  const baseDeps = BASE_DEPENDENCIES.base ?? []
  const deps = new Set<string>([...CORE_DEPENDENCIES, ...baseDeps])
  for (const dep of dependencies) {
    deps.add(dep)
  }

  return {
    components: uiItems.length,
    dependencies: Array.from(deps).sort(),
    devDependencies: Array.from(devDependencies).sort(),
    uiDir,
    utilsPath,
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
