import { type Metadata } from "next";

import { CreateDiscountForm } from "@/modules/discounts/components/admin/create-discount-form";
import { assertAdminPage } from "@/modules/auth/lib/assert-admin-page";

export const metadata: Metadata = {
	title: "Nouveau code promo - Administration",
	description: "Créer un nouveau code promo",
};

export default async function CreateDiscountPage() {
	await assertAdminPage();

	return (
		<div className="space-y-4">
			<h1 className="hidden text-2xl font-semibold md:block">Nouveau code promo</h1>
			<CreateDiscountForm className="max-w-2xl" />
		</div>
	);
}
