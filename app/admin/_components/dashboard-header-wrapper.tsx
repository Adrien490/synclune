import { getSession } from "@/modules/auth/lib/get-current-session";
import { Suspense } from "react";
import { DashboardHeader } from "./dashboard-header";

export function DashboardHeaderWrapper() {
	return (
		<Suspense fallback={<DashboardHeaderSkeleton />}>
			<DashboardHeaderLoader />
		</Suspense>
	);
}

async function DashboardHeaderLoader() {
	const session = await getSession();

	const user = session?.user
		? {
				name: session.user.name,
				email: session.user.email,
				avatar: session.user.image ?? undefined,
			}
		: undefined;

	return <DashboardHeader user={user} />;
}

function DashboardHeaderSkeleton() {
	return (
		<header
			className="border-border relative hidden h-14 shrink-0 items-center justify-between gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:flex md:h-16"
			role="banner"
			aria-label="En-tête du tableau de bord"
		/>
	);
}
