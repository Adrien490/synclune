import type { Metadata } from "next";
import { Suspense } from "react";

import { AddressFormDialog } from "@/modules/addresses/components/address-form-dialog";
import { AddressList } from "@/modules/addresses/components/address-list";
import { AddressListSkeleton } from "@/modules/addresses/components/address-list-skeleton";
import { DeleteAddressAlertDialog } from "@/modules/addresses/components/delete-address-alert-dialog";
import { DiscardAddressChangesAlertDialog } from "@/modules/addresses/components/discard-address-changes-alert-dialog";
import { getUserAddresses } from "@/modules/addresses/data/get-user-addresses";

export const metadata: Metadata = {
	title: "Mes adresses",
};

export default function AddressesPage() {
	const addressesPromise = getUserAddresses();

	return (
		<>
			<Suspense fallback={<AddressListSkeleton />}>
				<AddressList addressesPromise={addressesPromise} />
			</Suspense>

			<Suspense fallback={null}>
				<AddressFormDialog />
			</Suspense>
			<DeleteAddressAlertDialog />
			<DiscardAddressChangesAlertDialog />
		</>
	);
}
