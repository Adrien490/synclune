import { LogoAnimated } from "@/shared/components/logo-animated";
import { Button } from "@/shared/components/ui/button";
import { ResendVerificationEmailForm } from "@/modules/auth/components/resend-verification-email-form";
import { cormorantGaramond } from "@/shared/styles/fonts";
import { cn } from "@/shared/utils/cn";
import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Renvoyer l'email de vérification | Synclune",
	description: "Renvoyez l'email de vérification pour activer votre compte Synclune.",
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
			<div className="absolute top-4 left-4 z-20 sm:top-6 sm:left-6">
				<Link
					href="/connexion"
					className="text-muted-foreground hover:text-foreground group -ml-2 inline-flex min-h-11 min-w-11 items-center gap-2 pl-2 text-sm transition-colors duration-200"
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
			<div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
				<LogoAnimated size={44} preload href="/" />
			</div>

			{/* Contenu principal */}
			<div className="relative z-10 flex min-h-screen justify-center px-4 pt-16 pb-8 sm:pt-20 sm:pb-12">
				<div className="my-auto w-full max-w-md space-y-8">
					{/* Header */}
					<div className="space-y-7 text-center">
						<div className="space-y-3">
							<h1
								className={cn(
									"text-foreground text-2xl font-semibold sm:text-3xl lg:text-4xl",
									cormorantGaramond.className,
								)}
							>
								Renvoyer l'email de vérification
							</h1>
							<p className="text-muted-foreground">
								Vous pouvez entrer votre email pour recevoir un nouveau lien de vérification.
							</p>
						</div>
					</div>

					{/* Formulaire */}
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
				</div>
			</div>
		</div>
	);
}
