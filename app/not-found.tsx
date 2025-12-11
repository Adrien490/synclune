import { ParticleSystem } from "@/shared/components/animations/particle-system";
import { Button } from "@/shared/components/ui/button";
import Link from "next/link";

export default function NotFound() {
	return (
		<main className="relative min-h-screen bg-linear-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center px-4">
			<ParticleSystem
				count={8}
				shape={["heart", "diamond", "circle"]}
				animationStyle="drift"
				opacity={[0.15, 0.35]}
				blur={[8, 24]}
			/>
			<div className="relative z-10 text-center space-y-8 max-w-2xl mx-auto">
				<div className="space-y-4">
					<h1 className="text-8xl font-bold text-muted-foreground/30 mb-4">
						<span className="sr-only">404</span>{" "}😥
					</h1>
					<h2 className="text-3xl md:text-4xl font-display font-semibold text-foreground">
						Oups, vous vous êtes surement perdu 💔
					</h2>
					<p className="text-lg md:text-xl text-muted-foreground">
						J'ai plein d'autres créations à vous montrer qui, elles, existent vraiment (à l'instar de cette page)
					</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-4 justify-center">
					<Button asChild size="lg">
						<Link href="/">
							Retour à l'accueil
						</Link>
					</Button>
					<Button asChild variant="outline" size="lg">
						<Link href="/produits">
							Découvrir mes créations
						</Link>
					</Button>
				</div>
			</div>
		</main>
	);
}
