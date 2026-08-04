import { SectionNavigation } from "@/app/admin/_components/section-navigation";
import { ShieldWarningIcon, StorefrontIcon, WrenchIcon } from "@phosphor-icons/react/ssr";
import { type Metadata } from "next";
import { assertAdminPage } from "@/modules/auth/lib/assert-admin-page";

export const metadata: Metadata = {
	title: "Configuration - Administration",
	description: "Paramètres de la boutique",
};

export default async function ConfigurationPage() {
	await assertAdminPage();

	return (
		<SectionNavigation
			title="Configuration"
			description="Paramètres globaux de votre boutique"
			columns={2}
			links={[
				{
					title: "Boutique",
					description: "Fermeture temporaire, messages clients",
					href: "/admin/configuration/boutique",
					icon: <StorefrontIcon className="size-5" />,
				},
				{
					title: "Sécurité",
					description: "Sessions ouvertes, déconnexion de tous les appareils",
					href: "/admin/configuration/securite",
					icon: <ShieldWarningIcon className="size-5" />,
				},
				{
					title: "Maintenance",
					description: "Tâches de rattrapage à lancer manuellement",
					href: "/admin/configuration/maintenance",
					icon: <WrenchIcon className="size-5" />,
				},
			]}
		/>
	);
}
