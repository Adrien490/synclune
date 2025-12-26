"use client"

import { useEffect } from "react"
import { Button } from "@/shared/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function PersonnalisationError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		console.error("[Personnalisation] Erreur:", error)
	}, [error])

	return (
		<div className="min-h-screen flex items-center justify-center px-4">
			<div className="text-center max-w-md space-y-4">
				<AlertCircle className="h-12 w-12 text-destructive mx-auto" />
				<h1 className="text-xl font-semibold">Une erreur est survenue</h1>
				<p className="text-muted-foreground">
					Impossible de charger le formulaire de personnalisation.
					Veuillez réessayer.
				</p>
				<Button onClick={reset}>Réessayer</Button>
			</div>
		</div>
	)
}
