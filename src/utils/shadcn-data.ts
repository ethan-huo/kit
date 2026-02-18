export const API_URL = 'https://ui.shadcn.com'
export const REGISTRY_URL = `${API_URL}/r`
export const SHADCN_PACKAGE_JSON_URL =
	'https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/package.json'

const BASE_VALUES = ['radix', 'base'] as const
const STYLE_VALUES = ['vega'] as const
const ICON_LIBRARY_VALUES = [
	'lucide',
	'tabler',
	'hugeicons',
	'phosphor',
	'remixicon',
] as const
const FONT_VALUES = [
	'geist-sans',
	'inter',
	'noto-sans',
	'nunito-sans',
	'figtree',
	'roboto',
	'raleway',
	'dm-sans',
	'public-sans',
	'outfit',
	'jetbrains-mono',
	'geist-mono',
] as const
const BASE_COLOR_VALUES = ['neutral', 'gray', 'zinc', 'stone', 'slate'] as const
const THEME_VALUES = ['neutral', 'gray', 'zinc', 'stone', 'slate'] as const
const MENU_ACCENT_VALUES = ['subtle', 'bold'] as const
const MENU_COLOR_VALUES = ['default', 'inverted'] as const
const RADIUS_VALUES = ['default', 'none', 'small', 'medium', 'large'] as const

export type BaseValue = (typeof BASE_VALUES)[number]
export type StyleValue = (typeof STYLE_VALUES)[number]
export type IconLibraryValue = (typeof ICON_LIBRARY_VALUES)[number]
export type FontValue = (typeof FONT_VALUES)[number]
export type BaseColorValue = (typeof BASE_COLOR_VALUES)[number]
export type ThemeValue = (typeof THEME_VALUES)[number]
export type MenuAccentValue = (typeof MENU_ACCENT_VALUES)[number]
export type MenuColorValue = (typeof MENU_COLOR_VALUES)[number]
export type RadiusValue = (typeof RADIUS_VALUES)[number]

export type DesignSystemConfig = {
	base: BaseValue
	style: StyleValue
	iconLibrary: IconLibraryValue
}

export const BASES = BASE_VALUES.map((value) => ({
	value,
	label: value === 'radix' ? 'Radix UI' : 'Base UI',
}))

export const STYLES = STYLE_VALUES.map((value) => ({
	value,
	label: value.charAt(0).toUpperCase() + value.slice(1),
}))

export const ICON_LIBRARIES = [
	{ value: 'lucide', label: 'Lucide', packages: ['lucide-react'] },
	{ value: 'tabler', label: 'Tabler Icons', packages: ['@tabler/icons-react'] },
	{
		value: 'hugeicons',
		label: 'HugeIcons',
		packages: ['@hugeicons/react', '@hugeicons/core-free-icons'],
	},
	{
		value: 'phosphor',
		label: 'Phosphor Icons',
		packages: ['@phosphor-icons/react'],
	},
	{
		value: 'remixicon',
		label: 'Remix Icon',
		packages: ['@remixicon/react'],
	},
] as const

export const FONTS = [
	{ value: 'geist-sans', label: 'Geist Sans' },
	{ value: 'inter', label: 'Inter' },
	{ value: 'noto-sans', label: 'Noto Sans' },
	{ value: 'nunito-sans', label: 'Nunito Sans' },
	{ value: 'figtree', label: 'Figtree' },
	{ value: 'roboto', label: 'Roboto' },
	{ value: 'raleway', label: 'Raleway' },
	{ value: 'dm-sans', label: 'DM Sans' },
	{ value: 'public-sans', label: 'Public Sans' },
	{ value: 'outfit', label: 'Outfit' },
	{ value: 'jetbrains-mono', label: 'JetBrains Mono' },
	{ value: 'geist-mono', label: 'Geist Mono' },
] as const

export const BASE_COLORS = BASE_COLOR_VALUES.map((value) => ({
	value,
	label: value.charAt(0).toUpperCase() + value.slice(1),
}))

export const THEMES = THEME_VALUES.map((value) => ({
	value,
	label: value.charAt(0).toUpperCase() + value.slice(1),
}))

export const MENU_ACCENTS = MENU_ACCENT_VALUES.map((value) => ({
	value,
	label: value.charAt(0).toUpperCase() + value.slice(1),
}))

export const MENU_COLORS = MENU_COLOR_VALUES.map((value) => ({
	value,
	label: value.charAt(0).toUpperCase() + value.slice(1),
}))

export const RADII = RADIUS_VALUES.map((value) => ({
	value,
	label: value.charAt(0).toUpperCase() + value.slice(1),
}))

export const DEFAULT_CONFIG: DesignSystemConfig = {
	base: 'radix',
	style: 'vega',
	iconLibrary: 'lucide',
}

export const CORE_DEPENDENCIES = [
	'shadcn@latest',
	'class-variance-authority',
	'tw-animate-css',
	'clsx',
	'tailwind-merge',
]

export const BASE_DEPENDENCIES = {
	radix: ['radix-ui'],
	base: ['@base-ui/react'],
} as const satisfies Record<BaseValue, readonly string[]>

export function getThemesForBaseColor(
	themes: { value: ThemeValue }[],
	baseColor: BaseColorValue,
) {
	const baseColorNames = BASE_COLOR_VALUES as readonly string[]
	return themes.filter((theme) => {
		if (theme.value === baseColor) return true
		return !baseColorNames.includes(theme.value)
	})
}

export const BASE_VALUE_LIST = BASE_VALUES
export const STYLE_VALUE_LIST = STYLE_VALUES
export const ICON_LIBRARY_VALUE_LIST = ICON_LIBRARY_VALUES
export const FONT_VALUE_LIST = FONT_VALUES
export const BASE_COLOR_VALUE_LIST = BASE_COLOR_VALUES
export const THEME_VALUE_LIST = THEME_VALUES
export const MENU_ACCENT_VALUE_LIST = MENU_ACCENT_VALUES
export const MENU_COLOR_VALUE_LIST = MENU_COLOR_VALUES
export const RADIUS_VALUE_LIST = RADIUS_VALUES
