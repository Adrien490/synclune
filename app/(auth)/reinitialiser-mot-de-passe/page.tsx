import { AuthPageLayout } from "@/modules/auth/components/auth-page-layout";
import { ResetPasswordForm } from "@/modules/auth/components/reset-password-form";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Réinitialiser le mot de passe | Synclune",
	description: "Créez un nouveau mot de passe pour votre compte Synclune.",
	robots: { index: false, follow: false },
	openGraph: {
		title: "Réinitialiser le mot de passe | Synclune",
		description: "Créez un nouveau mot de passe",
		type: "website",
	},
};

interface ResetPasswordPageProps {
	searchParams: Promise<{
		token?: string;
		error?: string;
	}>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
	const params = await searchParams;
	const token = params.token;
	const error = params.error;

	return (
		<AuthPageLayout
			backHref="/connexion"
			backLabel="Retour à la connexion"
			title="Réinitialiser le mot de passe"
			description="Entrez votre nouveau mot de passe ci-dessous."
		>
			<div className="space-y-6">
				{error === "INVALID_TOKEN" && (
					<div
						role="alert"
						className="bg-destructive/15 border-destructive/30 flex items-start gap-3 rounded-md border p-4"
					>
						<AlertCircle className="text-destructive mt-0.5 h-5 w-5 shrink-0" />
						<div className="space-y-1">
							<p className="text-destructive text-sm font-medium">Lien invalide ou expiré</p>
							<p className="text-destructive/90 text-sm">
								Ce lien de réinitialisation est invalide ou a expiré. Faites une nouvelle demande de
								réinitialisation.
							</p>
						</div>
					</div>
				)}

				{!token && !error && (
					<div
						role="alert"
						className="bg-accent/30 border-accent-foreground/30 flex items-start gap-3 rounded-md border p-4"
					>
						<AlertCircle className="text-accent-foreground mt-0.5 h-5 w-5 shrink-0" />
						<div className="space-y-1">
							<p className="text-accent-foreground text-sm font-medium">Token manquant</p>
							<p className="text-accent-foreground/90 text-sm">
								Le lien de réinitialisation semble incomplet. Utilisez le lien complet reçu par
								email.
							</p>
						</div>
					</div>
				)}

				{token && !error && (
					<Suspense>
						<ResetPasswordForm token={token} />
					</Suspense>
				)}

				{/* Actions */}
				<div className="space-y-2 border-t pt-4 text-center">
					{(error ?? !token) && (
						<Link
							href="/mot-de-passe-oublie"
							className="inline-block text-sm font-medium underline"
						>
							Demander un nouveau lien
						</Link>
					)}
					<div className="text-muted-foreground text-sm">
						<Link href="/connexion" className="font-medium underline">
							Retour à la connexion
						</Link>
					</div>
				</div>
			</div>
		</AuthPageLayout>
	);
}
