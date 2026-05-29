import type { Metadata } from "next";

import { CreateAddressForm } from "@/modules/addresses/components/create-address-form";

export const metadata: Metadata = {
	title: "Ajouter une adresse",
};

export default function NewAddressPage() {
	return (
		<div className="mx-auto max-w-2xl">
			<CreateAddressForm />
		</div>
	);
}
