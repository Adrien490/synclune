import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { ConfirmationResult } from "@/modules/newsletter/components/confirmation-result";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";

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
				title="Confirmation de votre inscription"
				description="Plus qu'un clic avant de recevoir mes créations"
			/>

			<div className="from-ivory via-rose-50/30 to-gold-50/20 py-12 lg:py-16">
				<div className="container mx-auto px-4 max-w-2xl">
					<div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg space-y-6">
						<Suspense
							fallback={
								<div className="text-center space-y-6">
									<div className="text-6xl">✨</div>
									<h2 className="text-xl sm:text-2xl font-display text-foreground">
										Confirmation en cours...
									</h2>
									<div className="flex justify-center">
										<div className="size-6 rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
									</div>
								</div>
							}
						>
							<ConfirmationResult token={token} />
						</Suspense>

						{/* Privacy reassurance */}
						<div className="bg-primary/5 rounded-lg p-4 text-center mt-8">
							<p className="text-sm text-muted-foreground">
								Vos données sont protégées et ne seront jamais
								partagées
							</p>
						</div>

						{/* Alternative actions */}
						<div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 border-t">
							<Button asChild variant="outline">
								<Link href="/">Retour à l'accueil</Link>
							</Button>
							<Button asChild variant="outline">
								<Link href="/produits">
									Découvrir mes créations
								</Link>
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
