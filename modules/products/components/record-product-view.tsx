"use client"

import { useEffect, useRef } from "react"
import { addRecentProduct } from "@/shared/actions/add-recent-product"

interface RecordProductViewProps {
	/** Slug du produit a enregistrer */
	slug: string
}

/**
 * Composant invisible qui enregistre une vue produit
 *
 * Utilise useEffect pour appeler la server action une seule fois
 * lors du montage du composant.
 *
 * @example
 * ```tsx
 * <RecordProductView slug={product.slug} />
 * ```
 */
export function RecordProductView({ slug }: RecordProductViewProps) {
	const hasRecorded = useRef(false)

	useEffect(() => {
		// Eviter les doubles enregistrements (StrictMode, re-renders)
		if (hasRecorded.current) return
		hasRecorded.current = true

		// Enregistrer la vue via server action
		const formData = new FormData()
		formData.set("slug", slug)
		addRecentProduct(undefined, formData)
	}, [slug])

	return null
}
