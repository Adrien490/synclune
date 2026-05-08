import { SectionNavigation } from "@/app/admin/_components/section-navigation";
import { Gem, Layers, Package, Palette, Tag } from "lucide-react";
import { type Metadata } from "next";

export const metadata: Metadata = {
	title: "Catalogue - Administration",
	description: "Gérer le catalogue de bijoux",
};

export default async function CatalogPage() {
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
						icon: <Package className="size-5" />,
					},
					{
						title: "Types de bijoux",
						description: "Gérer les types de bijoux",
						href: "/admin/catalogue/types-de-produits",
						icon: <Tag className="size-5" />,
					},
					{
						title: "Collections",
						description: "Organiser les bijoux en collections",
						href: "/admin/catalogue/collections",
						icon: <Layers className="size-5" />,
					},
					{
						title: "Couleurs",
						description: "Gérer les couleurs disponibles",
						href: "/admin/catalogue/couleurs",
						icon: <Palette className="size-5" />,
					},
					{
						title: "Matériaux",
						description: "Gérer les matériaux (or, argent, plastique…)",
						href: "/admin/catalogue/materiaux",
						icon: <Gem className="size-5" />,
					},
				]}
			/>
		</>
	);
}
