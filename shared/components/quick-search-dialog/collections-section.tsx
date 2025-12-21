"use client"

import Link from "next/link"
import { Layers } from "lucide-react"

import { Stagger } from "@/shared/components/animations/stagger"
import { Tap } from "@/shared/components/animations/tap"
import { useDialog } from "@/shared/providers/dialog-store-provider"
import { QUICK_SEARCH_DIALOG_ID } from "./constants"

interface CollectionsSectionProps {
	collections: Array<{ slug: string; name: string }>
}

/**
 * Self-sufficient collections section.
 * Handles navigation and dialog close.
 */
export function CollectionsSection({ collections }: CollectionsSectionProps) {
	const { close } = useDialog(QUICK_SEARCH_DIALOG_ID)

	if (collections.length === 0) return null

	return (
		<section>
			<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
				<Layers className="size-4" />
				Collections
			</h2>
			<Stagger className="grid grid-cols-2 gap-2" stagger={0.025} delay={0.1} y={8}>
				{collections.map((collection) => (
					<Tap key={collection.slug}>
						<Link
							href={`/collections/${collection.slug}`}
							onClick={() => close()}
							className="block px-4 py-3 min-h-11 rounded-xl bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-ring/20 transition-all text-left font-medium"
						>
							{collection.name}
						</Link>
					</Tap>
				))}
			</Stagger>
		</section>
	)
}
