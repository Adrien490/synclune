import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";
import { PaginationInfo } from "@/shared/components/cursor-pagination/pagination";
import {
	GET_ORDER_SELECT,
	GET_ORDERS_SELECT,
	GET_ORDERS_SORT_FIELDS,
} from "../constants/order.constants";
import {
	getOrderSchema,
	getOrdersSchema,
	orderFiltersSchema,
	deleteOrderSchema,
	bulkDeleteOrdersSchema,
	cancelOrderSchema,
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

export type OrderItem = GetOrderReturn["items"][0];

// ============================================================================
// TYPES - ORDER LIST
// ============================================================================

export type OrderFilters = z.infer<typeof orderFiltersSchema>;

export type OrderSortField = (typeof GET_ORDERS_SORT_FIELDS)[number];

export type GetOrdersParams = z.infer<typeof getOrdersSchema>;

export type GetOrdersReturn = {
	orders: Array<
		Prisma.OrderGetPayload<{ select: typeof GET_ORDERS_SELECT }>
	>;
	pagination: PaginationInfo;
};

export type Order = Prisma.OrderGetPayload<{
	select: typeof GET_ORDERS_SELECT;
}>;

// ============================================================================
// TYPES - MUTATIONS
// ============================================================================

export type DeleteOrderInput = z.infer<typeof deleteOrderSchema>;
export type BulkDeleteOrdersInput = z.infer<typeof bulkDeleteOrdersSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

// ============================================================================
// TYPES - SHIPPING
// ============================================================================

import type { ShippingCountry } from "@/shared/constants/countries";

/** Transporteur de livraison */
export type ShippingCarrier = "standard" | "express";

/** Tarif de livraison */
export interface ShippingRate {
	/** Montant en centimes (ex: 600 = 6.00€) */
	amount: number;
	/** Nom affiché au client */
	displayName: string;
	/** Code du transporteur */
	carrier: ShippingCarrier;
	/** Délai minimum en jours ouvrés */
	minDays: number;
	/** Délai maximum en jours ouvrés */
	maxDays: number;
	/** Pays couverts par ce tarif */
	countries: readonly string[];
}

/** Pays où la livraison est possible */
export type AllowedShippingCountry = ShippingCountry

// ============================================================================
// TYPES - ORDER STATUS VALIDATION (from services/)
// ============================================================================

import { OrderStatus, PaymentStatus, FulfillmentStatus } from "@/app/generated/prisma/client"

export interface OrderForShipValidation {
	status: OrderStatus
	paymentStatus: PaymentStatus
}

export type ShipValidationResult =
	| { canShip: true }
	| { canShip: false; reason: ShipBlockReason }

export type ShipBlockReason =
	| "already_shipped"
	| "cancelled"
	| "unpaid"

export interface OrderStateInput {
	status: OrderStatus
	paymentStatus: PaymentStatus
	fulfillmentStatus?: FulfillmentStatus | null
	trackingNumber?: string | null
}

export interface OrderPermissions {
	canRefund: boolean
	canUpdateTracking: boolean
	canMarkAsShipped: boolean
	canMarkAsDelivered: boolean
	canMarkAsProcessing: boolean
	canMarkAsPaid: boolean
	canCancel: boolean
	canRevertToProcessing: boolean
}

// ============================================================================
// TYPES - ORDER AUDIT (from utils/)
// ============================================================================

export interface CreateOrderAuditParams {
	orderId: string
	action: string
	details?: Record<string, unknown>
	userId?: string
}

// ============================================================================
// TYPES - ORDER NOTES (from data/)
// ============================================================================

export interface OrderNoteItem {
	id: string
	content: string
	createdAt: Date
	createdBy: {
		id: string
		name: string | null
	}
}
