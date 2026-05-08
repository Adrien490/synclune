import { type Metadata } from "next";

import { CreateDiscountForm } from "@/modules/discounts/components/admin/create-discount-form";
import { AdminDetailBackLink } from "@/shared/components/admin-detail-back-link";

export const metadata: Metadata = {
	title: "Nouveau code promo - Administration",
	description: "Créer un nouveau code promo",
};

export default function CreateDiscountPage() {
	return (
		<div className="space-y-4">
			<AdminDetailBackLink href="/admin/marketing/discounts" label="Retour aux codes promo" />
			<h1 className="hidden text-2xl font-semibold md:block">Nouveau code promo</h1>
			<CreateDiscountForm className="max-w-2xl" />
		</div>
	);
}
