"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

import { SearchOverlay } from "@/shared/components/search-overlay"

interface MobileSearchWrapperProps {
	placeholder: string
	productTypes: { slug: string; label: string }[]
	recentSearches: string[]
}

/**
 * Wrapper for SearchOverlay that injects data-pending into the product container
 * via Portal for proper group-has-[[data-pending]]/container detection.
 */
export function MobileSearchWrapper({
	placeholder,
	productTypes,
	recentSearches,
}: MobileSearchWrapperProps) {
	const [isSearchPending, setIsSearchPending] = useState(false)
	const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
		null
	)

	// Find the container after mount (client-side only)
	useEffect(() => {
		const container = document.getElementById("product-container")
		setPortalContainer(container)
	}, [])

	return (
		<>
			<SearchOverlay
				placeholder={placeholder}
				productTypes={productTypes}
				recentSearches={recentSearches}
				onPendingChange={setIsSearchPending}
			/>
			{/* Portal: inject data-pending INTO the group/container */}
			{isSearchPending &&
				portalContainer &&
				createPortal(
					<span data-pending="" className="hidden" aria-hidden="true" />,
					portalContainer
				)}
		</>
	)
}
