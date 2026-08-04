import { SectionNavigation } from "@/app/admin/_components/section-navigation";
import {
	PackageIcon,
	PaletteIcon,
	StackIcon,
	SwatchesIcon,
	TagIcon,
} from "@phosphor-icons/react/ssr";
import { type Metadata } from "next";
import { assertAdminPage } from "@/modules/auth/lib/assert-admin-page";

export const metadata: Metadata = {
	title: "Catalogue - Administration",
	description: "Gérer le catalogue de bijoux",
};

export default async function CatalogPage() {
	await assertAdminPage();

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
						icon: <PackageIcon className="size-5" />,
					},
					{
						title: "Types de bijoux",
						description: "Gérer les types de bijoux",
						href: "/admin/catalogue/types-de-produits",
						icon: <TagIcon className="size-5" />,
					},
					{
						title: "Collections",
						description: "Organiser les bijoux en collections",
						href: "/admin/catalogue/collections",
						icon: <StackIcon className="size-5" />,
					},
					{
						title: "Couleurs",
						description: "Gérer les couleurs disponibles",
						href: "/admin/catalogue/couleurs",
						icon: <PaletteIcon className="size-5" />,
					},
					{
						title: "Matériaux",
						description: "Gérer les matériaux (or, argent, plastique…)",
						href: "/admin/catalogue/materiaux",
						icon: <SwatchesIcon className="size-5" />,
					},
				]}
			/>
		</>
	);
}
