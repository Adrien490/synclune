"use client";

import { createContext, use } from "react";

export const CartCloseContext = createContext<(() => void) | null>(null);

export function useCartClose() {
	return use(CartCloseContext);
}
