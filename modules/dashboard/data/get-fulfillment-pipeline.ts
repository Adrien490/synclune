import { FulfillmentStatus, PaymentStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";

import type { FulfillmentPipeline } from "../types/dashboard.types";

export type { FulfillmentPipeline } from "../types/dashboard.types";

const LATE_SHIPMENT_DAYS = 5;

/**
 * Fetches fulfillment pipeline data: order counts by fulfillment status + late shipments
 */
export async function fetchFulfillmentPipeline(): Promise<FulfillmentPipeline> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.FULFILLMENT);

	const lateCutoff = new Date();
	lateCutoff.setDate(lateCutoff.getDate() - LATE_SHIPMENT_DAYS);

	const [statusCounts, lateShipments] = await Promise.all([
		prisma.order.groupBy({
			by: ["fulfillmentStatus"],
			where: {
				paymentStatus: PaymentStatus.PAID,
				...notDeleted,
			},
			_count: true,
		}),
		prisma.order.count({
			where: {
				paymentStatus: PaymentStatus.PAID,
				fulfillmentStatus: {
					in: [FulfillmentStatus.UNFULFILLED, FulfillmentStatus.PROCESSING],
				},
				paidAt: { lt: lateCutoff },
				...notDeleted,
			},
		}),
	]);

	const countByStatus = new Map(statusCounts.map((row) => [row.fulfillmentStatus, row._count]));

	return {
		unfulfilled: countByStatus.get(FulfillmentStatus.UNFULFILLED) ?? 0,
		processing: countByStatus.get(FulfillmentStatus.PROCESSING) ?? 0,
		shipped: countByStatus.get(FulfillmentStatus.SHIPPED) ?? 0,
		delivered: countByStatus.get(FulfillmentStatus.DELIVERED) ?? 0,
		returned: countByStatus.get(FulfillmentStatus.RETURNED) ?? 0,
		lateShipments,
	};
}
