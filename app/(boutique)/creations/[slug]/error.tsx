"use client";

import { ParticleBackground } from "@/shared/components/animations";
import { Button } from "@/shared/components/ui/button";
import type { ErrorPageProps } from "@/shared/types/error.types";
import Link from "next/link";

export default function ProductError({ error, reset }: ErrorPageProps) {
	return (
		<main
			className="from-background via-primary/5 to-secondary/10 relative flex min-h-screen items-center justify-center bg-linear-to-br px-4"
			role="alert"
			aria-live="assertive"
		>
			<ParticleBackground
				count={6}
				shape={["diamond", "circle"]}
				animationStyle="drift"
				opacity={[0.15, 0.35]}
				blur={[8, 24]}
			/>
			<div className="relative z-10 mx-auto max-w-2xl space-y-8 text-center">
				<div className="space-y-4">
					<p className="mb-4 text-8xl" aria-hidden="true">
						💎
					</p>
					<h1 className="font-display text-foreground text-3xl font-semibold md:text-4xl">
						Impossible de charger ce produit
					</h1>
					<p className="text-muted-foreground text-lg md:text-xl">
						Ce bijou joue les timides ! Réessayez dans quelques instants ou découvrez nos autres
						créations.
					</p>
				</div>

				<div className="flex flex-col justify-center gap-4 sm:flex-row">
					<Button onClick={reset} size="lg">
						Réessayer
					</Button>
					<Button asChild variant="secondary" size="lg">
						<Link href="/creations">Voir toutes les créations</Link>
					</Button>
				</div>

				{error.digest && <p className="text-muted-foreground/60 text-xs">Code : {error.digest}</p>}
			</div>
		</main>
	);
}
