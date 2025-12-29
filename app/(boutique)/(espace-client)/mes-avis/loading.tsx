import { MessageSquare, Star } from "lucide-react";

import { PageHeader } from "@/shared/components/page-header";
import { ACCOUNT_SECTION_PADDING } from "@/shared/constants/spacing";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";

function ReviewsListSkeleton() {
	return (
		<div className="space-y-4">
			{Array.from({ length: 3 }).map((_, i) => (
				<Card key={i}>
					<CardContent className="p-0">
						<div className="flex flex-col sm:flex-row">
							<Skeleton className="w-full sm:w-32 h-32" />
							<div className="flex-1 p-4 space-y-3">
								<div className="flex justify-between">
									<Skeleton className="h-5 w-40" />
									<Skeleton className="h-5 w-16" />
								</div>
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-16 w-full" />
								<div className="flex gap-2">
									<Skeleton className="h-8 w-24" />
									<Skeleton className="h-8 w-24" />
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

/**
 * Loading skeleton pour la page mes avis
 */
export default function MyReviewsLoading() {
	return (
		<div className="min-h-screen">
			<PageHeader
				title="Mes avis"
				description="Gérez vos avis et partagez votre expérience"
				breadcrumbs={[
					{ label: "Mon compte", href: "/compte" },
					{ label: "Mes avis", href: "/mes-avis" },
				]}
			/>

			<section className={`bg-background ${ACCOUNT_SECTION_PADDING}`}>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
					{/* Produits à évaluer */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg">
								<Star className="size-5 text-primary" />
								Produits à évaluer
							</CardTitle>
						</CardHeader>
						<CardContent>
							<ReviewsListSkeleton />
						</CardContent>
					</Card>

					<Separator />

					{/* Mes avis */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg">
								<MessageSquare className="size-5 text-primary" />
								Mes avis publiés
							</CardTitle>
						</CardHeader>
						<CardContent>
							<ReviewsListSkeleton />
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	);
}
