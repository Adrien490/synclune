import { LogoAnimated } from "@/shared/components/logo-animated";
import { RequestPasswordResetForm } from "@/modules/auth/components/request-password-reset-form";
import { cormorantGaramond } from "@/shared/styles/fonts";
import { cn } from "@/shared/utils/cn";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Mot de passe oublié | Synclune",
	description: "Réinitialisez votre mot de passe Synclune en toute sécurité.",
	robots: "noindex, nofollow",
	openGraph: {
		title: "Mot de passe oublié | Synclune",
		description: "Réinitialisez votre mot de passe",
		type: "website",
	},
};

export default function ForgotPasswordPage() {
	return (
		<div className="relative">
			{/* Lien retour */}
			<div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
				<Link
					href="/connexion"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 group min-h-11 min-w-11 -ml-2 pl-2"
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
				<LogoAnimated size={44} preload href="/" />
			</div>

			{/* Contenu principal */}
			<div className="relative z-10 min-h-screen flex justify-center px-4 pt-16 pb-8 sm:pt-20 sm:pb-12">
				<div className="w-full max-w-md space-y-8 my-auto">
					{/* Header */}
					<div className="text-center space-y-7">
						<div className="space-y-3">
							<h1 className={cn("text-2xl sm:text-3xl font-semibold text-foreground", cormorantGaramond.className)}>
								Mot de passe oublié ?
							</h1>
							<p className="text-muted-foreground">
								Entre ton adresse email et nous t'enverrons un lien pour réinitialiser ton mot de passe.
							</p>
						</div>
					</div>

					{/* Formulaire */}
					<div className="space-y-6">
						<Suspense>
							<RequestPasswordResetForm />
						</Suspense>

						{/* Lien vers la connexion */}
						<div className="text-center pt-4 border-t">
							<div className="text-sm text-muted-foreground">
								Tu te souviens de ton mot de passe ?{" "}
								<Link
									href="/connexion"
									className="font-medium underline"
								>
									Connecte-toi
								</Link>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
