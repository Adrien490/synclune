import { SectionNavigation } from "@/app/admin/_components/section-navigation";
import { Megaphone } from "lucide-react";
import { type Metadata } from "next";

export const metadata: Metadata = {
	title: "Contenu - Administration",
	description: "Gérer le contenu du site",
};

export default async function ContentPage() {
	return (
		<SectionNavigation
			title="Contenu"
			description="Gérez le contenu affiché sur votre boutique"
			columns={2}
			links={[
				{
					title: "Annonces",
					description: "Gérer les annonces promotionnelles affichées sur la boutique",
					href: "/admin/contenu/annonces",
					icon: <Megaphone className="size-5" />,
				},
			]}
		/>
	);
}
