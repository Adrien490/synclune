import type { Metadata } from "next";
import { Suspense } from "react";

import { AddressFormDialog } from "@/modules/addresses/components/address-form-dialog";
import { AddressList } from "@/modules/addresses/components/address-list";
import { AddressListSkeleton } from "@/modules/addresses/components/address-list-skeleton";
import { DeleteAddressAlertDialog } from "@/modules/addresses/components/delete-address-alert-dialog";
import { getUserAddresses } from "@/modules/addresses/data/get-user-addresses";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = {
	title: "Mes adresses",
};

export default function AddressesPage() {
	const addressesPromise = getUserAddresses();

	return (
		<>
			<PageHeader
				title="Mes adresses"
				variant="compact"
			/>

			<Suspense fallback={<AddressListSkeleton />}>
				<AddressList addressesPromise={addressesPromise} />
			</Suspense>

			<AddressFormDialog />
			<DeleteAddressAlertDialog />
		</>
	);
}
