import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	OrderStatus: {
		PENDING: "PENDING",
		CONFIRMED: "CONFIRMED",
		SHIPPED: "SHIPPED",
		DELIVERED: "DELIVERED",
		CANCELLED: "CANCELLED",
	},
	PaymentStatus: {
		PENDING: "PENDING",
		PAID: "PAID",
		FAILED: "FAILED",
		EXPIRED: "EXPIRED",
		REFUNDED: "REFUNDED",
	},
}));

import {
	transformRecentOrder,
	transformRecentOrders,
} from "../recent-orders-transformer.service";
import {
	OrderStatus,
	PaymentStatus,
} from "@/app/generated/prisma/client";
import type { OrderForTransform } from "../../types/dashboard.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOrder(overrides: Partial<OrderForTransform> = {}): OrderForTransform {
	return {
		id: "order-1",
		orderNumber: "SYN-20260001",
		createdAt: new Date("2026-01-15T10:00:00Z"),
		status: OrderStatus.CONFIRMED,
		paymentStatus: PaymentStatus.PAID,
		total: 4500,
		user: { name: "Alice", email: "alice@test.com" },
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// transformRecentOrder
// ---------------------------------------------------------------------------

describe("transformRecentOrder", () => {
	it("should transform a complete order with user data", () => {
		const order = makeOrder();

		const result = transformRecentOrder(order);

		expect(result).toEqual({
			id: "order-1",
			orderNumber: "SYN-20260001",
			createdAt: new Date("2026-01-15T10:00:00Z"),
			status: OrderStatus.CONFIRMED,
			paymentStatus: PaymentStatus.PAID,
			total: 4500,
			customerName: "Alice",
			customerEmail: "alice@test.com",
		});
	});

	it("should default customerName to 'Invité' when user is null", () => {
		const order = makeOrder({ user: null });

		const result = transformRecentOrder(order);

		expect(result.customerName).toBe("Invité");
		expect(result.customerEmail).toBe("");
	});

	it("should default customerName to 'Invité' when user.name is null", () => {
		const order = makeOrder({
			user: { name: null, email: "guest@test.com" },
		});

		const result = transformRecentOrder(order);

		expect(result.customerName).toBe("Invité");
		expect(result.customerEmail).toBe("guest@test.com");
	});

	it("should preserve all order statuses", () => {
		const order = makeOrder({
			status: OrderStatus.SHIPPED,
			paymentStatus: PaymentStatus.REFUNDED,
		});

		const result = transformRecentOrder(order);

		expect(result.status).toBe(OrderStatus.SHIPPED);
		expect(result.paymentStatus).toBe(PaymentStatus.REFUNDED);
	});

	it("should handle zero total", () => {
		const order = makeOrder({ total: 0 });

		const result = transformRecentOrder(order);

		expect(result.total).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// transformRecentOrders
// ---------------------------------------------------------------------------

describe("transformRecentOrders", () => {
	it("should transform multiple orders", () => {
		const orders = [
			makeOrder({ id: "order-1", orderNumber: "SYN-001" }),
			makeOrder({ id: "order-2", orderNumber: "SYN-002", user: null }),
		];

		const result = transformRecentOrders(orders);

		expect(result).toHaveLength(2);
		expect(result[0].id).toBe("order-1");
		expect(result[0].customerName).toBe("Alice");
		expect(result[1].id).toBe("order-2");
		expect(result[1].customerName).toBe("Invité");
	});

	it("should return an empty array for empty input", () => {
		const result = transformRecentOrders([]);

		expect(result).toEqual([]);
	});
});
