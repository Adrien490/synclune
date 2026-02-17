import { PageHeader } from "@/shared/components/page-header";
import { ACCOUNT_SECTION_PADDING } from "@/shared/constants/spacing";
import { AddressList } from "@/modules/addresses/components/address-list";
import { AddressListSkeleton } from "@/modules/addresses/components/address-list-skeleton";
import { AddressFormDialog } from "@/modules/addresses/components/address-form-dialog";
import { DeleteAddressAlertDialog } from "@/modules/addresses/components/delete-address-alert-dialog";
import { getUserAddresses } from "@/modules/addresses/data/get-user-addresses";
import { searchAddress } from "@/modules/addresses/actions/search-address";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Mes adresses | Synclune",
	description: "Gérez vos adresses de livraison",
	robots: {
		index: false,
		follow: true,
	},
};

type AddressesPageProps = {
	searchParams: Promise<{ q?: string }>;
};

export default async function AddressesPage({
	searchParams,
}: AddressesPageProps) {
	const params = await searchParams;
	const addressesPromise = getUserAddresses();

	// Autocomplete suggestions from BAN API (triggered by ?q= param)
	const query = params.q;
	const suggestions =
		query && query.length >= 3
			? await searchAddress({ text: query, maximumResponses: 5 })
			: null;

	return (
		<div className="min-h-screen">
			<PageHeader
				title="Mes adresses"
				description="Gérez vos adresses de livraison"
				breadcrumbs={[
					{ label: "Mon compte", href: "/compte" },
					{ label: "Adresses", href: "/adresses" },
				]}
			/>

			<section className={`bg-background ${ACCOUNT_SECTION_PADDING}`}>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<Suspense fallback={<AddressListSkeleton />}>
						<AddressList addressesPromise={addressesPromise} />
					</Suspense>
				</div>
			</section>

			<AddressFormDialog
				addressSuggestions={suggestions?.addresses ?? []}
			/>
			<DeleteAddressAlertDialog />
		</div>
	);
}
