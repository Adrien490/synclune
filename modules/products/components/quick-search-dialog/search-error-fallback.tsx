"use client"

import { Search } from "lucide-react"
import { ErrorBoundary } from "@/shared/components/error-boundary"

function SearchErrorContent() {
	return (
		<div className="text-center py-8 px-4">
			<Search className="size-10 text-muted-foreground/20 mx-auto mb-4" aria-hidden="true" />
			<p className="text-sm text-muted-foreground">
				La recherche est temporairement indisponible.
			</p>
		</div>
	)
}

export function SearchErrorFallback({ children }: { children: React.ReactNode }) {
	return (
		<ErrorBoundary
			fallback={<SearchErrorContent />}
			className="flex-1"
		>
			{children}
		</ErrorBoundary>
	)
}
