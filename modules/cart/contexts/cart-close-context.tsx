"use client";

import { createContext, useContext } from "react";

export const CartCloseContext = createContext<(() => void) | null>(null);

export function useCartClose() {
	return useContext(CartCloseContext);
}
