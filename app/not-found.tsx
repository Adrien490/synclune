import { NotFoundContent } from "@/app/_components/not-found-content";
import { ParticleBackground } from "@/shared/components/animations";
import { Button } from "@/shared/components/ui/button";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Page introuvable",
	description:
		"La page que vous recherchez n'existe pas ou a été déplacée. Découvrez nos bijoux artisanaux faits main.",
	robots: { index: false },
};

export default function NotFound() {
	return (
		<main className="from-background via-primary/5 to-secondary/10 relative flex min-h-screen items-center justify-center bg-linear-to-br px-4">
			<ParticleBackground
				count={8}
				shape={["heart", "diamond", "circle"]}
				animationStyle="drift"
				opacity={[0.15, 0.35]}
				blur={[8, 24]}
			/>
			<div className="relative z-10 mx-auto max-w-2xl space-y-8 text-center">
				<NotFoundContent
					emoji={
						<p className="text-muted-foreground/30 mb-4 text-8xl font-bold" aria-hidden="true">
							😥
						</p>
					}
					title={
						<h1 className="font-display text-foreground text-3xl font-semibold md:text-4xl">
							<span className="sr-only">Erreur 404 — </span>Oups, vous vous êtes surement perdu 💔
						</h1>
					}
					description={
						<p className="text-muted-foreground text-lg md:text-xl">
							J'ai plein d'autres créations à vous montrer qui, elles, existent vraiment (à l'instar
							de cette page)
						</p>
					}
					actions={
						<div className="flex flex-col justify-center gap-4 sm:flex-row">
							<Button asChild size="lg">
								<Link href="/">Retour à l'accueil</Link>
							</Button>
							<Button asChild variant="secondary" size="lg">
								<Link href="/produits">Découvrir mes créations</Link>
							</Button>
						</div>
					}
				/>
			</div>
		</main>
	);
}
