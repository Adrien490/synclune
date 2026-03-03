import { AuthPageLayout } from "@/modules/auth/components/auth-page-layout";
import { ResendVerificationEmailForm } from "@/modules/auth/components/resend-verification-email-form";
import { Button } from "@/shared/components/ui/button";
import { Mail } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Renvoyer l'email de vérification | Synclune",
	description: "Renvoyez l'email de vérification pour activer votre compte Synclune.",
	robots: { index: false, follow: false },
	openGraph: {
		title: "Renvoyer l'email de vérification | Synclune",
		description: "Renvoyez l'email de vérification",
		type: "website",
	},
};

export default function ResendVerificationPage() {
	return (
		<AuthPageLayout
			backHref="/connexion"
			backLabel="Retour à la connexion"
			title="Renvoyer l'email de vérification"
			description="Vous pouvez entrer votre email pour recevoir un nouveau lien de vérification."
		>
			<div className="space-y-6">
				<div className="bg-card rounded-lg border p-6 shadow-sm">
					<div className="mb-4 flex items-start gap-3">
						<Mail className="text-primary mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
						<div className="space-y-1">
							<p className="text-sm font-medium">Email non reçu ?</p>
							<p className="text-muted-foreground text-sm">
								Vérifiez vos spams ou demandez un nouveau lien de vérification !
							</p>
						</div>
					</div>

					<ResendVerificationEmailForm />
				</div>

				<div className="text-center">
					<Button asChild variant="ghost" size="sm">
						<Link href="/inscription">Créer un nouveau compte</Link>
					</Button>
				</div>
			</div>
		</AuthPageLayout>
	);
}
