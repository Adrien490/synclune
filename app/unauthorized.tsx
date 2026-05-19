import { NotFoundContent } from "@/app/_components/not-found-content";
import { ParticleBackgroundError, RICH_ERROR_SHAPES } from "@/shared/components/animations";
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
		<main className="from-background via-primary/5 to-secondary/10 relative flex min-h-screen items-center justify-center bg-linear-to-br px-4">
			<ParticleBackgroundError count={8} shape={RICH_ERROR_SHAPES} />
			<div className="relative z-10 mx-auto max-w-2xl space-y-8 text-center">
				<NotFoundContent
					emoji={
						<p className="text-muted-foreground/30 mb-4 text-8xl font-bold" aria-hidden="true">
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
							Vous devez être connecté pour accéder à cette page. Connectez-vous ou créez un compte
							pour continuer.
						</p>
					}
					actions={
						<div className="flex flex-col justify-center gap-4 sm:flex-row">
							<Button asChild size="lg">
								<Link href={ROUTES.AUTH.SIGN_IN}>Se connecter</Link>
							</Button>
							<Button asChild variant="secondary" size="lg">
								<Link href={ROUTES.AUTH.SIGN_UP}>Créer un compte</Link>
							</Button>
						</div>
					}
				/>
			</div>
		</main>
	);
}
