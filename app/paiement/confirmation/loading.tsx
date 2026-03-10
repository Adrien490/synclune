import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";

/**
 * Loading state for Checkout Success page
 * Structure matches: gradient bg + max-w-3xl + Card with articles + recap + address + steps
 */
export default function CheckoutSuccessLoading() {
	return (
		<div className="relative min-h-screen">
			{/* Decorative background (matches page) */}
			<div className="from-primary/2 to-secondary/3 fixed inset-0 -z-10 bg-linear-to-br via-transparent" />

			<section className="py-8 sm:py-10">
				<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
					<Card className="border-primary/20 from-primary/5 to-background rounded-2xl border-2 bg-linear-to-br shadow-md">
						<CardHeader className="space-y-4 pb-6 text-center">
							{/* Success icon */}
							<Skeleton className="bg-primary/20 mx-auto h-16 w-16 rounded-full" />

							{/* Title */}
							<Skeleton className="bg-muted/50 mx-auto h-8 w-80" />

							{/* Description + order number */}
							<div className="space-y-2">
								<Skeleton className="bg-muted/30 mx-auto h-4 w-64" />
								<Skeleton className="bg-muted/40 mx-auto h-6 w-48" />
							</div>
						</CardHeader>

						<CardContent className="space-y-6">
							{/* Articles commandés */}
							<div className="bg-muted/50 border-primary/5 space-y-3 rounded-xl border p-4">
								<Skeleton className="bg-muted/50 h-5 w-44" />
								<div className="space-y-3">
									{Array.from({ length: 2 }).map((_, i) => (
										<div key={i} className="flex gap-3">
											<Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
											<div className="min-w-0 flex-1 space-y-1.5">
												<Skeleton className="bg-muted/50 h-4 w-40" />
												<Skeleton className="bg-muted/30 h-3 w-32" />
												<Skeleton className="bg-muted/30 h-3 w-16" />
											</div>
											<Skeleton className="bg-muted/40 h-4 w-14 shrink-0" />
										</div>
									))}
								</div>
							</div>

							{/* Récapitulatif montants */}
							<div className="bg-muted/50 border-primary/5 space-y-3 rounded-xl border p-4">
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
								</div>
							</div>

							{/* Adresse de livraison */}
							<div className="bg-muted/50 border-primary/5 space-y-2 rounded-xl border p-4">
								<Skeleton className="bg-muted/50 h-5 w-48" />
								<div className="space-y-1">
									<Skeleton className="bg-muted/40 h-4 w-full max-w-xs" />
									<Skeleton className="bg-muted/30 h-4 w-full max-w-md" />
									<Skeleton className="bg-muted/30 h-4 w-full max-w-sm" />
								</div>
							</div>

							{/* Message personnalisé (Alert) */}
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
