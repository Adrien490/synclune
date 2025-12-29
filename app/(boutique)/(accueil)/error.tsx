"use client"

import { Button } from "@/shared/components/ui/button"
import type { ErrorPageProps } from "@/shared/types/error.types"

export default function HomeError({ error, reset }: ErrorPageProps) {
	return (
		<div className="container mx-auto px-4 py-20 text-center">
			<h1 className="text-2xl font-semibold mb-4">Une erreur est survenue</h1>
			<p className="text-muted-foreground mb-6">
				Impossible de charger la page d&apos;accueil.
			</p>
			<Button onClick={reset}>Réessayer</Button>
		</div>
	)
}
