import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import {
	WishlistList,
	WishlistGridSkeleton,
	ClearWishlistButton,
	ClearWishlistAlertDialog,
	RemoveWishlistItemAlertDialog,
} from "@/modules/wishlist/components";
import { getWishlist } from "@/modules/wishlist/data/get-wishlist";
import { searchParamParsers } from "@/shared/utils/parse-search-params";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Ma liste de souhaits - Synclune",
	description: "Retrouvez tous vos coups de cœur Synclune.",
	robots: {
		index: false,
		follow: true,
	},
};

type WishlistPageProps = {
	searchParams: Promise<{
		cursor?: string;
		direction?: string;
		perPage?: string;
	}>;
};

function parseParams(params: {
	cursor?: string;
	direction?: string;
	perPage?: string;
}) {
	return {
		cursor: searchParamParsers.cursor(params.cursor),
		direction: searchParamParsers.direction(params.direction),
		perPage: searchParamParsers.perPage(params.perPage, 12, 48),
	};
}

export default async function WishlistPage({
	searchParams,
}: WishlistPageProps) {
	const params = await searchParams;
	const { cursor, direction, perPage } = parseParams(params);

	const wishlistPromise = getWishlist({
		cursor,
		direction,
		perPage,
	});

	const breadcrumbs = [
		{ label: "Mon compte", href: "/compte" },
		{ label: "Ma liste de souhaits", href: "/liste-de-souhaits" },
	];

	return (
		<>
			<PageHeader
				title="Ma liste de souhaits"
				description="Retrouvez tous vos coups de cœur"
				breadcrumbs={breadcrumbs}
				action={
					<Button variant="outline" asChild>
						<Link href="/compte">Retour</Link>
					</Button>
				}
			/>

			<section className="bg-background py-8 relative z-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
					{/* Actions */}
					<div className="flex justify-end">
						<Suspense fallback={null}>
							<WishlistToolbarActions wishlistPromise={wishlistPromise} />
						</Suspense>
					</div>

					<Suspense fallback={<WishlistGridSkeleton />}>
						<WishlistList wishlistPromise={wishlistPromise} perPage={perPage} />
					</Suspense>
				</div>
			</section>

			{/* Alert Dialogs */}
			<ClearWishlistAlertDialog />
			<RemoveWishlistItemAlertDialog />
		</>
	);
}

/**
 * Server Component pour afficher le bouton "Vider" seulement s'il y a des items
 */
async function WishlistToolbarActions({
	wishlistPromise,
}: {
	wishlistPromise: Promise<Awaited<ReturnType<typeof getWishlist>>>;
}) {
	const { totalCount } = await wishlistPromise;

	if (totalCount === 0) {
		return null;
	}

	return <ClearWishlistButton itemCount={totalCount} />;
}
