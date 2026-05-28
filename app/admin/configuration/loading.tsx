import { SectionNavigationLoading } from "@/app/admin/_components/section-navigation-loading";

export default function ConfigurationLoading() {
	return (
		<SectionNavigationLoading
			title="Configuration"
			description="Paramètres globaux de votre boutique"
			columns={2}
			count={1}
		/>
	);
}
