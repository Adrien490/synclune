import { LogoAnimated } from "@/shared/components/logo-animated";
import { ResetPasswordForm } from "@/modules/auth/components/reset-password-form";
import { cormorantGaramond } from "@/shared/styles/fonts";
import { cn } from "@/shared/utils/cn";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Réinitialiser le mot de passe | Synclune",
	description: "Créez un nouveau mot de passe pour votre compte Synclune.",
	robots: "noindex, nofollow",
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

export default async function ResetPasswordPage({
	searchParams,
}: ResetPasswordPageProps) {
	const params = await searchParams;
	const token = params.token;
	const error = params.error;

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
							<h1
								className={cn(
									"text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground",
									cormorantGaramond.className
								)}
							>
								Réinitialiser le mot de passe
							</h1>
							<p className="text-muted-foreground">
								Entre ton nouveau mot de passe ci-dessous.
							</p>
						</div>
					</div>

					{/* Formulaire ou message d'erreur */}
					<div className="space-y-6">
						{error === "INVALID_TOKEN" && (
							<div
								role="alert"
								className="rounded-md bg-destructive/15 border border-destructive/30 p-4 flex items-start gap-3"
							>
								<AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
								<div className="space-y-1">
									<p className="text-sm font-medium text-destructive">
										Lien invalide ou expiré
									</p>
									<p className="text-sm text-destructive/90">
										Ce lien de réinitialisation est invalide ou a expiré.
										Fais une nouvelle demande de réinitialisation.
									</p>
								</div>
							</div>
						)}

						{!token && !error && (
							<div
								role="alert"
								className="rounded-md bg-accent/30 border border-accent-foreground/30 p-4 flex items-start gap-3"
							>
								<AlertCircle className="h-5 w-5 text-accent-foreground mt-0.5 shrink-0" />
								<div className="space-y-1">
									<p className="text-sm font-medium text-accent-foreground">
										Token manquant
									</p>
									<p className="text-sm text-accent-foreground/90">
										Le lien de réinitialisation semble incomplet. Utilise
										le lien complet reçu par email.
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
						<div className="text-center pt-4 border-t space-y-2">
							{(error || !token) && (
								<Link
									href="/mot-de-passe-oublie"
									className="inline-block text-sm font-medium underline"
								>
									Demander un nouveau lien
								</Link>
							)}
							<div className="text-sm text-muted-foreground">
								<Link
									href="/connexion"
									className="font-medium underline"
								>
									Retour à la connexion
								</Link>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
