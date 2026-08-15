"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { useDialog } from "@/shared/providers/overlay-store-provider";
import { useSheet } from "@/shared/providers/overlay-store-provider";

import type { GetCartReturn } from "../types/cart.types";
import { VARIANT_SELECTOR_DIALOG_ID } from "./variant-selector-utils";

const CartSheet = dynamic(
	() => import("./cart-sheet").then((mod) => ({ default: mod.CartSheet })),
	{ ssr: false, loading: () => null },
);

const VariantSelectorDialog = dynamic(
	() => import("./variant-selector-dialog").then((mod) => ({ default: mod.VariantSelectorDialog })),
	{ ssr: false, loading: () => null },
);

interface CartAndVariantLazyProps {
	cart: GetCartReturn;
	recommendations?: React.ReactNode;
	isStoreClosed?: boolean;
	storeClosureMessage?: string | null;
}

/**
 * Lazy gate for the cart sheet and VARIANT selector dialog.
 *
 * Both chunks (~60-120 KiB) only load after the user first opens them —
 * via the cart trigger / cart icon / VARIANT "add to cart" flow. Once mounted,
 * components stay mounted to avoid re-fetching the chunk on subsequent opens.
 *
 * The recommendations RSC is passed as a slot so the cart sheet can render
 * it inside the sheet body once mounted (Suspense streams it independently).
 *
 * `*HasOpened` flips during render (no effect) once the store becomes open.
 * React docs: storing information from previous renders.
 */
export function CartAndVariantLazy({
	cart,
	recommendations,
	isStoreClosed = false,
	storeClosureMessage = null,
}: CartAndVariantLazyProps) {
	const cartOpen = useSheet("cart").isOpen;
	const variantOpen = useDialog(VARIANT_SELECTOR_DIALOG_ID).isOpen;

	const [cartHasOpened, setCartHasOpened] = useState(false);
	const [variantHasOpened, setVariantHasOpened] = useState(false);

	if (cartOpen && !cartHasOpened) setCartHasOpened(true);
	if (variantOpen && !variantHasOpened) setVariantHasOpened(true);

	return (
		<>
			{cartHasOpened && (
				<CartSheet key="cart-sheet" cart={cart} recommendations={recommendations} />
			)}
			{variantHasOpened && (
				<VariantSelectorDialog
					key="variant-selector"
					cart={cart}
					isStoreClosed={isStoreClosed}
					storeClosureMessage={storeClosureMessage}
				/>
			)}
		</>
	);
}
