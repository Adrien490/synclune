"use client"

import { SearchInput } from "@/shared/components/search-input"

export function CustomerOrdersFilters() {
	return (
		<SearchInput
			paramName="search"
			placeholder="Rechercher par n° de commande..."
			mode="live"
			size="sm"
			debounceMs={400}
			ariaLabel="Rechercher une commande par numéro"
		/>
	)
}
