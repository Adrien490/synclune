import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import { ColorDetailPage } from "@/modules/colors/components/admin/color-detail";
import { getColorDetailById, getColorDistinctProductCount } from "@/modules/colors/data/get-color";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";

const ColorFormDialog = dynamic(() =>
	import("@/modules/colors/components/color-form-dialog").then((mod) => mod.ColorFormDialog),
);

const ColorsAdminDialogs = dynamic(() =>
	import("../_components/colors-admin-dialogs").then((mod) => mod.ColorsAdminDialogs),
);

type ColorDetailPageParams = Promise<{ id: string }>;

export async function generateMetadata({
	params,
}: {
	params: ColorDetailPageParams;
}): Promise<Metadata> {
	const { id } = await params;
	const color = await getColorDetailById(id);

	if (!color) {
		return { title: "Couleur introuvable - Administration" };
	}

	return {
		title: `${color.name} - Couleur - Administration`,
		description: `Détails de la couleur ${color.name} (${color.hex})`,
	};
}

export default async function AdminColorDetailPage({ params }: { params: ColorDetailPageParams }) {
	await assertAdminPage();

	const { id } = await params;
	const color = await getColorDetailById(id);

	if (!color) {
		notFound();
	}

	// Defer distinct count via Suspense streaming — avoids blocking the page
	// shell on a query that drives a single sidebar KPI.
	const distinctProductsCountPromise = getColorDistinctProductCount(color.id);

	return (
		<div className="space-y-6">
			<Breadcrumb className="hidden md:flex">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/catalogue/couleurs">Couleurs</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{color.name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<ColorDetailPage color={color} distinctProductsCountPromise={distinctProductsCountPromise} />

			<ColorFormDialog />
			<ColorsAdminDialogs />
		</div>
	);
}
