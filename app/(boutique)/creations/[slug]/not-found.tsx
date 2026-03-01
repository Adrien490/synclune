import { ParticleBackground } from "@/shared/components/animations";
import { Button } from "@/shared/components/ui/button";
import Link from "next/link";

export default function ProductNotFound() {
	return (
		<main className="from-background via-primary/5 to-secondary/10 relative flex min-h-screen items-center justify-center bg-linear-to-br px-4">
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
						Ce bijou n'existe plus
					</h1>
					<p className="text-muted-foreground text-lg md:text-xl">
						Cette création a peut-être été retirée ou n'est plus disponible. Découvrez nos autres
						bijoux artisanaux faits main !
					</p>
				</div>

				<div className="flex flex-col justify-center gap-4 sm:flex-row">
					<Button asChild size="lg">
						<Link href="/produits">Découvrir nos créations</Link>
					</Button>
					<Button asChild variant="secondary" size="lg">
						<Link href="/">Retour à l'accueil</Link>
					</Button>
				</div>
			</div>
		</main>
	);
}
