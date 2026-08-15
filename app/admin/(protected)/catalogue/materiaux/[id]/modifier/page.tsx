import { type Metadata } from "next";
import { notFound } from "next/navigation";

import { EditMaterialForm } from "@/modules/materials/components/admin/edit-material-form";
import { getMaterialById } from "@/modules/materials/data/get-material";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";

interface EditMaterialPageProps {
	params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditMaterialPageProps): Promise<Metadata> {
	const { id } = await params;
	const material = await getMaterialById({ id });
	return {
		title: material ? `Modifier ${material.name}` : "Matériau introuvable",
	};
}

export default async function EditMaterialPage({ params }: EditMaterialPageProps) {
	await assertAdminPage();

	const { id } = await params;
	const material = await getMaterialById({ id });

	if (!material) notFound();

	return (
		<div className="space-y-4">
			<h1 className="hidden text-2xl font-semibold md:block">{material.name}</h1>
			<EditMaterialForm
				material={{
					id: material.id,
					name: material.name,
				}}
				className="max-w-lg"
			/>
		</div>
	);
}
