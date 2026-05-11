import { type Metadata } from "next";
import { notFound } from "next/navigation";

import { EditColorForm } from "@/modules/colors/components/admin/edit-color-form";
import { getColorBySlug } from "@/modules/colors/data/get-color";

interface EditColorPageProps {
	params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EditColorPageProps): Promise<Metadata> {
	const { slug } = await params;
	const color = await getColorBySlug({ slug, includeInactive: true });
	return {
		title: color ? `Modifier ${color.name}` : "Couleur introuvable",
	};
}

export default async function EditColorPage({ params }: EditColorPageProps) {
	const { slug } = await params;
	const color = await getColorBySlug({ slug, includeInactive: true });

	if (!color) notFound();

	return (
		<div className="space-y-4">
			<h1 className="hidden text-2xl font-semibold md:block">{color.name}</h1>
			<EditColorForm
				color={{
					id: color.id,
					name: color.name,
					slug: color.slug,
					hex: color.hex,
					description: color.description,
				}}
				className="max-w-2xl"
			/>
		</div>
	);
}
