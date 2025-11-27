import type { GetOrdersParams } from "@/modules/orders/types/orders.types";
import type { OrdersSearchParams } from "../_types/search-params";
import { getFirstParam } from "@/shared/utils/params";

type OrderFilters = NonNullable<GetOrdersParams["filters"]>;

export const parseFilters = (
	params: OrdersSearchParams
): GetOrdersParams["filters"] => {
	let status: OrderFilters["status"] = undefined;
	let paymentStatus: OrderFilters["paymentStatus"] = undefined;
	let totalMin: number | undefined = undefined;
	let totalMax: number | undefined = undefined;
	let createdAfter: Date | undefined = undefined;
	let createdBefore: Date | undefined = undefined;
	let showDeleted: boolean | undefined = undefined;

	Object.entries(params).forEach(([key, value]) => {
		if (key.startsWith("filter_")) {
			const filterKey = key.replace("filter_", "");
			const filterValue = getFirstParam(value);

			if (filterValue) {
				switch (filterKey) {
					case "status":
						status = filterValue as OrderFilters["status"];
						break;
					case "paymentStatus":
						paymentStatus =
							filterValue as OrderFilters["paymentStatus"];
						break;
					case "totalMin":
						totalMin = Number(filterValue) * 100; // Convert euros to cents
						break;
					case "totalMax":
						totalMax = Number(filterValue) * 100;
						break;
					case "createdAfter":
						createdAfter = new Date(filterValue);
						break;
					case "createdBefore":
						createdBefore = new Date(filterValue);
						break;
					case "showDeleted":
						showDeleted = filterValue === "true";
						break;
				}
			}
		}
	});

	return {
		status,
		paymentStatus,
		totalMin,
		totalMax,
		createdAfter,
		createdBefore,
		showDeleted,
	};
};
