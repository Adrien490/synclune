import { Skeleton } from "@/shared/components/ui/skeleton";
import {
	Card,
	CardContent,
	CardHeader,
} from "@/shared/components/ui/card";

/**
 * Loading state for Checkout Success page
 * Structure : PageHeader + Card avec récapitulatif + prochaines étapes
 */
export default function CheckoutSuccessLoading() {
	return (
		<div className="min-h-screen">
			{/* PageHeader skeleton */}
			<div className="relative bg-background border-b border-border">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl py-8 sm:py-10 lg:py-12">
					{/* Breadcrumbs skeleton */}
					<div className="mb-6 flex items-center gap-2">
						<Skeleton className="h-4 w-12 bg-muted/40" />
						<span className="text-muted-foreground">/</span>
						<Skeleton className="h-4 w-16 bg-muted/40" />
						<span className="text-muted-foreground">/</span>
						<Skeleton className="h-4 w-24 bg-muted/40" />
					</div>

					{/* Title skeleton */}
					<Skeleton className="h-10 w-64 bg-muted/50" />
				</div>
			</div>

			{/* Content skeleton */}
			<section className="bg-background py-12">
				<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
					<Card className="border-2 border-primary/20 bg-linear-to-br from-primary/5 to-background">
						<CardHeader className="text-center space-y-4 pb-6">
							{/* Icône succès */}
							<Skeleton className="mx-auto w-16 h-16 rounded-full bg-primary/20" />

							{/* Titre */}
							<Skeleton className="h-8 w-80 mx-auto bg-muted/50" />

							{/* Description + numéro commande */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-64 mx-auto bg-muted/30" />
								<Skeleton className="h-6 w-48 mx-auto bg-muted/40" />
							</div>
						</CardHeader>

						<CardContent className="space-y-6">
							{/* Récapitulatif */}
							<div className="bg-muted/50 rounded-lg p-4 space-y-3">
								<Skeleton className="h-5 w-32 bg-muted/50" />
								<div className="space-y-2">
									<div className="flex justify-between">
										<Skeleton className="h-4 w-24 bg-muted/40" />
										<Skeleton className="h-4 w-16 bg-muted/40" />
									</div>
									<div className="flex justify-between">
										<Skeleton className="h-4 w-20 bg-muted/40" />
										<Skeleton className="h-4 w-16 bg-muted/40" />
									</div>
									<div className="border-t pt-2 flex justify-between">
										<Skeleton className="h-5 w-24 bg-muted/50" />
										<Skeleton className="h-5 w-20 bg-muted/50" />
									</div>
									<Skeleton className="h-3 w-32 ml-auto bg-muted/30" />
								</div>
							</div>

							{/* Adresse de livraison */}
							<div className="bg-muted/50 rounded-lg p-4 space-y-2">
								<Skeleton className="h-5 w-48 bg-muted/50" />
								<div className="space-y-1">
									<Skeleton className="h-4 w-full max-w-xs bg-muted/40" />
									<Skeleton className="h-4 w-full max-w-md bg-muted/30" />
									<Skeleton className="h-4 w-full max-w-sm bg-muted/30" />
									<Skeleton className="h-3 w-32 bg-muted/30 mt-2" />
								</div>
							</div>

							{/* Message personnalisé */}
							<div className="border rounded-lg p-4 space-y-2">
								<Skeleton className="h-5 w-56 bg-muted/50" />
								<Skeleton className="h-4 w-full bg-muted/30" />
								<Skeleton className="h-4 w-5/6 bg-muted/30" />
							</div>

							{/* Prochaines étapes */}
							<div className="space-y-4">
								<div className="flex items-center gap-2">
									<Skeleton className="w-5 h-5 rounded bg-primary/30" />
									<Skeleton className="h-6 w-72 bg-muted/50" />
								</div>

								<div className="space-y-3">
									{Array.from({ length: 3 }).map((_, i) => (
										<div key={i} className="flex gap-3 items-start">
											<Skeleton className="w-8 h-8 rounded-full bg-primary/20 shrink-0" />
											<div className="flex-1 space-y-2">
												<Skeleton className="h-5 w-48 bg-muted/50" />
												<Skeleton className="h-4 w-full bg-muted/30" />
												<Skeleton className="h-4 w-5/6 bg-muted/30" />
											</div>
										</div>
									))}
								</div>
							</div>

							{/* Boutons actions */}
							<div className="flex flex-col sm:flex-row gap-3 pt-4">
								<Skeleton className="h-12 flex-1 bg-primary/20 rounded-lg" />
								<Skeleton className="h-12 flex-1 bg-muted/30 rounded-lg" />
							</div>
						</CardContent>
					</Card>

					{/* Message support */}
					<div className="mt-8 text-center space-y-2">
						<Skeleton className="h-4 w-64 mx-auto bg-muted/30" />
						<Skeleton className="h-4 w-32 mx-auto bg-muted/30" />
					</div>
				</div>
			</section>
		</div>
	);
}
