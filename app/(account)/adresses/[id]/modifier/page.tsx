import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditAddressForm } from "@/modules/addresses/components/edit-address-form";
import { getUserAddresses } from "@/modules/addresses/data/get-user-addresses";

export const metadata: Metadata = {
	title: "Modifier une adresse",
};

export default async function EditAddressPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	// getUserAddresses() est session-scopé : ownership garanti, pas de fuite.
	const addresses = await getUserAddresses();
	const address = addresses?.find((a) => a.id === id);

	if (!address) {
		notFound();
	}

	return (
		<div className="mx-auto max-w-2xl">
			<EditAddressForm address={address} />
		</div>
	);
}
