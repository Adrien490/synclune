import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for Newsletter Unsubscribe page
 * Structure identique à confirm page
 */
export default function NewsletterUnsubscribeLoading() {
	return (
		<div className="min-h-screen">
			{/* PageHeader skeleton */}
			<div className="relative bg-background border-b border-border">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl py-8 sm:py-10 lg:py-12">
					<Skeleton className="h-10 w-96 bg-muted/50 mb-4" />
					<Skeleton className="h-5 w-80 bg-muted/30" />
				</div>
			</div>

			{/* Content skeleton */}
			<div className="from-ivory via-rose-50/30 to-gold-50/20 py-12 lg:py-16">
				<div className="container mx-auto px-4 max-w-2xl">
					<div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg space-y-6">
						{/* Emoji + titre + description */}
						<div className="text-center space-y-4">
							<Skeleton className="h-16 w-16 mx-auto rounded-full bg-muted/40" />
							<Skeleton className="h-8 w-80 mx-auto bg-muted/50" />
							<div className="space-y-2">
								<Skeleton className="h-5 w-full max-w-md mx-auto bg-muted/30" />
								<Skeleton className="h-5 w-full max-w-sm mx-auto bg-muted/30" />
							</div>
						</div>

						{/* Formulaire skeleton */}
						<div className="space-y-4">
							<div className="space-y-2">
								<Skeleton className="h-4 w-20 bg-muted/40" />
								<Skeleton className="h-10 w-full bg-muted/30 rounded-md" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-32 bg-muted/40" />
								<Skeleton className="h-10 w-full bg-muted/30 rounded-md" />
							</div>
							<Skeleton className="h-10 w-full bg-destructive/20 rounded-md" />
						</div>

						{/* Réassurance */}
						<div className="bg-primary/5 rounded-lg p-4 text-center">
							<Skeleton className="h-4 w-56 mx-auto bg-muted/30" />
						</div>

						{/* Boutons */}
						<div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 border-t">
							<Skeleton className="h-10 w-full sm:w-48 bg-muted/30 rounded-md" />
							<Skeleton className="h-10 w-full sm:w-56 bg-muted/30 rounded-md" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
