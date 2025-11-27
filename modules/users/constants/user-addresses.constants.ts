import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// SELECT DEFINITION - USER ADDRESSES
// ============================================================================

export const GET_USER_ADDRESSES_DEFAULT_SELECT = {
	id: true,
	userId: true,
	firstName: true,
	lastName: true,
	address1: true,
	address2: true,
	postalCode: true,
	city: true,
	country: true,
	phone: true,
	isDefault: true,
	createdAt: true,
	updatedAt: true,
} as const satisfies Prisma.AddressSelect;

// ============================================================================
// CACHE SETTINGS
// ============================================================================

export const GET_USER_ADDRESSES_DEFAULT_CACHE = {
	revalidate: 60,
	stale: 120,
	expire: 300,
} as const;
