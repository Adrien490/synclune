import { type Metadata } from "next";

import { CreateDiscountForm } from "@/modules/discounts/components/admin/create-discount-form";

export const metadata: Metadata = {
	title: "Nouveau code promo - Administration",
	description: "Créer un nouveau code promo",
};

export default function CreateDiscountPage() {
	return (
		<>
			<h1 className="mb-6 hidden text-2xl font-semibold md:block">Nouveau code promo</h1>
			<CreateDiscountForm className="max-w-2xl" />
		</>
	);
}
