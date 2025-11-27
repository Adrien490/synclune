import { Skeleton } from "@/shared/components/ui/skeleton";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { ShoppingBag, TruckIcon } from "lucide-react";
import { CartItemsListSkeleton } from "@/modules/cart/components/cart-items-list-skeleton";

/**
 * Loading state for cart page
 * Structure en 3 colonnes : Produit | Quantité | Total
 * Compatible Next.js 16 + React 19.2
 */
export default function CartLoading() {
	return (
		<div
			className="min-h-screen"
			role="status"
			aria-busy="true"
			aria-label="Chargement du panier"
		>
			<span className="sr-only">Chargement du panier...</span>

			{/* PageHeader Skeleton */}
			<div className="pt-16 sm:pt-20">
				<section className="bg-background border-b border-border">
					<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
						<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
							<div className="space-y-2">
								{/* Breadcrumbs skeleton */}
								<nav
									aria-label="Fil d'Ariane"
									className="text-sm leading-normal text-muted-foreground"
								>
									<ol className="flex items-center gap-2 list-none p-0 m-0">
										<li>
											<Skeleton className="h-4 w-16 bg-muted/40" />
										</li>
										<li className="flex items-center gap-2">
											<span aria-hidden="true">/</span>
											<Skeleton className="h-4 w-12 bg-muted/50" />
										</li>
									</ol>
								</nav>

								{/* Title skeleton */}
								<Skeleton className="h-8 sm:h-9 w-32 bg-muted/50" />
							</div>

							{/* Action button skeleton (ClearCartButton) */}
							<div className="shrink-0">
								<Skeleton className="h-9 w-36 bg-muted/40 rounded-md" />
							</div>
						</div>
					</div>
				</section>
			</div>

			{/* Main Content - Structure exacte avec grid lg:grid-cols-3 */}
			<section className="bg-background py-6 sm:py-8">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
						{/* CartSummary Skeleton - Right on desktop, top on mobile */}
						<div className="lg:col-span-1 order-1 lg:order-2">
							<Card className="lg:sticky lg:top-24 rounded-xl shadow-sm border-2">
								<h2 className="sr-only">Récapitulatif de la commande</h2>

								<CardHeader className="pb-4">
									<CardTitle className="flex items-center gap-2 text-lg/7 tracking-tight antialiased">
										<ShoppingBag className="w-5 h-5 text-muted-foreground" />
										<Skeleton className="h-5 w-28 bg-muted/50" />
									</CardTitle>
								</CardHeader>

								<CardContent className="space-y-4 pb-4">
									{/* Détails du panier */}
									<div className="space-y-3 text-sm/6 tracking-normal antialiased">
										{/* Articles */}
										<div className="flex justify-between items-center">
											<Skeleton className="h-4 w-20 bg-muted/40" />
											<Skeleton className="h-5 w-16 bg-muted/50" />
										</div>

										{/* Livraison */}
										<div className="flex justify-between items-center">
											<span className="text-muted-foreground flex items-center gap-1.5">
												<TruckIcon className="w-4 h-4" />
												<Skeleton className="h-4 w-16 bg-muted/40" />
											</span>
											<Skeleton className="h-5 w-14 bg-muted/50" />
										</div>
									</div>

									<Separator />

									{/* Total */}
									<div className="space-y-2">
										<div className="flex justify-between items-center text-lg/7 sm:text-xl/7 tracking-tight antialiased font-semibold">
											<Skeleton className="h-6 w-24 bg-muted/50" />
											<Skeleton className="h-7 w-24 bg-muted/60" />
										</div>
										<div className="text-xs/5 tracking-normal antialiased text-muted-foreground text-right">
											<Skeleton className="h-3 w-20 bg-muted/30 ml-auto" />
										</div>
										<div className="text-xs/5 tracking-normal antialiased text-muted-foreground text-right">
											<Skeleton className="h-3 w-32 bg-muted/30 ml-auto" />
										</div>
									</div>
								</CardContent>

								<CardFooter className="flex-col gap-3 pt-4">
									{/* Bouton commander */}
									<Skeleton className="h-12 w-full bg-primary/20 rounded-md" />

									{/* Lien continuer les achats */}
									<Skeleton className="h-9 w-full bg-muted/30 rounded-md" />
								</CardFooter>
							</Card>
						</div>

						{/* CartItemsList Skeleton - Left on desktop, bottom on mobile */}
						<div className="lg:col-span-2 order-2 lg:order-1">
							<CartItemsListSkeleton />
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
