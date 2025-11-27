import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

/**
 * Loading state for Settings page
 * Reproduit la structure : PageHeader + 3 Cards (Profil, Sécurité, Session)
 */
export default function SettingsLoading() {
	return (
		<div className="min-h-screen relative">
			{/* PageHeader skeleton */}
			<div className="relative bg-background border-b border-border">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl py-8 sm:py-10 lg:py-12">
					{/* Breadcrumbs skeleton */}
					<div className="mb-6 flex items-center gap-2">
						<Skeleton className="h-4 w-20 bg-muted/40" />
						<span className="text-muted-foreground">/</span>
						<Skeleton className="h-4 w-24 bg-muted/40" />
					</div>

					{/* Title skeleton */}
					<Skeleton className="h-10 w-72 bg-muted/50 mb-4" />

					{/* Description skeleton */}
					<Skeleton className="h-5 w-96 bg-muted/30" />
				</div>
			</div>

			{/* Content skeleton */}
			<section className="bg-background py-8 relative z-10">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
					{/* Card 1: Profil */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Skeleton className="w-5 h-5 rounded bg-muted/40" />
								<Skeleton className="h-6 w-56 bg-muted/50" />
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Formulaire profil skeleton */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-12 bg-muted/40" />
								<Skeleton className="h-10 w-full bg-muted/30 rounded-md" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-16 bg-muted/40" />
								<Skeleton className="h-10 w-full bg-muted/30 rounded-md" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-20 bg-muted/40" />
								<Skeleton className="h-10 w-full bg-muted/30 rounded-md" />
							</div>
							<Skeleton className="h-10 w-32 bg-primary/20 rounded-md mt-4" />
						</CardContent>
					</Card>

					{/* Card 2: Sécurité */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Skeleton className="w-5 h-5 rounded bg-muted/40" />
								<Skeleton className="h-6 w-24 bg-muted/50" />
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Formulaire changement mot de passe skeleton */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-40 bg-muted/40" />
								<Skeleton className="h-10 w-full bg-muted/30 rounded-md" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-48 bg-muted/40" />
								<Skeleton className="h-10 w-full bg-muted/30 rounded-md" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-56 bg-muted/40" />
								<Skeleton className="h-10 w-full bg-muted/30 rounded-md" />
							</div>
							<Skeleton className="h-10 w-48 bg-primary/20 rounded-md mt-4" />
						</CardContent>
					</Card>

					{/* Card 3: Session */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Skeleton className="w-5 h-5 rounded bg-muted/40" />
								<Skeleton className="h-6 w-20 bg-muted/50" />
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Skeleton className="h-4 w-full max-w-sm bg-muted/30 mb-4" />
							<Skeleton className="h-10 w-40 bg-destructive/20 rounded-md" />
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	);
}
