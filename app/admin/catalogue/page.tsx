import { SectionNavigation } from "@/app/admin/_components/section-navigation";
import { Layers, Package, Palette, Tag } from "lucide-react";
import { type Metadata } from "next";
import { connection } from "next/server";

export const metadata: Metadata = {
	title: "Catalogue - Administration",
	description: "Gérer le catalogue de bijoux",
};

export default async function CatalogPage() {
	await connection();
	return (
		<>
			<SectionNavigation
				title="Catalogue"
				description="Gérez vos bijoux, collections et tout ce qui compose votre catalogue"
				columns={3}
				links={[
					{
						title: "Bijoux",
						description: "Gérer les bijoux et leurs variantes",
						href: "/admin/catalogue/produits",
						icon: Package,
					},
					{
						title: "Types de bijoux",
						description: "Gérer les types de bijoux",
						href: "/admin/catalogue/types-de-produits",
						icon: Tag,
					},
					{
						title: "Collections",
						description: "Organiser les bijoux en collections",
						href: "/admin/catalogue/collections",
						icon: Layers,
					},
					{
						title: "Couleurs",
						description: "Gérer les couleurs disponibles",
						href: "/admin/catalogue/couleurs",
						icon: Palette,
					},
				]}
			/>
		</>
	);
}
