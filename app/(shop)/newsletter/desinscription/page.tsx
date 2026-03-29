import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { UnsubscribeResult } from "@/modules/newsletter/components/unsubscribe-result";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: "Désinscription newsletter - Synclune",
	description: "Se désinscrire de la newsletter Synclune",
	robots: "noindex, nofollow",
};

interface UnsubscribePageProps {
	searchParams: Promise<{
		token?: string;
	}>;
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
	const params = await searchParams;
	const token = params.token;

	return (
		<div className="min-h-screen">
			<PageHeader
				title="Désinscription de la newsletter"
				description="Désinscription de la newsletter Synclune"
			/>

			<div className="from-ivory to-gold-50/20 via-rose-50/30 py-12 lg:py-16">
				<div className="container mx-auto max-w-2xl px-4">
					<div className="bg-card/80 space-y-6 rounded-2xl p-8 shadow-lg backdrop-blur-sm">
						<Suspense
							fallback={
								<div className="space-y-6 text-center">
									<div className="text-6xl">💔</div>
									<h2 className="font-display text-foreground text-xl sm:text-2xl">
										Désinscription en cours...
									</h2>
									<div className="flex justify-center">
										<div className="border-muted-foreground/20 border-t-muted-foreground size-6 animate-spin rounded-full border-2" />
									</div>
								</div>
							}
						>
							<UnsubscribeResult token={token} />
						</Suspense>

						{/* Privacy reassurance */}
						<div className="bg-primary/5 mt-8 rounded-lg p-4 text-center">
							<p className="text-muted-foreground text-sm">À bientôt peut-être ?</p>
						</div>

						{/* Alternative actions */}
						<div className="flex flex-col justify-center gap-4 border-t pt-6 sm:flex-row">
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
		</div>
	);
}
