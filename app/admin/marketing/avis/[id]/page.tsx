import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ReviewDetailPage } from "@/modules/reviews/components/admin/review-detail-page";
import { getReviewByIdAdmin } from "@/modules/reviews/data/get-review-by-id";

interface ReviewDetailPageProps {
	params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ReviewDetailPageProps): Promise<Metadata> {
	const { id } = await params;
	const review = await getReviewByIdAdmin(id);

	if (!review) {
		return { title: "Avis introuvable - Administration" };
	}

	return {
		title: `Avis sur ${review.product.title} - Administration`,
		description: `Détail de l'avis de ${review.user.name ?? "Anonyme"} sur ${review.product.title}`,
	};
}

export default async function ReviewDetailRoute({ params }: ReviewDetailPageProps) {
	const { id } = await params;
	const review = await getReviewByIdAdmin(id);

	if (!review) {
		notFound();
	}

	return <ReviewDetailPage review={review} />;
}
