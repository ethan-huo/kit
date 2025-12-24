import * as v from "valibot";
import {
	BASE_VALUE_LIST,
	ICON_LIBRARY_VALUE_LIST,
	STYLE_VALUE_LIST,
} from "./utils/shadcn-data";

export type LogLevel = "debug" | "info" | "warn" | "error";

const serviceSchema = v.object({
	host: v.optional(v.string(), "127.0.0.1"),
	port: v.optional(v.number(), 8787),
});

const logsSchema = v.object({
	dir: v.optional(v.string(), "./.kit/logs"),
	level: v.optional(v.picklist(["debug", "info", "warn", "error"]), "info"),
});

const configSchema = v.object({
	service: v.optional(serviceSchema, { host: "127.0.0.1", port: 8787 }),
	logs: v.optional(logsSchema, { dir: "./.kit/logs", level: "info" }),
	shadcn: v.optional(
		v.object({
			installDependencies: v.optional(v.boolean(), true),
			base: v.optional(v.picklist(BASE_VALUE_LIST), "base"),
			style: v.optional(v.picklist(STYLE_VALUE_LIST), "vega"),
			iconLibrary: v.optional(v.picklist(ICON_LIBRARY_VALUE_LIST), "lucide"),
			tsconfigPath: v.string(),
			aliases: v.object({
				ui: v.optional(v.string(), "@/components/ui"),
				utils: v.optional(v.string(), "@/lib/utils"),
				styles: v.optional(v.string(), "@/styles"),
				components: v.optional(v.string(), "@/components"),
				hooks: v.optional(v.string(), "@/components/hooks"),
				lib: v.optional(v.string(), "@/lib"),
			}),
		})
	),
});

export type ConfigInput = v.InferInput<typeof configSchema>;
export type ConfigOutput = v.InferOutput<typeof configSchema>;

export function defineConfig(config: ConfigInput): ConfigOutput {
	return v.parse(configSchema, config);
}

export async function loadConfig(
	configPath?: string
): Promise<ConfigOutput> {
	const path = configPath ?? "kit.config.ts";
	const absolutePath = Bun.pathToFileURL(
		path.startsWith("/") ? path : `${process.cwd()}/${path}`
	).href;

	try {
		const mod = await import(absolutePath);
		const config = mod.default ?? mod;
		return v.parse(configSchema, config);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ERR_MODULE_NOT_FOUND") {
			return v.parse(configSchema, {});
		}
		throw error;
	}
}
