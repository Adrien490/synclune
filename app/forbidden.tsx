import { NotFoundContent } from "@/app/_components/not-found-content";
import { ParticleBackgroundError, RICH_ERROR_SHAPES } from "@/shared/components/animations";
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
		<main className="from-background via-primary/5 to-secondary/10 relative flex min-h-screen items-center justify-center bg-linear-to-br px-4">
			<ParticleBackgroundError count={8} shape={RICH_ERROR_SHAPES} />
			<div className="relative z-10 mx-auto max-w-2xl space-y-8 text-center">
				<NotFoundContent
					emoji={
						<p className="text-muted-foreground/30 mb-4 text-8xl font-bold" aria-hidden="true">
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
							<Button asChild size="lg">
								<Link href={ROUTES.SHOP.HOME}>Retour à l'accueil</Link>
							</Button>
							<Button asChild variant="secondary" size="lg">
								<Link href={ROUTES.AUTH.SIGN_IN}>Changer de compte</Link>
							</Button>
						</div>
					}
				/>
			</div>
		</main>
	);
}
