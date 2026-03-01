import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";

/**
 * Loading state for Checkout Cancel page
 * Structure : PageHeader + Card avec message d'erreur + conseils
 */
export default function CheckoutCancelLoading() {
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
					<Skeleton className="bg-muted/50 h-10 w-56" />
				</div>
			</div>

			{/* Content skeleton */}
			<section className="bg-background py-12">
				<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
					<Card className="border-2">
						<CardHeader className="space-y-4 pb-6 text-center">
							{/* Icône erreur */}
							<Skeleton className="bg-muted/40 mx-auto h-16 w-16 rounded-full" />

							{/* Titre */}
							<Skeleton className="bg-muted/50 mx-auto h-8 w-64" />

							{/* Description */}
							<Skeleton className="bg-muted/30 mx-auto h-5 w-80" />
						</CardHeader>

						<CardContent className="space-y-6">
							{/* Alert message erreur */}
							<div className="space-y-2 rounded-lg border p-4">
								<Skeleton className="bg-muted/30 h-4 w-full" />
								<Skeleton className="bg-muted/30 h-4 w-5/6" />
							</div>

							{/* Informations */}
							<div className="space-y-3">
								<Skeleton className="bg-muted/30 h-4 w-full" />
								<Skeleton className="bg-muted/30 h-4 w-full" />
								<Skeleton className="bg-muted/30 h-4 w-4/5" />
								<div className="mt-4 flex items-start gap-2">
									<Skeleton className="bg-muted/30 h-5 w-5 shrink-0 rounded" />
									<div className="flex-1 space-y-2">
										<Skeleton className="bg-muted/30 h-4 w-full" />
										<Skeleton className="bg-muted/30 h-4 w-5/6" />
									</div>
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
						<Skeleton className="bg-muted/30 mx-auto h-4 w-72" />
						<Skeleton className="bg-muted/30 mx-auto h-4 w-40" />
					</div>
				</div>
			</section>
		</div>
	);
}
