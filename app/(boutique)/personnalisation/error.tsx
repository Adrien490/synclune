"use client"

import { Button } from "@/shared/components/ui/button"
import type { ErrorPageProps } from "@/shared/types/error.types"
import { AlertCircle } from "lucide-react"

export default function PersonnalisationError({ reset }: ErrorPageProps) {
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
