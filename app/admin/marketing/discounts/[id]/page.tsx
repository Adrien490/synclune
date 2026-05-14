import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import { DiscountDetailPage } from "@/modules/discounts/components/admin/discount-detail";
import { getDiscountById } from "@/modules/discounts/data/get-discount";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";

const DiscountsAdminDialogs = dynamic(() =>
	import("../_components/discounts-admin-dialogs").then((mod) => mod.DiscountsAdminDialogs),
);

type DiscountDetailRouteParams = Promise<{ id: string }>;

export async function generateMetadata({
	params,
}: {
	params: DiscountDetailRouteParams;
}): Promise<Metadata> {
	const { id } = await params;
	const discount = await getDiscountById({ id });

	if (!discount) {
		return {
			title: "Code promo introuvable",
		};
	}

	return {
		title: `${discount.code} - Administration`,
		description: `Détails du code promo ${discount.code}`,
	};
}

export default async function AdminDiscountDetailPage({
	params,
}: {
	params: DiscountDetailRouteParams;
}) {
	const { id } = await params;
	const discount = await getDiscountById({ id });

	if (!discount) {
		notFound();
	}

	return (
		<div className="space-y-6">
			<Breadcrumb className="hidden md:flex">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/marketing/discounts">Codes promo</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{discount.code}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<DiscountDetailPage discount={discount} />

			<DiscountsAdminDialogs />
		</div>
	);
}
