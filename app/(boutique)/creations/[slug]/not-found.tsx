import { ParticleBackground } from "@/shared/components/animations";
import { Button } from "@/shared/components/ui/button";
import Link from "next/link";

export default function ProductNotFound() {
	return (
		<main
			className="relative min-h-screen bg-linear-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center px-4"
		>
			<ParticleBackground
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
						Ce bijou n'existe plus
					</h1>
					<p className="text-lg md:text-xl text-muted-foreground">
						Cette création a peut-être été retirée ou n'est plus disponible.
						Découvrez nos autres bijoux artisanaux faits main !
					</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-4 justify-center">
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
