import type React from 'react'
import { createContext, memo, use } from 'react'
import { isShallowEqual as shallowEqual } from 'remeda'

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
	}, shallowEqual)

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
