import { PageHeader } from "@/shared/components/page-header";
import { WishlistList } from "@/modules/wishlist/components/wishlist-list";
import { WishlistGridSkeleton } from "@/modules/wishlist/components/wishlist-grid-skeleton";
import { RemoveWishlistItemAlertDialog } from "@/modules/wishlist/components/remove-wishlist-item-alert-dialog";

import { getWishlist } from "@/modules/wishlist/data/get-wishlist";
import { searchParamParsers } from "@/shared/utils/parse-search-params";
import {
	GET_WISHLIST_DEFAULT_PER_PAGE,
	GET_WISHLIST_MAX_RESULTS_PER_PAGE,
} from "@/modules/wishlist/constants/wishlist.constants";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Mes favoris",
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
		perPage: searchParamParsers.perPage(params.perPage, GET_WISHLIST_DEFAULT_PER_PAGE, GET_WISHLIST_MAX_RESULTS_PER_PAGE),
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
		<>
			<PageHeader
				title="Mes favoris"
				description="Retrouvez tous vos coups de cœur"
				variant="compact"
			/>

			<Suspense fallback={<WishlistGridSkeleton />}>
				<WishlistList
					wishlistPromise={wishlistPromise}
					perPage={perPage}
				/>
			</Suspense>

			<RemoveWishlistItemAlertDialog />
		</>
	);
}
