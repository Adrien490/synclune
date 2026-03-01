import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";

/**
 * Loading state for Checkout Success page
 * Structure : PageHeader + Card avec récapitulatif + prochaines étapes
 */
export default function CheckoutSuccessLoading() {
	return (
		<div className="min-h-screen">
			{/* PageHeader skeleton */}
			<div className="bg-background border-border relative border-b">
				<div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
					{/* Breadcrumbs skeleton */}
					<div className="mb-6 flex items-center gap-2">
						<Skeleton className="bg-muted/40 h-4 w-12" />
						<span className="text-muted-foreground">/</span>
						<Skeleton className="bg-muted/40 h-4 w-16" />
						<span className="text-muted-foreground">/</span>
						<Skeleton className="bg-muted/40 h-4 w-24" />
					</div>

					{/* Title skeleton */}
					<Skeleton className="bg-muted/50 h-10 w-64" />
				</div>
			</div>

			{/* Content skeleton */}
			<section className="bg-background py-12">
				<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
					<Card className="border-primary/20 from-primary/5 to-background border-2 bg-linear-to-br">
						<CardHeader className="space-y-4 pb-6 text-center">
							{/* Icône succès */}
							<Skeleton className="bg-primary/20 mx-auto h-16 w-16 rounded-full" />

							{/* Titre */}
							<Skeleton className="bg-muted/50 mx-auto h-8 w-80" />

							{/* Description + numéro commande */}
							<div className="space-y-2">
								<Skeleton className="bg-muted/30 mx-auto h-4 w-64" />
								<Skeleton className="bg-muted/40 mx-auto h-6 w-48" />
							</div>
						</CardHeader>

						<CardContent className="space-y-6">
							{/* Récapitulatif */}
							<div className="bg-muted/50 space-y-3 rounded-lg p-4">
								<Skeleton className="bg-muted/50 h-5 w-32" />
								<div className="space-y-2">
									<div className="flex justify-between">
										<Skeleton className="bg-muted/40 h-4 w-24" />
										<Skeleton className="bg-muted/40 h-4 w-16" />
									</div>
									<div className="flex justify-between">
										<Skeleton className="bg-muted/40 h-4 w-20" />
										<Skeleton className="bg-muted/40 h-4 w-16" />
									</div>
									<div className="flex justify-between border-t pt-2">
										<Skeleton className="bg-muted/50 h-5 w-24" />
										<Skeleton className="bg-muted/50 h-5 w-20" />
									</div>
									<Skeleton className="bg-muted/30 ml-auto h-3 w-32" />
								</div>
							</div>

							{/* Adresse de livraison */}
							<div className="bg-muted/50 space-y-2 rounded-lg p-4">
								<Skeleton className="bg-muted/50 h-5 w-48" />
								<div className="space-y-1">
									<Skeleton className="bg-muted/40 h-4 w-full max-w-xs" />
									<Skeleton className="bg-muted/30 h-4 w-full max-w-md" />
									<Skeleton className="bg-muted/30 h-4 w-full max-w-sm" />
									<Skeleton className="bg-muted/30 mt-2 h-3 w-32" />
								</div>
							</div>

							{/* Message personnalisé */}
							<div className="space-y-2 rounded-lg border p-4">
								<Skeleton className="bg-muted/50 h-5 w-56" />
								<Skeleton className="bg-muted/30 h-4 w-full" />
								<Skeleton className="bg-muted/30 h-4 w-5/6" />
							</div>

							{/* Prochaines étapes */}
							<div className="space-y-4">
								<div className="flex items-center gap-2">
									<Skeleton className="bg-primary/30 h-5 w-5 rounded" />
									<Skeleton className="bg-muted/50 h-6 w-72" />
								</div>

								<div className="space-y-3">
									{Array.from({ length: 3 }).map((_, i) => (
										<div key={i} className="flex items-start gap-3">
											<Skeleton className="bg-primary/20 h-8 w-8 shrink-0 rounded-full" />
											<div className="flex-1 space-y-2">
												<Skeleton className="bg-muted/50 h-5 w-48" />
												<Skeleton className="bg-muted/30 h-4 w-full" />
												<Skeleton className="bg-muted/30 h-4 w-5/6" />
											</div>
										</div>
									))}
								</div>
							</div>

							{/* Boutons actions */}
							<div className="flex flex-col gap-3 pt-4 sm:flex-row">
								<Skeleton className="bg-primary/20 h-12 flex-1 rounded-lg" />
								<Skeleton className="bg-muted/30 h-12 flex-1 rounded-lg" />
							</div>
						</CardContent>
					</Card>

					{/* Message support */}
					<div className="mt-8 space-y-2 text-center">
						<Skeleton className="bg-muted/30 mx-auto h-4 w-64" />
						<Skeleton className="bg-muted/30 mx-auto h-4 w-32" />
					</div>
				</div>
			</section>
		</div>
	);
}
