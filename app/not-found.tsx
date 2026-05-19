import { NotFoundContent } from "@/app/_components/not-found-content";
import { NotFoundShell } from "@/app/_components/not-found-shell";
import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/urls";
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
		<NotFoundShell errorCode="404">
			<NotFoundContent
				emoji={
					<p className="text-muted-foreground/30 text-8xl font-bold" aria-hidden="true">
						😥
					</p>
				}
				title={
					<h1 className="font-display text-foreground text-3xl font-normal md:text-4xl">
						<span className="sr-only">Erreur 404 : </span>Oups, vous vous êtes surement perdu 💔
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
							<Link href={ROUTES.SHOP.HOME}>Retour à l'accueil</Link>
						</Button>
						<Button asChild variant="secondary" size="lg">
							<Link href={ROUTES.SHOP.PRODUCTS}>Découvrir mes créations</Link>
						</Button>
					</div>
				}
			/>
		</NotFoundShell>
	);
}
