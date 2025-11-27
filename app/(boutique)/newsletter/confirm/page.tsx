import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { NewsletterSuccessDialog } from "@/modules/newsletter/components/newsletter-success-dialog";
import Link from "next/link";
import { ConfirmSubscriptionForm } from "@/modules/newsletter/components/confirm-subscription-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Confirmation newsletter - Synclune",
	description: "Confirmez votre inscription à la newsletter Synclune",
	robots: "noindex, nofollow",
};

interface ConfirmPageProps {
	searchParams: Promise<{
		token?: string;
	}>;
}

export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
	const params = await searchParams;
	const token = params.token;

	return (
		<div className="min-h-screen">
			<PageHeader
				title="Confirmation de ton inscription"
				description="Plus qu'un clic avant de recevoir mes créations ✨"
			/>

			<div className="from-ivory via-rose-50/30 to-gold-50/20 py-12 lg:py-16">
				<div className="container mx-auto px-4 max-w-2xl">
					<div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg space-y-6">
						{/* Message d'accueil */}
						<div className="text-center space-y-4">
							<div className="text-6xl">✨</div>
							<h2 className="text-2xl font-serif text-foreground">
								Plus qu'un clic pour me rejoindre !
							</h2>
							<p className="text-muted-foreground">
								Confirme ton adresse email pour t'inscrire à la newsletter
							</p>
						</div>

						{/* Formulaire de confirmation */}
						<ConfirmSubscriptionForm defaultToken={token} />

						{/* Réassurance */}
						<div className="bg-primary/5 rounded-lg p-4 text-center mt-8">
							<p className="text-sm text-muted-foreground">
								🔒 Tes données sont protégées et ne seront jamais partagées
							</p>
						</div>

						{/* Actions alternatives */}
						<div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 border-t">
							<Button asChild variant="outline">
								<Link href="/">Retour à l'accueil</Link>
							</Button>
							<Button asChild variant="outline">
								<Link href="/produits">Découvrir mes créations</Link>
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Dialog de bienvenue après confirmation */}
			<NewsletterSuccessDialog />
		</div>
	);
}
