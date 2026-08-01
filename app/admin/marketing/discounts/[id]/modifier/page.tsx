import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { DiscountEditPage } from "@/modules/discounts/components/admin/discount-edit-page";
import { getDiscountById } from "@/modules/discounts/data/get-discount";
import { assertAdminPage } from "@/modules/auth/lib/assert-admin-page";

interface DiscountEditRouteProps {
	params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: DiscountEditRouteProps): Promise<Metadata> {
	const { id } = await params;
	const discount = await getDiscountById({ id });

	if (!discount) {
		return { title: "Code promo introuvable - Administration" };
	}

	return {
		title: `Modifier ${discount.code} - Administration`,
		description: `Modifier le code promo ${discount.code}`,
	};
}

export default async function DiscountEditRoute({ params }: DiscountEditRouteProps) {
	await assertAdminPage();

	const { id } = await params;
	const discount = await getDiscountById({ id });

	if (!discount) {
		notFound();
	}

	return <DiscountEditPage discount={discount} />;
}
