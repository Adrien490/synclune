import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import Link from "next/link";
import { UnsubscribeForm } from "@/modules/newsletter/components/unsubscribe-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Désinscription newsletter - Synclune",
	description: "Se désinscrire de la newsletter Synclune",
	robots: "noindex, nofollow",
};

interface UnsubscribePageProps {
	searchParams: Promise<{
		token?: string;
		email?: string;
	}>;
}

export default async function UnsubscribePage({
	searchParams,
}: UnsubscribePageProps) {
	const params = await searchParams;
	const token = params.token;
	const emailParam = params.email;

	return (
		<div className="min-h-screen">
			<PageHeader
				title="Désinscription de la newsletter"
				description="Nous sommes désolés de vous voir partir"
			/>

			<div className="from-ivory via-rose-50/30 to-gold-50/20 py-12 lg:py-16">
				<div className="container mx-auto px-4 max-w-2xl">
					<div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg space-y-6">
						{/* Message empathique */}
						<div className="text-center space-y-4">
							<div className="text-6xl">💔</div>
							<h2 className="text-2xl font-serif text-foreground">
								Vous allez nous manquer...
							</h2>
							<p className="text-muted-foreground">
								Mais on comprend ! La porte reste toujours ouverte si vous
								changez d'avis.
							</p>
						</div>

						{/* Formulaire de désinscription */}
						<UnsubscribeForm defaultToken={token} defaultEmail={emailParam} />

						{/* Réassurance */}
						<div className="bg-primary/5 rounded-lg p-4 text-center mt-8">
							<p className="text-sm text-muted-foreground">
								À bientôt peut-être ? 🌸
							</p>
						</div>

						{/* Actions alternatives */}
						<div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 border-t">
							<Button asChild variant="outline">
								<Link href="/">Retour à l'accueil</Link>
							</Button>
							<Button asChild variant="outline">
								<Link href="/products">Découvrir nos créations</Link>
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
