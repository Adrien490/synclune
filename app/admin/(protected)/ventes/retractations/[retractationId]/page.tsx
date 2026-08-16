import { type Metadata } from "next";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";

import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";
import { getRetractationById } from "@/modules/retractations/data/get-retractation";
import { RetractationDetail } from "@/modules/retractations/components/admin/retractation-detail";
import { retractationOrderLabel } from "@/modules/retractations/utils/retractation-order-label";
import { PageHeader } from "@/shared/components/page-header";

const RetractationDialogs = dynamic(() =>
	import("@/modules/retractations/components/admin/retractation-dialogs").then((mod) => {
		function Dialogs() {
			return (
				<>
					<mod.MarkReturnReceivedDialog />
					<mod.RefundRetractationDialog />
					<mod.RejectRetractationDialog />
				</>
			);
		}
		return Dialogs;
	}),
);

export const metadata: Metadata = {
	title: "Détail rétractation - Administration",
};

export default async function AdminRetractationDetailPage({
	params,
}: {
	params: Promise<{ retractationId: string }>;
}) {
	await assertAdminPage();

	const { retractationId } = await params;
	const retractation = await getRetractationById(retractationId);
	if (!retractation) notFound();

	return (
		<>
			<RetractationDialogs />
			<PageHeader
				variant="compact"
				title={`Rétractation — commande ${retractationOrderLabel(retractation.order)}`}
			/>
			<RetractationDetail retractation={retractation} />
		</>
	);
}
