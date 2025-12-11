import { Logo } from "@/shared/components/logo";
import { Button } from "@/shared/components/ui/button";
import { ResendVerificationEmailForm } from "@/modules/auth/components/resend-verification-email-form";
import { crimsonPro } from "@/shared/styles/fonts";
import { cn } from "@/shared/utils/cn";
import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Renvoyer l'email de vérification | Synclune",
	description:
		"Renvoyez l'email de vérification pour activer votre compte Synclune.",
	robots: "noindex, nofollow",
	openGraph: {
		title: "Renvoyer l'email de vérification | Synclune",
		description: "Renvoyez l'email de vérification",
		type: "website",
	},
};

export default function ResendVerificationPage() {
	return (
		<div className="relative">
			{/* Lien retour */}
			<div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
				<Link
					href="/connexion"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 group min-h-[44px] min-w-[44px] -ml-2 pl-2"
				>
					<ArrowLeft
						size={16}
						className="transition-transform duration-200 group-hover:-translate-x-1"
						aria-hidden="true"
					/>
					<span className="font-medium">Retour à la connexion</span>
				</Link>
			</div>

			{/* Logo en haut à droite */}
			<div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
				<Logo size={44} priority href="/" />
			</div>

			{/* Contenu principal */}
			<div className="relative z-10 min-h-screen flex justify-center px-4 pt-16 pb-8 sm:pt-20 sm:pb-12">
				<div className="w-full max-w-md space-y-8 my-auto">
					{/* Header */}
					<div className="text-center space-y-7">
						<div className="space-y-3">
							<h1 className={cn("text-3xl font-semibold text-foreground", crimsonPro.className)}>
								Renvoyer l'email de vérification 
							</h1>
							<p className="text-muted-foreground">
								Tu peux rentrer ton email pour recevoir un nouveau lien de
								vérification.
							</p>
						</div>
					</div>

					{/* Formulaire */}
					<div className="space-y-6">
						<div className="rounded-lg border bg-card p-6 shadow-sm">
							<div className="flex items-start gap-3 mb-4">
								<Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
								<div className="space-y-1">
									<p className="text-sm font-medium">Email non reçu ?</p>
									<p className="text-sm text-muted-foreground">
										Vérifie tes spams ou demande un nouveau lien de
										vérification !
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
				</div>
			</div>
		</div>
	);
}
