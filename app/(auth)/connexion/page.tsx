import { AuthPageLayout } from "@/modules/auth/components/auth-page-layout";
import { SignInEmailForm } from "@/modules/auth/components/sign-in-email-form";
import { ROUTES } from "@/shared/constants/urls";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Connexion | Synclune",
	description: "Accès à l'administration Synclune.",
	robots: { index: false, follow: false },
	openGraph: {
		title: "Connexion | Synclune",
		description: "Accès à l'administration Synclune",
		type: "website",
	},
};

/**
 * Connexion — **réservée à l'administration** (retrait de l'espace client
 * 2026-07-31).
 *
 * Il n'y a plus de compte client : plus de bouton Google (c'était un chemin
 * d'inscription, un compte étant créé au premier login OAuth), plus de lien
 * « créer un compte », et la destination par défaut est `/admin` et non `/`.
 *
 * La page reste hors des liens de navigation de la vitrine — elle n'est joignable
 * que par URL directe ou par la redirection du proxy sur `/admin`.
 */
export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ callbackURL?: string }>;
}) {
	const { callbackURL } = await searchParams;
	const resolvedCallbackURL = callbackURL ?? ROUTES.ADMIN.ROOT;

	return (
		<AuthPageLayout
			backHref="/"
			backLabel="Retour au site"
			title="Connexion"
			description="Pour accéder à l'administration de la boutique"
		>
			<SignInEmailForm callbackURL={resolvedCallbackURL} />
		</AuthPageLayout>
	);
}
