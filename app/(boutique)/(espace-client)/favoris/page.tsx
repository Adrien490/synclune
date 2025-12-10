import { PageHeader } from "@/shared/components/page-header";
import { ACCOUNT_SECTION_PADDING } from "@/shared/constants/spacing";
import {
	WishlistList,
	WishlistGridSkeleton,
	ClearWishlistButton,
	ClearWishlistAlertDialog,
	RemoveWishlistItemAlertDialog,
} from "@/modules/wishlist/components";
import { getWishlist } from "@/modules/wishlist/data/get-wishlist";
import { searchParamParsers } from "@/shared/utils/parse-search-params";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Mes favoris - Synclune",
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

	return (
		<div className="min-h-screen">
			<PageHeader
				title="Mes favoris"
				description="Retrouvez tous vos coups de cœur"
				breadcrumbs={[
					{ label: "Mon compte", href: "/compte" },
					{ label: "Favoris", href: "/favoris" },
				]}
				action={
					<Suspense fallback={null}>
						<WishlistToolbarActions wishlistPromise={wishlistPromise} />
					</Suspense>
				}
			/>

			<section className={`bg-background ${ACCOUNT_SECTION_PADDING}`}>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<Suspense fallback={<WishlistGridSkeleton />}>
						<WishlistList
							wishlistPromise={wishlistPromise}
							perPage={perPage}
						/>
					</Suspense>
				</div>
			</section>

			{/* Alert Dialogs */}
			<ClearWishlistAlertDialog />
			<RemoveWishlistItemAlertDialog />
		</div>
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
