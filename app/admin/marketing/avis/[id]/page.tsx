import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ReviewDetailPage } from "@/modules/reviews/components/admin/review-detail-page";
import { getReviewByIdAdmin } from "@/modules/reviews/data/get-review-by-id";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";

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

	return (
		<div className="space-y-6">
			<Breadcrumb className="hidden md:flex">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/marketing/avis">Avis</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{review.product.title}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<ReviewDetailPage review={review} />
		</div>
	);
}
