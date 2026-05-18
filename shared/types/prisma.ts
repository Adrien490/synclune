import { type prisma } from "@/shared/lib/prisma";

export type PrismaTransaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export {
	Role,
	AccountStatus,
	ProductStatus,
	CollectionStatus,
	MediaType,
	ReviewStatus,
	HistorySource,
	CartFulfillmentType,
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
	OrderAction,
	InvoiceStatus,
	PaymentMethod,
	RefundReason,
	RefundStatus,
	DisputeStatus,
	DisputeReason,
	DiscountType,
	WebhookEventStatus,
} from "@/app/generated/prisma/enums";

export { Prisma } from "@/app/generated/prisma/client";
export type { PrismaClient } from "@/app/generated/prisma/client";
