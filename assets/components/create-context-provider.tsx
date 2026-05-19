import type React from 'react'
import { createContext, memo, use } from 'react'

// Vendored from remeda isShallowEqual (MIT) — keeps kit assets free of remeda.
function isShallowEqual(a: unknown, b: unknown): boolean {
	if (a === b || Object.is(a, b)) {
		return true
	}

	if (
		typeof a !== 'object' ||
		a === null ||
		typeof b !== 'object' ||
		b === null
	) {
		return false
	}

	if (a instanceof Map && b instanceof Map) {
		return isMapShallowEqual(a, b)
	}

	if (a instanceof Set && b instanceof Set) {
		return isSetShallowEqual(a, b)
	}

	const keys = Object.keys(a)
	if (keys.length !== Object.keys(b).length) {
		return false
	}

	for (const key of keys) {
		if (!Object.hasOwn(b, key)) {
			return false
		}

		const valueA = (a as Record<string, unknown>)[key]
		const valueB = (b as Record<string, unknown>)[key]

		if (valueA !== valueB || !Object.is(valueA, valueB)) {
			return false
		}
	}

	return true
}

function isMapShallowEqual(
	a: ReadonlyMap<unknown, unknown>,
	b: ReadonlyMap<unknown, unknown>,
): boolean {
	if (a.size !== b.size) {
		return false
	}

	for (const [key, value] of a) {
		const valueB = b.get(key)
		if (value !== valueB || !Object.is(value, valueB)) {
			return false
		}
	}

	return true
}

function isSetShallowEqual(
	a: ReadonlySet<unknown>,
	b: ReadonlySet<unknown>,
): boolean {
	if (a.size !== b.size) {
		return false
	}

	for (const value of a) {
		if (!b.has(value)) {
			return false
		}
	}

	return true
}

type ProviderProps<TProps, TContext> = TProps & {
	children: React.ReactNode | ((api: TContext) => React.ReactNode)
}

export function createContextProvider<TProps, TContext>(
	create: (props: TProps) => TContext,
	displayName?: string,
) {
	const Context = createContext<TContext | undefined>(undefined)

	if (displayName) {
		Context.displayName = `${displayName}Provider`
	}

	const Provider = memo((props: ProviderProps<TProps, TContext>) => {
		const value = create(props)
		return (
			<Context.Provider value={value}>
				{typeof props.children === 'function'
					? props.children(value)
					: props.children}
			</Context.Provider>
		)
	}, isShallowEqual)

	const useProvider = () => {
		const context = use(Context)
		if (context === undefined) {
			throw new Error(
				`use${displayName || 'Provider'} must be used within a ${
					displayName ? `${displayName}Provider` : 'Provider'
				}`,
			)
		}
		return context
	}

	return [Provider, useProvider] as const
}
