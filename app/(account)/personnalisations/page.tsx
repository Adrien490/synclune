import type { Metadata } from "next";
import { Suspense } from "react";

import { CustomizationRequestList } from "@/modules/customizations/components/customer/customization-request-list";
import { CustomizationRequestListSkeleton } from "@/modules/customizations/components/customer/customization-request-list-skeleton";
import { getUserCustomizationRequests } from "@/modules/customizations/data/get-user-customization-requests";

export const metadata: Metadata = {
	title: "Mes personnalisations",
};

export default function CustomizationsPage() {
	const requestsPromise = getUserCustomizationRequests();

	return (
		<Suspense fallback={<CustomizationRequestListSkeleton />}>
			<CustomizationRequestList requestsPromise={requestsPromise} />
		</Suspense>
	);
}
