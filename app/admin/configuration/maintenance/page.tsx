import { type Metadata } from "next";

import { assertAdminPage } from "@/modules/auth/lib/assert-admin-page";
import { MaintenanceTasksCard } from "@/modules/cron/components/admin/maintenance-tasks-card";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = {
	title: "Maintenance - Administration",
	description: "Tâches de rattrapage à lancer manuellement",
};

export default async function MaintenancePage() {
	await assertAdminPage();

	return (
		<>
			<PageHeader
				variant="compact"
				title="Maintenance"
				description="Lance de temps en temps les tâches de rattrapage — le reste tourne tout seul"
			/>

			<div className="mx-auto max-w-2xl">
				<MaintenanceTasksCard />
			</div>
		</>
	);
}
