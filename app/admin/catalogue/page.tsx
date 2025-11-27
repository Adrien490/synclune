import { SectionNavigation } from "@/app/admin/_components/section-navigation";
import { Hash, Image, Layers, Package, Tag } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Catalogue - Administration",
	description: "Gérer le catalogue de bijoux",
};



export default function CatalogPage() {
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
						title: "Tags",
						description: "Gérer les tags pour les bijoux",
						href: "/admin/catalogue/tags",
						icon: Hash,
					},
					{
						title: "Galerie Photos",
						description: "Gérer les images des variantes",
						href: "/admin/catalogue/images",
						icon: Image,
					},
				]}
			/>
		</>
	);
}
