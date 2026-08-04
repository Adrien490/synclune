import { NotFoundContent } from "@/app/_components/not-found-content";
import { NotFoundShell } from "@/app/_components/not-found-shell";
import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/urls";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Accès refusé",
	description:
		"Vous n'avez pas les droits nécessaires pour accéder à cette page. Connectez-vous avec un autre compte ou revenez à l'accueil.",
	robots: { index: false, follow: false },
};

export default function Forbidden() {
	return (
		<NotFoundShell errorCode="403">
			<NotFoundContent
				emoji={
					<p className="text-muted-foreground/30 text-8xl font-bold" aria-hidden="true">
						🔒
					</p>
				}
				title={
					<h1 className="font-display text-foreground text-3xl font-normal md:text-4xl">
						<span className="sr-only">Erreur 403 : </span>Accès refusé
					</h1>
				}
				description={
					<p className="text-muted-foreground text-lg md:text-xl">
						Vous n'avez pas les droits nécessaires pour consulter cette page. Si vous pensez qu'il
						s'agit d'une erreur, connectez-vous avec un autre compte.
					</p>
				}
				actions={
					<div className="flex flex-col justify-center gap-4 sm:flex-row">
						<Button render={<Link href={ROUTES.SHOP.HOME} />} size="lg">
							Retour à l'accueil
						</Button>
						<Button render={<Link href={ROUTES.AUTH.SIGN_IN} />} variant="secondary" size="lg">
							Changer de compte
						</Button>
					</div>
				}
			/>
		</NotFoundShell>
	);
}
