import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { UserDetailPage } from "@/modules/users/components/admin/user-detail-page";
import { getUserDetailAdmin } from "@/modules/users/data/get-user-detail-admin";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";

interface UserDetailRouteProps {
	params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: UserDetailRouteProps): Promise<Metadata> {
	const { id } = await params;
	const data = await getUserDetailAdmin(id);

	if (!data) {
		return { title: "Client introuvable - Administration" };
	}

	const displayName = data.user.name ?? data.user.email;
	return {
		title: `${displayName} - Administration`,
		description: `Détail du compte client ${displayName}`,
	};
}

export default async function UserDetailRoute({ params }: UserDetailRouteProps) {
	const { id } = await params;
	const data = await getUserDetailAdmin(id);

	if (!data) {
		notFound();
	}

	const displayName = data.user.name ?? data.user.email;

	return (
		<div className="space-y-6">
			<Breadcrumb className="hidden md:flex">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/clients">Clients</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{displayName}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<UserDetailPage
				user={data.user}
				orderCount={data.orderCount}
				activeSessions={data.activeSessions}
			/>
		</div>
	);
}
