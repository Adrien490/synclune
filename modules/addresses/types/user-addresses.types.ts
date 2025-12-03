import { Prisma } from "@/app/generated/prisma";
import { GET_USER_ADDRESSES_DEFAULT_SELECT } from "../constants/user-addresses.constants";

// ============================================================================
// TYPES - USER ADDRESSES
// ============================================================================

export type GetUserAddressesReturn = Array<
	Prisma.AddressGetPayload<{
		select: typeof GET_USER_ADDRESSES_DEFAULT_SELECT;
	}>
>;

export type UserAddress = GetUserAddressesReturn[number];
