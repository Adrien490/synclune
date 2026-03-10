import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";

/**
 * Loading state for Checkout Cancel page
 * Structure matches: gradient bg + max-w-3xl + Card with error + tips + actions
 */
export default function CheckoutCancelLoading() {
	return (
		<div className="relative min-h-screen">
			{/* Decorative background (matches page) */}
			<div className="from-primary/2 to-secondary/3 fixed inset-0 -z-10 bg-linear-to-br via-transparent" />

			<section className="py-8 sm:py-10">
				<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
					<Card className="border-primary/10 rounded-2xl shadow-md">
						<CardHeader className="space-y-4 pb-6 text-center">
							{/* Error icon */}
							<Skeleton className="bg-muted/80 mx-auto h-18 w-18 rounded-full" />

							{/* Title */}
							<Skeleton className="bg-muted/50 mx-auto h-8 w-64" />

							{/* Description */}
							<Skeleton className="bg-muted/30 mx-auto h-5 w-80" />
						</CardHeader>

						<CardContent className="space-y-6">
							{/* Alert message */}
							<div className="space-y-2 rounded-lg border p-4">
								<Skeleton className="bg-muted/30 h-4 w-full" />
								<Skeleton className="bg-muted/30 h-4 w-5/6" />
							</div>

							{/* Informations et conseils */}
							<div className="space-y-3">
								<Skeleton className="bg-muted/30 h-4 w-full" />
								<Skeleton className="bg-muted/30 h-4 w-full" />
								<Skeleton className="bg-muted/30 h-4 w-4/5" />
							</div>

							{/* Reassurance message */}
							<Skeleton className="bg-muted/30 mx-auto h-4 w-96 max-w-full" />

							{/* Boutons actions */}
							<div className="flex flex-col gap-3 pt-4 sm:flex-row">
								<Skeleton className="bg-primary/20 h-12 flex-1 rounded-lg" />
								<Skeleton className="bg-muted/30 h-12 flex-1 rounded-lg" />
							</div>
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	);
}
