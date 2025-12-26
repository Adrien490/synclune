"use client"

import { useEffect } from "react"
import { ParticleSystem } from "@/shared/components/animations/particle-system"
import { Button } from "@/shared/components/ui/button"
import Link from "next/link"

export default function ProductError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		console.error("Erreur page produit:", error)
	}, [error])

	return (
		<main
			className="relative min-h-screen bg-linear-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center px-4"
			role="alert"
			aria-live="assertive"
		>
			<ParticleSystem
				count={6}
				shape={["diamond", "circle"]}
				animationStyle="drift"
				opacity={[0.15, 0.35]}
				blur={[8, 24]}
			/>
			<div className="relative z-10 text-center space-y-8 max-w-2xl mx-auto">
				<div className="space-y-4">
					<p className="text-8xl mb-4" aria-hidden="true">
						💎
					</p>
					<h1 className="text-3xl md:text-4xl font-display font-semibold text-foreground">
						Impossible de charger ce produit
					</h1>
					<p className="text-lg md:text-xl text-muted-foreground">
						Ce bijou joue les timides ! Reessayez dans quelques instants ou
						decouvrez nos autres creations.
					</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-4 justify-center">
					<Button onClick={reset} size="lg">
						Reessayer
					</Button>
					<Button asChild variant="secondary" size="lg">
						<Link href="/creations">Voir toutes les creations</Link>
					</Button>
				</div>

				{error.digest && (
					<p className="text-xs text-muted-foreground/60">
						Code : {error.digest}
					</p>
				)}
			</div>
		</main>
	)
}
