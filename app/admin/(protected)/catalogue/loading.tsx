import { SectionNavigationLoading } from "@/app/admin/(protected)/_components/section-navigation-loading";

export default function CatalogLoading() {
	return (
		<SectionNavigationLoading
			title="Catalogue"
			description="Gérez vos bijoux, collections et tout ce qui compose votre catalogue"
			columns={3}
			count={5}
		/>
	);
}
