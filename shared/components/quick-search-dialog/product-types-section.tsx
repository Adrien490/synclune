"use client"

import Link from "next/link"
import { Sparkles } from "lucide-react"

import { Stagger } from "@/shared/components/animations/stagger"
import { Tap } from "@/shared/components/animations/tap"
import { useDialog } from "@/shared/providers/dialog-store-provider"
import { QUICK_SEARCH_DIALOG_ID } from "./constants"

interface ProductTypesSectionProps {
	productTypes: Array<{ slug: string; label: string }>
}

/**
 * Self-sufficient product types section.
 * Handles navigation and dialog close.
 */
export function ProductTypesSection({ productTypes }: ProductTypesSectionProps) {
	const { close } = useDialog(QUICK_SEARCH_DIALOG_ID)

	if (productTypes.length === 0) return null

	return (
		<section>
			<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
				<Sparkles className="size-4" />
				Categories
			</h2>
			<Stagger className="grid grid-cols-2 gap-2" stagger={0.025} delay={0.15} y={8}>
				{productTypes.map((type) => (
					<Tap key={type.slug}>
						<Link
							href={`/produits/${type.slug}`}
							onClick={() => close()}
							className="block px-4 py-3 min-h-11 rounded-xl bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-ring/20 transition-all text-left font-medium"
						>
							{type.label}
						</Link>
					</Tap>
				))}
			</Stagger>
		</section>
	)
}
