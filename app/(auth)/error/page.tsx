import { LogoAnimated } from "@/shared/components/logo-animated";
import { Button } from "@/shared/components/ui/button";
import { getAuthErrorMessage } from "@/modules/auth/constants/error-messages";
import { cormorantGaramond } from "@/shared/styles/fonts";
import { cn } from "@/shared/utils/cn";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Erreur d'authentification",
	description: "Une erreur est survenue lors de l'authentification",
	robots: { index: false, follow: false },
};

interface ErrorPageProps {
	searchParams: Promise<{ error?: string }>;
}

export default async function ErrorPage({ searchParams }: ErrorPageProps) {
	const params = await searchParams;
	const errorInfo = getAuthErrorMessage(params.error);

	return (
		<div className="relative">
			{/* Lien retour */}
			<div className="absolute top-4 left-4 z-20 sm:top-6 sm:left-6">
				<Link
					href="/"
					className="text-muted-foreground hover:text-foreground group -ml-2 inline-flex min-h-11 min-w-11 items-center gap-2 pl-2 text-sm transition-colors duration-200"
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
			<div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
				<LogoAnimated size={44} preload href="/" />
			</div>

			{/* Contenu principal */}
			<div className="relative z-10 flex min-h-screen justify-center px-4 pt-16 pb-8 sm:pt-20 sm:pb-12">
				<div className="my-auto w-full max-w-md space-y-8">
					{/* Header avec icône d'erreur */}
					<div className="space-y-7 text-center" role="alert">
						<div className="flex justify-center">
							<div className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-full">
								<AlertCircle className="text-destructive h-8 w-8" aria-hidden="true" />
							</div>
						</div>
						<div className="space-y-3">
							<h1
								className={cn(
									"text-foreground text-2xl font-semibold sm:text-3xl lg:text-4xl",
									cormorantGaramond.className,
								)}
							>
								{errorInfo.title}
							</h1>
							<p className="text-muted-foreground text-base">{errorInfo.description}</p>
						</div>
					</div>

					{/* Actions */}
					<div className="space-y-4 pt-4">
						<Button asChild size="lg" className="w-full">
							<Link href="/connexion">Retour à la connexion</Link>
						</Button>
						<Button asChild variant="outline" size="lg" className="w-full">
							<Link href="/inscription">Créer un compte</Link>
						</Button>
						<div className="pt-2 text-center">
							<Link
								href="/"
								className="text-muted-foreground hover:text-foreground text-sm transition-colors"
							>
								Ou revenir à l'accueil
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
