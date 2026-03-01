import { type Prisma } from "@/app/generated/prisma/client";
import { type PaginationInfo } from "@/shared/lib/pagination";
import { type z } from "zod";
import { type GET_USER_ORDERS_SELECT } from "../constants/user-orders.constants";
import { type getUserOrdersSchema } from "../schemas/user-orders.schemas";

export type UserOrder = Prisma.OrderGetPayload<{ select: typeof GET_USER_ORDERS_SELECT }>;

export type GetUserOrdersReturn = {
	orders: UserOrder[];
	pagination: PaginationInfo;
};

export type GetUserOrdersParams = z.infer<typeof getUserOrdersSchema>;
export type GetUserOrdersInput = z.input<typeof getUserOrdersSchema>;
