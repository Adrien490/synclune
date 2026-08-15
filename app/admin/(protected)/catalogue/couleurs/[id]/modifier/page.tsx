import { type Metadata } from "next";
import { notFound } from "next/navigation";

import { EditColorForm } from "@/modules/colors/components/admin/edit-color-form";
import { getColorById } from "@/modules/colors/data/get-color";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";

interface EditColorPageProps {
	params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditColorPageProps): Promise<Metadata> {
	const { id } = await params;
	const color = await getColorById({ id });
	return {
		title: color ? `Modifier ${color.name}` : "Couleur introuvable",
	};
}

export default async function EditColorPage({ params }: EditColorPageProps) {
	await assertAdminPage();

	const { id } = await params;
	const color = await getColorById({ id });

	if (!color) notFound();

	return (
		<div className="space-y-4">
			<h1 className="hidden text-2xl font-semibold md:block">{color.name}</h1>
			<EditColorForm
				color={{
					id: color.id,
					name: color.name,
					hex: color.hex,
				}}
				className="max-w-2xl"
			/>
		</div>
	);
}
