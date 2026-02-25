import { SignInEmailForm } from "@/modules/auth/components/sign-in-email-form";
import { SignInSocialForm } from "@/modules/auth/components/sign-in-social-form";
import { SignUpLink } from "@/modules/auth/components/sign-up-link";
import { LogoAnimated } from "@/shared/components/logo-animated";
import { cormorantGaramond } from "@/shared/styles/fonts";
import { cn } from "@/shared/utils/cn";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: "Connexion | Synclune",
	description:
		"Connectez-vous à votre espace personnel Synclune pour accéder à vos commandes, favoris et informations.",
	robots: "noindex, nofollow",
	openGraph: {
		title: "Connexion | Synclune",
		description: "Accédez à votre espace personnel",
		type: "website",
	},
};

export default function LoginPage() {
	return (
		<div className="relative">
			{/* Lien retour */}
			<div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
				<Link
					href="/"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 group min-h-11 min-w-11 -ml-2 pl-2"
				>
					<ArrowLeft
						size={16}
						className="transition-transform duration-200 group-hover:-translate-x-1"
						aria-hidden="true"
					/>
					<span className="font-medium">Retour au site</span>
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
								Connexion
							</h1>
							<p className="text-muted-foreground">
								Pour accéder à votre espace personnel
							</p>
						</div>
					</div>

					{/* Formulaires */}
					<div className="space-y-6">
						{/* Connexion sociale */}
						<Suspense>
							<SignInSocialForm />
						</Suspense>

						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<span className="w-full border-t" />
							</div>
							<div className="relative flex justify-center text-xs uppercase">
								<span className="bg-background px-2 text-muted-foreground">
									Ou avec votre email
								</span>
							</div>
						</div>

						{/* Connexion par email */}
						<Suspense>
							<SignInEmailForm />
						</Suspense>

						{/* Lien vers l'inscription */}
						<div className="text-center pt-4 border-t">
							<Suspense>
								<SignUpLink />
							</Suspense>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
