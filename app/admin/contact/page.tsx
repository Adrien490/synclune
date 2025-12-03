import { ContactAdrienForm } from "@/modules/dashboard/components/contact-adrien-form";
import { PageHeader } from "@/shared/components/page-header";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Contacter Adri - Administration",
	description: "Signale un bug, demande une fonctionnalité ou pose une question",
};

export default function ContactPage() {
	return (
		<>
			<PageHeader
				variant="compact"
				title="Contacter Adri"
				description="Signale un bug, demande une fonctionnalité ou pose une question."
			/>

			<div className="max-w-lg">
				<ContactAdrienForm />
			</div>
		</>
	);
}
