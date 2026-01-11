import { Logo } from "@/shared/components/logo";
import { Button } from "@/shared/components/ui/button";
import { getAuthErrorMessage } from "@/modules/auth/constants/error-messages";
import { josefinSans } from "@/shared/styles/fonts";
import { cn } from "@/shared/utils/cn";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Erreur d'authentification",
	description: "Une erreur est survenue lors de l'authentification",
	robots: "noindex, nofollow",
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
				<Logo size={44} priority href="/" />
			</div>

			{/* Contenu principal */}
			<div className="relative z-10 min-h-screen flex justify-center px-4 pt-16 pb-8 sm:pt-20 sm:pb-12">
				<div className="w-full max-w-md space-y-8 my-auto">
					{/* Header avec icône d'erreur */}
					<div className="text-center space-y-7" role="alert">
						<div className="flex justify-center">
							<div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
								<AlertCircle
									className="w-8 h-8 text-destructive"
									aria-hidden="true"
								/>
							</div>
						</div>
						<div className="space-y-3">
							<h1
								className={cn(
									"text-3xl font-semibold text-foreground",
									josefinSans.className
								)}
							>
								{errorInfo.title}
							</h1>
							<p className="text-muted-foreground text-base">
								{errorInfo.description}
							</p>
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
						<div className="text-center pt-2">
							<Link
								href="/"
								className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
