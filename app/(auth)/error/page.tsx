import { AuthPageLayout } from "@/modules/auth/components/auth-page-layout";
import { Button } from "@/shared/components/ui/button";
import { getAuthErrorMessage } from "@/modules/auth/constants/error-messages";
import { AlertCircle } from "lucide-react";
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
		<AuthPageLayout
			backHref="/"
			backLabel="Retour au site"
			title={errorInfo.title}
			description={errorInfo.description}
			icon={
				<div className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-full">
					<AlertCircle className="text-destructive h-8 w-8" aria-hidden="true" />
				</div>
			}
		>
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
		</AuthPageLayout>
	);
}
