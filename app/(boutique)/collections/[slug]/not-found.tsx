import { NotFoundContent } from "@/app/_components/not-found-content";
import { ParticleBackground } from "@/shared/components/animations";
import { Button } from "@/shared/components/ui/button";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Collection introuvable - Synclune",
	robots: { index: false },
};

export default function CollectionNotFound() {
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
				<NotFoundContent
					emoji={
						<p className="mb-4 text-8xl" aria-hidden="true">
							💫
						</p>
					}
					title={
						<h1 className="font-display text-foreground text-3xl font-medium md:text-4xl">
							Cette collection n'existe pas
						</h1>
					}
					description={
						<p className="text-muted-foreground text-lg md:text-xl">
							Cette collection a peut-être été retirée ou n'est plus disponible. Découvrez toutes
							nos collections !
						</p>
					}
					actions={
						<div className="flex flex-col justify-center gap-4 sm:flex-row">
							<Button asChild size="lg">
								<Link href="/collections">Voir toutes les collections</Link>
							</Button>
							<Button asChild variant="secondary" size="lg">
								<Link href="/">Retour à l'accueil</Link>
							</Button>
						</div>
					}
				/>
			</div>
		</main>
	);
}
