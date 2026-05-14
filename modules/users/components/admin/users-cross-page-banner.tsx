"use client";

import { AdminCrossPageBanner } from "@/shared/components/admin/admin-cross-page-banner";

import { getFilteredUserIds } from "../../actions/admin/get-filtered-user-ids";
import { BULK_USER_ACTION_LIMIT } from "../../constants/user.constants";
import type { GetUsersParams, UserFilters } from "../../types/user.types";

interface UsersCrossPageBannerProps {
	totalCount: number;
	filterParams: {
		search?: string;
		sortBy?: GetUsersParams["sortBy"];
		sortOrder?: GetUsersParams["sortOrder"];
		filters?: UserFilters;
	};
	className?: string;
}

export function UsersCrossPageBanner({
	totalCount,
	filterParams,
	className,
}: UsersCrossPageBannerProps) {
	const params = {
		search: filterParams.search,
		sortBy: filterParams.sortBy ?? "createdAt",
		sortOrder: filterParams.sortOrder ?? "desc",
		filters: filterParams.filters ?? {},
	} as Pick<GetUsersParams, "search" | "sortBy" | "sortOrder" | "filters">;
	return (
		<AdminCrossPageBanner
			totalCount={totalCount}
			filterParams={params}
			getFilteredIds={getFilteredUserIds}
			cap={BULK_USER_ACTION_LIMIT}
			itemLabel={{ singular: "client", plural: "clients" }}
			className={className}
		/>
	);
}
