import { type Prisma } from "@/app/generated/prisma/client";
import { type z } from "zod";
import { type PaginationInfo } from "@/shared/lib/pagination";
import { type GET_ORDER_SELECT, type GET_ORDERS_SELECT } from "../constants/order.constants";
import {
	type getOrderSchema,
	type getOrdersSchema,
	type orderFiltersSchema,
} from "../schemas/order.schemas";

// ============================================================================
// TYPES - SINGLE ORDER
// ============================================================================

export type GetOrderParams = z.infer<typeof getOrderSchema>;

export type GetOrderReturn = Prisma.OrderGetPayload<{
	select: typeof GET_ORDER_SELECT;
}>;

export interface FetchOrderContext {
	admin: boolean;
	userId?: string;
}

// ============================================================================
// TYPES - ORDER LIST
// ============================================================================

export type OrderFilters = z.infer<typeof orderFiltersSchema>;

export type GetOrdersParams = z.infer<typeof getOrdersSchema>;

export type GetOrdersReturn = {
	orders: Array<Prisma.OrderGetPayload<{ select: typeof GET_ORDERS_SELECT }>>;
	pagination: PaginationInfo;
	totalCount: number;
};

// ============================================================================
// TYPES - SHIPPING
// ============================================================================

import type { ShippingCountry } from "@/shared/constants/countries";

/** Transporteur de livraison */
type ShippingCarrier = "standard";

/** Tarif de livraison */
export interface ShippingRate {
	/** Montant en centimes (ex: 600 = 6.00€) */
	amount: number;
	/** Nom affiché au client */
	displayName: string;
	/** Délai de livraison estimé (ex: "2-4 jours ouvrés") */
	estimatedDays: string;
	/** Code du transporteur */
	carrier: ShippingCarrier;
	/** Pays couverts par ce tarif */
	countries: readonly string[];
}

/** Pays où la livraison est possible */
export type AllowedShippingCountry = ShippingCountry;

// ============================================================================
// TYPES - ORDER STATUS VALIDATION (from services/)
// ============================================================================

import {
	type OrderStatus,
	type PaymentStatus,
	type FulfillmentStatus,
} from "@/app/generated/prisma/client";

export interface OrderForShipValidation {
	status: OrderStatus;
	paymentStatus: PaymentStatus;
}

export type ShipValidationResult = { canShip: true } | { canShip: false; reason: ShipBlockReason };

type ShipBlockReason = "already_shipped" | "cancelled" | "unpaid" | "not_processing";

export interface OrderStateInput {
	status: OrderStatus;
	paymentStatus: PaymentStatus;
	fulfillmentStatus?: FulfillmentStatus | null;
	trackingNumber?: string | null;
}

export interface OrderPermissions {
	canRefund: boolean;
	canUpdateTracking: boolean;
	canMarkAsShipped: boolean;
	canMarkAsDelivered: boolean;
	canMarkAsProcessing: boolean;
	canMarkAsPaid: boolean;
	canCancel: boolean;
	canRevertToProcessing: boolean;
	canMarkAsReturned: boolean;
}

// Validation result types for status transition functions
type DeliveryBlockReason = "already_delivered" | "not_shipped";
export type DeliveryValidationResult =
	| { canDeliver: true }
	| { canDeliver: false; reason: DeliveryBlockReason };

type ReturnBlockReason = "already_returned" | "not_delivered";
export type ReturnValidationResult =
	| { canReturn: true }
	| { canReturn: false; reason: ReturnBlockReason };

type ProcessingBlockReason = "already_processing" | "not_pending" | "cancelled" | "unpaid";
export type ProcessingValidationResult =
	| { canProcess: true }
	| { canProcess: false; reason: ProcessingBlockReason };

type RevertBlockReason = "not_shipped";
export type RevertValidationResult =
	| { canRevert: true }
	| { canRevert: false; reason: RevertBlockReason };
