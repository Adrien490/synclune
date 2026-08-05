"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useSheet } from "@/shared/providers/sheet-store-provider";

import type { GetCartReturn } from "../types/cart.types";
import { SKU_SELECTOR_DIALOG_ID } from "./sku-selector-utils";

const CartSheet = dynamic(
	() => import("./cart-sheet").then((mod) => ({ default: mod.CartSheet })),
	{ ssr: false, loading: () => null },
);

const SkuSelectorDialog = dynamic(
	() => import("./sku-selector-dialog").then((mod) => ({ default: mod.SkuSelectorDialog })),
	{ ssr: false, loading: () => null },
);

interface CartAndSkuLazyProps {
	cart: GetCartReturn;
	recommendations?: React.ReactNode;
	isStoreClosed?: boolean;
	storeClosureMessage?: string | null;
}

/**
 * Lazy gate for the cart sheet and SKU selector dialog.
 *
 * Both chunks (~60-120 KiB) only load after the user first opens them —
 * via the cart trigger / cart icon / SKU "add to cart" flow. Once mounted,
 * components stay mounted to avoid re-fetching the chunk on subsequent opens.
 *
 * The recommendations RSC is passed as a slot so the cart sheet can render
 * it inside the sheet body once mounted (Suspense streams it independently).
 *
 * `*HasOpened` flips during render (no effect) once the store becomes open.
 * React docs: storing information from previous renders.
 */
export function CartAndSkuLazy({
	cart,
	recommendations,
	isStoreClosed = false,
	storeClosureMessage = null,
}: CartAndSkuLazyProps) {
	const cartOpen = useSheet("cart").isOpen;
	const skuOpen = useDialog(SKU_SELECTOR_DIALOG_ID).isOpen;

	const [cartHasOpened, setCartHasOpened] = useState(false);
	const [skuHasOpened, setSkuHasOpened] = useState(false);

	if (cartOpen && !cartHasOpened) setCartHasOpened(true);
	if (skuOpen && !skuHasOpened) setSkuHasOpened(true);

	return (
		<>
			{cartHasOpened && (
				<CartSheet key="cart-sheet" cart={cart} recommendations={recommendations} />
			)}
			{skuHasOpened && (
				<SkuSelectorDialog
					key="sku-selector"
					cart={cart}
					isStoreClosed={isStoreClosed}
					storeClosureMessage={storeClosureMessage}
				/>
			)}
		</>
	);
}
