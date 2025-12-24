import { Command } from "commander"
import path from "node:path"
import { mkdir } from "node:fs/promises"
import { ICON_LIBRARIES } from "../utils/shadcn-data"
import { installShadcnAll } from "../utils/shadcn-install"
import { loadConfig } from "../config"
import { c } from "../utils/color"
import { loadTsconfig, resolveAliasPath } from "../utils/tsconfig"


export const installShadcnCommand = new Command("install-shadcn")
  .description("Install shadcn/ui components from online registry")
  .option("--no-install", "skip bun add")
  .option("-c, --config <path>", "kit config path", "kit.config.ts")
  .action(async (options) => {
    const configPath = options.config as string
    const configDir = path.isAbsolute(configPath)
      ? path.dirname(configPath)
      : path.dirname(path.resolve(process.cwd(), configPath))
    const config = await loadConfig(options.config)
    const configShadcn = config.shadcn
    if (!configShadcn) {
      console.error(
        c.error("Missing shadcn config. Add shadcn settings to kit.config.ts.")
      )
      return
    }

    const { iconLibrary, aliases, tsconfigPath } = configShadcn

    if (!iconLibrary || !tsconfigPath) {
      console.error(
        c.error(
          "Missing shadcn config values. Ensure iconLibrary/tsconfigPath are set."
        )
      )
      return
    }
    const base = "base"
    const style = "vega"

    console.log("")
    console.log(c.info("Installing shadcn/ui..."))
    console.log("")

    const resolveConfigPath = (value: string) =>
      path.isAbsolute(value) ? value : path.resolve(configDir, value)
    const tsconfigAbsolute = resolveConfigPath(tsconfigPath)
    const tsconfig = await loadTsconfig(tsconfigAbsolute)
    const resolvePath = (value: string, fallbackExt?: string) => {
      const trimmed = value.trim()
      let resolved: string

      if (path.isAbsolute(trimmed)) {
        resolved = trimmed
      } else if (trimmed.startsWith(".")) {
        resolved = path.resolve(configDir, trimmed)
      } else {
        const aliasResolved = resolveAliasPath(trimmed, tsconfig)
        if (aliasResolved) {
          resolved = aliasResolved
        } else {
          if (trimmed.startsWith("@") || trimmed.startsWith("~")) {
            throw new Error(`Unable to resolve alias path: ${trimmed}`)
          }
          resolved = path.resolve(configDir, trimmed)
        }
      }

      if (fallbackExt && !path.extname(resolved)) {
        return `${resolved}${fallbackExt}`
      }
      return resolved
    }

    const examplePath = aliases.components
      ? resolvePath(`${aliases.components}/example`, ".tsx")
      : undefined

    const result = await installShadcnAll(
      { base, style, iconLibrary },
      {
        uiDir: resolvePath(aliases.ui),
        utilsPath: resolvePath(aliases.utils, ".ts"),
        examplePath,
      },
      aliases
    )

    console.log(c.success(`Components copied: ${result.components}`))
    console.log(c.info(`UI dir: ${path.relative(process.cwd(), result.uiDir)}`))
    console.log(
      c.info(`Utils file: ${path.relative(process.cwd(), result.utilsPath)}`)
    )
    console.log(c.info(`Style class: style-${style}`))

    const referencePath = path.join(configDir, "references", "base-ui.md")
    const referenceFile = Bun.file(referencePath)
    if (!(await referenceFile.exists())) {
      console.log(c.info("Writing Base UI references..."))
      await mkdir(path.dirname(referencePath), { recursive: true })
      const response = await fetch("https://base-ui.com/llms.txt")
      if (!response.ok) {
        throw new Error(
          `Failed to fetch https://base-ui.com/llms.txt: ${response.status}`
        )
      }
      await Bun.write(referencePath, await response.text())
      console.log(
        c.success(`References: ${path.relative(process.cwd(), referencePath)}`)
      )
    }
    if (result.examplePath) {
      console.log(
        c.info(
          `Example helper: ${path.relative(process.cwd(), result.examplePath)}`
        )
      )
    }
    if (result.previewDir) {
      console.log(
        c.info(
          `Preview blocks: ${result.previewBlocks ?? 0} (${path.relative(
            process.cwd(),
            result.previewDir
          )})`
        )
      )
    }

    const iconDeps =
      ICON_LIBRARIES.find((lib) => lib.value === iconLibrary)?.packages ?? []
    const deps = new Set<string>([...result.dependencies, ...iconDeps])
    const devDeps = new Set<string>(result.devDependencies ?? [])

    if (!options.install || configShadcn.installDependencies === false) {
      console.log("")
      console.log(
        c.warn("Skipped dependency installation (config/--no-install).")
      )
      console.log(c.info("Dependencies required:"))
      Array.from(deps).forEach((dep) => console.log(`- ${dep}`))
      if (devDeps.size) {
        console.log(c.info("Dev dependencies required:"))
        Array.from(devDeps).forEach((dep) => console.log(`- ${dep}`))
      }
      return
    }

    if (deps.size) {
      const depList = Array.from(deps)
      console.log("")
      console.log(c.info("Installing dependencies with bun add..."))
      console.log("")
      await Bun.spawn({
        cmd: ["bun", "add", ...depList],
        stdio: ["inherit", "inherit", "inherit"],
      }).exited
    }

    if (devDeps.size) {
      const depList = Array.from(devDeps)
      console.log("")
      console.log(c.info("Installing dev dependencies with bun add -d..."))
      console.log("")
      await Bun.spawn({
        cmd: ["bun", "add", "-d", ...depList],
        stdio: ["inherit", "inherit", "inherit"],
      }).exited
    }
  })
