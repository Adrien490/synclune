import { Prisma } from "@/app/generated/prisma/client";
import { PaginationInfo } from "@/shared/lib/pagination";
import { z } from "zod";
import { GET_USER_ORDERS_SELECT } from "../constants/user-orders.constants";
import { getUserOrdersSchema } from "../schemas/user-orders.schemas";

export type UserOrder = Prisma.OrderGetPayload<{ select: typeof GET_USER_ORDERS_SELECT }>;

export type GetUserOrdersReturn = {
	orders: UserOrder[];
	pagination: PaginationInfo;
};

export type GetUserOrdersParams = z.infer<typeof getUserOrdersSchema>;
export type GetUserOrdersInput = z.input<typeof getUserOrdersSchema>;
