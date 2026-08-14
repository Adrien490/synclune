import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LoginForm } from "@/modules/admin-auth/components/login-form";
import { hasValidAdminSession } from "@/modules/admin-auth/lib/admin-session";
import { ROUTES } from "@/shared/constants/urls";

export const metadata: Metadata = {
	title: "Connexion | Synclune",
	description: "Accès à l'administration Synclune.",
	robots: { index: false, follow: false },
};

/**
 * Connexion — **réservée à l'administration** (un seul mot de passe,
 * `ADMIN_PASSWORD` en env — décision D3 de docs/MIGRATION-PROMPTS.md).
 *
 * Cette route vit HORS du groupe `(protected)` : c'est la seule page sous
 * `/admin` sans `assertAdminPage()` (exemption assumée dans
 * `admin-page-auth-guard.regression.test.ts`) — une garde d'auth sur la page
 * de connexion serait un verrou sur la porte d'entrée.
 *
 * La page reste hors des liens de navigation de la vitrine — elle n'est
 * joignable que par URL directe ou par la redirection du proxy sur `/admin`.
 */
export default async function AdminLoginPage({
	searchParams,
}: {
	searchParams: Promise<{ callbackURL?: string }>;
}) {
	// Déjà connectée → directement au dashboard (parité avec l'ancien proxy).
	if (await hasValidAdminSession()) {
		redirect(ROUTES.ADMIN.ROOT);
	}

	const { callbackURL } = await searchParams;

	return (
		<main className="bg-background flex min-h-dvh items-center justify-center px-4 py-12">
			<div className="w-full max-w-sm space-y-8">
				<div className="space-y-2 text-center">
					<h1 className="font-display text-3xl font-normal tracking-tight">Connexion</h1>
					<p className="text-muted-foreground text-sm">Accès réservé à l&apos;administration.</p>
				</div>
				<LoginForm callbackURL={callbackURL} />
			</div>
		</main>
	);
}
