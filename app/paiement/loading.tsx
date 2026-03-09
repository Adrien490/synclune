import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Separator } from "@/shared/components/ui/separator";

/**
 * État de chargement pour la page checkout
 * Reflète la structure réelle de la page :
 * - Heading (h1 + soulignement + description)
 * - Grid [1fr_360px] avec récap en order-first sur mobile
 * - Step indicator + champs de formulaire
 * - Récap collapsible sur mobile, sidebar sticky sur desktop
 */
export default function CheckoutLoading() {
	return (
		<div className="relative min-h-screen">
			<div className="from-primary/2 to-secondary/3 fixed inset-0 -z-10 bg-linear-to-br via-transparent" />
			<section className="py-8 sm:py-10">
				<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
					{/* Heading skeleton */}
					<div className="mb-6 sm:mb-8">
						<Skeleton className="h-8 w-56 sm:h-9 sm:w-72" />
						<Skeleton className="mt-2 h-1 w-20 rounded-full" />
						<Skeleton className="mt-3 h-4 w-52" />
					</div>

					{/* Grid matching CheckoutForm */}
					<div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
						{/* Formulaire skeleton */}
						<div className="space-y-6">
							{/* Step indicator skeleton */}
							<div className="mx-auto mb-6 w-full max-w-sm sm:mb-8">
								<div className="flex w-full items-center">
									<div className="flex items-center gap-2">
										<Skeleton className="h-9 w-9 rounded-full" />
										<Skeleton className="h-4 w-16" />
									</div>
									<Skeleton className="mx-3 h-0.5 flex-1 rounded-full" />
									<div className="flex items-center gap-2">
										<Skeleton className="h-9 w-9 rounded-full" />
										<Skeleton className="h-4 w-16" />
									</div>
								</div>
							</div>

							{/* h2 "Adresse de livraison" */}
							<Skeleton className="h-7 w-44" />

							{/* Note champs obligatoires */}
							<Skeleton className="h-4 w-72" />

							{/* Email */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-10 w-full" />
							</div>

							{/* Nom complet */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-10 w-full" />
							</div>

							{/* Adresse */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-10 w-full" />
							</div>

							{/* Lien complément d'adresse */}
							<Skeleton className="h-4 w-52" />

							{/* Code postal / Ville */}
							<div className="grid grid-cols-2 gap-3 sm:gap-6">
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
							<div className="flex min-h-11 items-center justify-between">
								<Skeleton className="h-4 w-56" />
								<Skeleton className="h-4 w-16" />
							</div>

							{/* Téléphone */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-4 w-80" />
							</div>

							{/* Code promo — collapsed link state */}
							<div className="-mx-3 px-3">
								<Skeleton className="h-4 w-44" />
							</div>

							{/* CGV */}
							<div className="flex items-start gap-3">
								<Skeleton className="mt-0.5 h-5 w-5 shrink-0 rounded-sm" />
								<div className="space-y-2">
									<Skeleton className="h-4 w-64" />
									<Skeleton className="h-4 w-80" />
								</div>
							</div>

							{/* Bouton paiement */}
							<div className="pt-2">
								<Skeleton className="h-12 w-full rounded-md" />
							</div>
						</div>

						{/* Récapitulatif skeleton - order-first sur mobile */}
						<div className="order-first lg:order-0">
							{/* Mobile : header collapsible uniquement */}
							<Card className="border-primary/10 rounded-2xl shadow-md md:hidden">
								<CardHeader className="pb-4">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<Skeleton className="h-4 w-4 rounded" />
											<Skeleton className="h-4 w-24" />
										</div>
										<div className="flex items-center gap-2">
											<Skeleton className="h-5 w-16" />
											<Skeleton className="h-4 w-4 rounded" />
										</div>
									</div>
								</CardHeader>
							</Card>

							{/* Desktop : sidebar sticky complète */}
							<Card className="border-primary/10 hidden rounded-2xl shadow-md md:sticky md:top-24 md:block">
								<CardHeader className="pb-4">
									<div className="flex items-center gap-2">
										<Skeleton className="h-5 w-5 rounded" />
										<Skeleton className="h-6 w-32" />
									</div>
								</CardHeader>
								<CardContent className="space-y-4 pb-6">
									{/* Articles */}
									<div className="space-y-3">
										{[1, 2].map((i) => (
											<div key={i} className="flex gap-3">
												<Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
												<div className="flex-1 space-y-2">
													<Skeleton className="h-4 w-full" />
													<Skeleton className="h-3 w-20" />
													<Skeleton className="h-3 w-12" />
												</div>
												<Skeleton className="h-4 w-14" />
											</div>
										))}
									</div>

									{/* Modifier panier */}
									<div className="text-center">
										<Skeleton className="mx-auto h-4 w-32" />
									</div>

									<Separator />

									{/* Sous-total + livraison */}
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
									<div className="bg-primary/3 -mx-1 space-y-2 rounded-xl p-3">
										<div className="flex justify-between">
											<Skeleton className="h-7 w-12" />
											<Skeleton className="h-7 w-20" />
										</div>
										<Skeleton className="ml-auto h-3 w-44" />
									</div>

									{/* Badges de confiance */}
									<div className="space-y-3 border-t pt-4">
										<div className="flex items-center justify-center gap-2">
											<Skeleton className="h-5 w-8 rounded" />
											<Skeleton className="h-5 w-8 rounded" />
											<Skeleton className="h-5 w-8 rounded" />
										</div>
										<Skeleton className="mx-auto h-4 w-36" />
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
