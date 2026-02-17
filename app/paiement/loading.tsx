import { PageHeader } from "@/shared/components/page-header";
import {
	Card,
	CardContent,
	CardHeader,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Separator } from "@/shared/components/ui/separator";

/**
 * État de chargement pour la page checkout
 * Reflète la structure réelle : formulaire fluide + récapitulatif Card
 */
export default function CheckoutLoading() {
	return (
		<div className="min-h-screen">
			<PageHeader
				title="Finaliser ma commande"
				description="Vérifiez vos informations et procédez au paiement sécurisé"
			/>

			<section className="bg-background pt-4 pb-12 lg:pt-6 lg:pb-16">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid lg:grid-cols-3 gap-8">
						{/* Formulaire skeleton - 2/3 de la largeur */}
						<div className="lg:col-span-2 space-y-6">
							{/* Email */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-4 w-72" />
							</div>

							{/* Prénom / Nom */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-2">
									<Skeleton className="h-4 w-16" />
									<Skeleton className="h-10 w-full" />
								</div>
								<div className="space-y-2">
									<Skeleton className="h-4 w-12" />
									<Skeleton className="h-10 w-full" />
								</div>
							</div>

							{/* Adresse */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-10 w-full" />
							</div>

							{/* Lien complément d'adresse */}
							<Skeleton className="h-4 w-80" />

							{/* Code postal / Ville */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-2">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-10 w-full" />
								</div>
								<div className="space-y-2">
									<Skeleton className="h-4 w-12" />
									<Skeleton className="h-10 w-full" />
								</div>
							</div>

							{/* Pays */}
							<div className="flex items-center justify-between py-2">
								<Skeleton className="h-4 w-56" />
								<Skeleton className="h-4 w-16" />
							</div>

							{/* Téléphone */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-4 w-96" />
							</div>

							{/* CGV */}
							<div className="flex items-start gap-3">
								<Skeleton className="h-5 w-5 shrink-0 mt-0.5" />
								<div className="space-y-2">
									<Skeleton className="h-4 w-72" />
									<Skeleton className="h-4 w-48" />
								</div>
							</div>

							{/* Bouton paiement */}
							<div className="space-y-3 pt-2">
								<Skeleton className="h-14 w-full" />
								<Skeleton className="h-4 w-40 mx-auto" />
							</div>
						</div>

						{/* Résumé skeleton - 1/3 de la largeur */}
						<div className="lg:col-span-1">
							<Card className="rounded-xl shadow-sm border-2 sticky top-24">
								<CardHeader className="pb-4">
									<Skeleton className="h-6 w-32" />
								</CardHeader>
								<CardContent className="space-y-4 pb-6">
									{/* Liste des articles */}
									<div className="space-y-3">
										{[1, 2].map((i) => (
											<div key={i} className="flex gap-3">
												<Skeleton className="w-16 h-16 shrink-0 rounded-md" />
												<div className="flex-1 space-y-2">
													<Skeleton className="h-4 w-full" />
													<Skeleton className="h-3 w-20" />
													<Skeleton className="h-3 w-12" />
												</div>
												<Skeleton className="h-4 w-16" />
											</div>
										))}
									</div>

									{/* Bouton modifier */}
									<div className="text-center">
										<Skeleton className="h-4 w-32 mx-auto" />
									</div>

									<Separator />

									{/* Sous-total et livraison */}
									<div className="space-y-3">
										<div className="flex justify-between">
											<Skeleton className="h-4 w-32" />
											<Skeleton className="h-5 w-16" />
										</div>
										<div className="flex justify-between">
											<Skeleton className="h-4 w-20" />
											<Skeleton className="h-5 w-14" />
										</div>
									</div>

									<Separator />

									{/* Total */}
									<div className="space-y-2">
										<div className="flex justify-between">
											<Skeleton className="h-7 w-14" />
											<Skeleton className="h-7 w-20" />
										</div>
										<Skeleton className="h-3 w-44 ml-auto" />
									</div>

									{/* Message sécurité */}
									<div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
										<Skeleton className="h-4 w-40 mx-auto" />
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
