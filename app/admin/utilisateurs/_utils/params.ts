import { Role } from "@/app/generated/prisma";
import type { userFiltersSchema } from "@/modules/users/data/get-users";
import type { z } from "zod";
import type { CustomersSearchParams } from "../page";
import { getFirstParam } from "@/shared/utils/params";

type UserFilters = z.infer<typeof userFiltersSchema>;

export const parseFilters = (
	params: CustomersSearchParams
): UserFilters => {
	const filters: UserFilters = {};

	Object.entries(params).forEach(([key, value]) => {
		if (key.startsWith("filter_")) {
			const filterKey = key.replace("filter_", "");
			const filterValue = getFirstParam(value);

			if (filterValue) {
				// Enum field (Role)
				if (filterKey === "role") {
					if (filterValue === Role.USER || filterValue === Role.ADMIN) {
						filters.role = filterValue;
					}
				}
				// Boolean fields
				else if (filterKey === "emailVerified") {
					filters.emailVerified = filterValue === "true";
				}
				else if (filterKey === "hasOrders") {
					filters.hasOrders = filterValue === "true";
				}
				else if (filterKey === "hasSessions") {
					filters.hasSessions = filterValue === "true";
				}
				else if (filterKey === "hasStripeCustomer") {
					filters.hasStripeCustomer = filterValue === "true";
				}
				else if (filterKey === "hasImage") {
					filters.hasImage = filterValue === "true";
				}
				// Date fields
				else if (filterKey === "createdAfter" || filterKey === "createdBefore") {
					const date = new Date(filterValue);
					if (!isNaN(date.getTime())) {
						filters[filterKey] = date;
					}
				}
				else if (filterKey === "updatedAfter" || filterKey === "updatedBefore") {
					const date = new Date(filterValue);
					if (!isNaN(date.getTime())) {
						filters[filterKey] = date;
					}
				}
				// String fields
				else if (filterKey === "name" || filterKey === "email") {
					filters[filterKey] = filterValue;
				}
				// Number fields
				else if (filterKey === "minOrderCount") {
					const num = parseInt(filterValue, 10);
					if (!isNaN(num)) {
						filters.minOrderCount = num;
					}
				}
			}
		}
	});

	return filters;
};
