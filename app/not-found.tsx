import { Button } from "@/shared/components/ui/button";
import Link from "next/link";

export default function NotFound() {
	return (
		<main className="min-h-screen bg-linear-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center px-4">
			<div className="text-center space-y-8 max-w-2xl mx-auto">
				<div className="space-y-4">
					<h1 className="text-8xl font-bold text-muted-foreground/30 mb-4">
						<span className="sr-only">Page non trouvée - </span>404
					</h1>
					<h2 className="text-3xl md:text-4xl font-display font-semibold text-foreground">
						Oups, cette page n'existe pas !
					</h2>
					<p className="text-lg md:text-xl text-muted-foreground">
						Bon, je suis pas sûre de comment vous êtes arrivés ici, mais cette
						page est introuvable. Par contre, j'ai plein d'autres créations à
						vous montrer qui, elles, existent vraiment !
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

				{/* Éléments décoratifs */}
				<div className="relative" aria-hidden="true">
					<div className="absolute -top-4 -right-4 w-8 h-8 bg-primary/30 rounded-full motion-safe:animate-pulse"></div>
					<div className="absolute -bottom-2 -left-6 w-6 h-6 bg-secondary/40 rounded-full motion-safe:animate-pulse [animation-delay:1s]"></div>
					<div className="absolute top-1/2 -left-4 w-4 h-4 bg-primary/20 rounded-full motion-safe:animate-pulse [animation-delay:2s]"></div>
				</div>
			</div>
		</main>
	);
}
