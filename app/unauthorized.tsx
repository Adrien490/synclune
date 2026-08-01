import { NotFoundContent } from "@/app/_components/not-found-content";
import { NotFoundShell } from "@/app/_components/not-found-shell";
import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/urls";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Connexion requise",
	description:
		"Cette page nécessite une authentification. Connectez-vous pour accéder à votre espace personnel.",
	robots: { index: false, follow: false },
};

export default function Unauthorized() {
	return (
		<NotFoundShell errorCode="401">
			<NotFoundContent
				emoji={
					<p className="text-muted-foreground/30 text-8xl font-bold" aria-hidden="true">
						🔑
					</p>
				}
				title={
					<h1 className="font-display text-foreground text-3xl font-normal md:text-4xl">
						<span className="sr-only">Erreur 401 : </span>Connexion requise
					</h1>
				}
				description={
					<p className="text-muted-foreground text-lg md:text-xl">
						Cette page est réservée à l&apos;administration de la boutique.
					</p>
				}
				actions={
					<div className="flex flex-col justify-center gap-4 sm:flex-row">
						<Button asChild size="lg">
							<Link href={ROUTES.SHOP.HOME}>Retour à la boutique</Link>
						</Button>
						<Button asChild variant="secondary" size="lg">
							<Link href={ROUTES.AUTH.SIGN_IN}>Se connecter</Link>
						</Button>
					</div>
				}
			/>
		</NotFoundShell>
	);
}
