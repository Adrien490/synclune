import { type Metadata } from "next";
import { notFound } from "next/navigation";

import { EditMaterialForm } from "@/modules/materials/components/admin/edit-material-form";
import { getMaterialBySlug } from "@/modules/materials/data/get-material";

interface EditMaterialPageProps {
	params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EditMaterialPageProps): Promise<Metadata> {
	const { slug } = await params;
	const material = await getMaterialBySlug({ slug, includeInactive: true });
	return {
		title: material ? `Modifier ${material.name}` : "Matériau introuvable",
	};
}

export default async function EditMaterialPage({ params }: EditMaterialPageProps) {
	const { slug } = await params;
	const material = await getMaterialBySlug({ slug, includeInactive: true });

	if (!material) notFound();

	return (
		<>
			<h1 className="mb-6 text-2xl font-semibold">{material.name}</h1>
			<EditMaterialForm
				material={{
					id: material.id,
					name: material.name,
					slug: material.slug,
					description: material.description,
					isActive: material.isActive,
				}}
				className="max-w-lg"
			/>
		</>
	);
}
