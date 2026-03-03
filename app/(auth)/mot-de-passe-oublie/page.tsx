import { AuthPageLayout } from "@/modules/auth/components/auth-page-layout";
import { RequestPasswordResetForm } from "@/modules/auth/components/request-password-reset-form";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: "Mot de passe oublié | Synclune",
	description: "Réinitialisez votre mot de passe Synclune en toute sécurité.",
	robots: { index: false, follow: false },
	openGraph: {
		title: "Mot de passe oublié | Synclune",
		description: "Réinitialisez votre mot de passe",
		type: "website",
	},
};

export default function ForgotPasswordPage() {
	return (
		<AuthPageLayout
			backHref="/connexion"
			backLabel="Retour à la connexion"
			title="Mot de passe oublié ?"
			description="Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe."
		>
			<div className="space-y-6">
				<Suspense>
					<RequestPasswordResetForm />
				</Suspense>

				{/* Login link */}
				<div className="border-t pt-4 text-center">
					<div className="text-muted-foreground text-sm">
						Vous vous souvenez de votre mot de passe ?{" "}
						<Link href="/connexion" className="font-medium underline">
							Connectez-vous
						</Link>
					</div>
				</div>
			</div>
		</AuthPageLayout>
	);
}
