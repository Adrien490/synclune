import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import { MaterialDetailPage } from "@/modules/materials/components/admin/material-detail";
import {
	getMaterialDetailBySlug,
	getMaterialDistinctProductCount,
} from "@/modules/materials/data/get-material";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";

const MaterialFormDialog = dynamic(() =>
	import("@/modules/materials/components/material-form-dialog").then(
		(mod) => mod.MaterialFormDialog,
	),
);

const MaterialsAdminDialogs = dynamic(() =>
	import("../_components/materials-admin-dialogs").then((mod) => mod.MaterialsAdminDialogs),
);

type MaterialDetailPageParams = Promise<{ slug: string }>;

export async function generateMetadata({
	params,
}: {
	params: MaterialDetailPageParams;
}): Promise<Metadata> {
	const { slug } = await params;
	const material = await getMaterialDetailBySlug(slug);

	if (!material) {
		return { title: "Matériau introuvable - Administration" };
	}

	return {
		title: `${material.name} - Matériau - Administration`,
		description: `Détails du matériau ${material.name}`,
	};
}

export default async function AdminMaterialDetailPage({
	params,
}: {
	params: MaterialDetailPageParams;
}) {
	await assertAdminPage();

	const { slug } = await params;
	const material = await getMaterialDetailBySlug(slug);

	if (!material) {
		notFound();
	}

	// Non-awaited Promise — streams via <Suspense> inside MaterialDetailPage.
	const distinctProductsCountPromise = getMaterialDistinctProductCount(material.id);

	return (
		<div className="space-y-6">
			<Breadcrumb className="hidden md:flex">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/catalogue/materiaux">Matériaux</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{material.name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<MaterialDetailPage
				material={material}
				distinctProductsCountPromise={distinctProductsCountPromise}
			/>

			<MaterialFormDialog />
			<MaterialsAdminDialogs />
		</div>
	);
}
