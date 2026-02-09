"use client"

import { ErrorBoundary } from "@/shared/components/error-boundary"

export function SearchErrorFallback({ children }: { children: React.ReactNode }) {
	return (
		<ErrorBoundary
			errorMessage="La recherche est temporairement indisponible."
			className="flex-1 flex items-center justify-center"
		>
			{children}
		</ErrorBoundary>
	)
}
