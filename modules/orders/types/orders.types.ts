import { Prisma } from "@/app/generated/prisma/client";
import { PaginationInfo } from "@/shared/components/cursor-pagination/pagination";
import { z } from "zod";
import { GET_ORDERS_DEFAULT_SELECT } from "../constants/order.constants";
import { getOrdersSchema } from "../schemas/order.schemas";

export type GetOrdersReturn = {
	orders: Array<
		Prisma.OrderGetPayload<{ select: typeof GET_ORDERS_DEFAULT_SELECT }>
	>;
	pagination: PaginationInfo;
};

export type GetOrdersParams = z.infer<typeof getOrdersSchema>;
