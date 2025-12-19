import { PageHeader } from "@/shared/components/page-header";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * État de chargement pour la page checkout
 */
export default function CheckoutLoading() {
	return (
		<div className="min-h-screen">
			<PageHeader
				title="Finaliser ma commande"
				description="Vérifie tes informations et procède au paiement sécurisé"
				breadcrumbs={[
					{ label: "Panier", href: "/panier" },
					{ label: "Paiement", href: "/paiement" },
				]}
			/>

			<section className="bg-background pt-4 pb-12 lg:pt-6 lg:pb-16">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid lg:grid-cols-3 gap-8">
						{/* Formulaire skeleton - 2/3 de la largeur */}
						<div className="lg:col-span-2 space-y-8">
							{/* Section 1 */}
							<Card>
								<CardHeader>
									<Skeleton className="h-6 w-48" />
									<Skeleton className="h-4 w-64 mt-2" />
								</CardHeader>
								<CardContent className="space-y-4">
									<Skeleton className="h-10 w-full" />
									<div className="grid grid-cols-2 gap-4">
										<Skeleton className="h-10 w-full" />
										<Skeleton className="h-10 w-full" />
									</div>
								</CardContent>
							</Card>

							{/* Section 2 */}
							<Card>
								<CardHeader>
									<Skeleton className="h-6 w-56" />
									<Skeleton className="h-4 w-72 mt-2" />
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="grid grid-cols-2 gap-4">
										<Skeleton className="h-10 w-full" />
										<Skeleton className="h-10 w-full" />
									</div>
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-10 w-full" />
									<div className="grid grid-cols-2 gap-4">
										<Skeleton className="h-10 w-full" />
										<Skeleton className="h-10 w-full" />
									</div>
									<Skeleton className="h-10 w-full" />
								</CardContent>
							</Card>

							{/* Section 3 */}
							<Card>
								<CardHeader>
									<Skeleton className="h-6 w-40" />
								</CardHeader>
								<CardContent className="space-y-4">
									<Skeleton className="h-6 w-full" />
									<Skeleton className="h-6 w-full" />
								</CardContent>
							</Card>
						</div>

						{/* Résumé skeleton - 1/3 de la largeur */}
						<div className="lg:col-span-1">
							<Card className="sticky top-24">
								<CardHeader>
									<Skeleton className="h-6 w-32" />
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-3">
										{[1, 2, 3].map((i) => (
											<div key={i} className="flex gap-3">
												<Skeleton className="w-16 h-16 shrink-0" />
												<div className="flex-1 space-y-2">
													<Skeleton className="h-4 w-full" />
													<Skeleton className="h-3 w-20" />
												</div>
												<Skeleton className="h-4 w-16" />
											</div>
										))}
									</div>
									<Skeleton className="h-px w-full" />
									<div className="space-y-3">
										<div className="flex justify-between">
											<Skeleton className="h-4 w-24" />
											<Skeleton className="h-4 w-20" />
										</div>
										<div className="flex justify-between">
											<Skeleton className="h-4 w-24" />
											<Skeleton className="h-4 w-20" />
										</div>
									</div>
									<Skeleton className="h-px w-full" />
									<div className="space-y-2">
										<div className="flex justify-between">
											<Skeleton className="h-6 w-24" />
											<Skeleton className="h-6 w-24" />
										</div>
										<Skeleton className="h-3 w-32 ml-auto" />
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
