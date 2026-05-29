"use client";

import { ArrowRight, Star } from "lucide-react";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { ReviewSummaryCompact } from "@/modules/reviews/components/review-summary-compact";
import type { ProductReviewStatistics } from "@/modules/reviews/types/review.types";

const RATING_LEVELS = [5, 4, 3, 2, 1] as const;

interface ProductDetailReviewsCardProps {
	stats: ProductReviewStatistics;
	productTitle: string;
}

export function ProductDetailReviewsCard({ stats, productTitle }: ProductDetailReviewsCardProps) {
	const haptic = useHaptic();
	const hasReviews = stats.totalCount > 0;
	const moderationHref = `/admin/marketing/avis?search=${encodeURIComponent(productTitle)}`;

	return (
		<Card style={{ viewTransitionName: "product-detail-reviews" }}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Star className="size-5" aria-hidden="true" />
					Avis
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{hasReviews ? (
					<>
						<ReviewSummaryCompact stats={stats} />

						<ul className="space-y-1.5" aria-label="Répartition des notes">
							{RATING_LEVELS.map((level) => {
								const entry = stats.distribution.find((d) => d.rating === level);
								const count = entry?.count ?? 0;
								const percentage = entry?.percentage ?? 0;
								return (
									<li
										key={level}
										className="flex items-center gap-2 text-xs"
										aria-label={`${level} étoile${level > 1 ? "s" : ""} : ${count} avis`}
									>
										<span className="text-muted-foreground flex w-6 shrink-0 items-center justify-end gap-0.5 tabular-nums">
											{level}
											<Star className="size-3 shrink-0" aria-hidden="true" />
										</span>
										<span
											className="bg-muted relative h-1.5 flex-1 overflow-hidden rounded-full"
											aria-hidden="true"
										>
											<span
												className="bg-primary absolute inset-y-0 left-0 rounded-full"
												style={{ width: `${percentage}%` }}
											/>
										</span>
										<span className="text-muted-foreground w-6 shrink-0 text-right tabular-nums">
											{count}
										</span>
									</li>
								);
							})}
						</ul>

						<Button
							asChild
							variant="outline"
							className="w-full touch-manipulation transition-transform duration-150 active:scale-[0.98]"
						>
							<Link href={moderationHref} onClick={() => haptic("light")}>
								Gérer les avis
								<ArrowRight className="size-4" aria-hidden="true" />
							</Link>
						</Button>
					</>
				) : (
					<p className="text-muted-foreground text-sm italic">Aucun avis pour le moment</p>
				)}
			</CardContent>
		</Card>
	);
}
