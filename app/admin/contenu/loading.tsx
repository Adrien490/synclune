import { SectionNavigationLoading } from "@/app/admin/_components/section-navigation-loading";

export default function ContentLoading() {
	return (
		<SectionNavigationLoading
			title="Contenu"
			description="Gérez le contenu affiché sur votre boutique"
			columns={2}
			count={1}
		/>
	);
}
