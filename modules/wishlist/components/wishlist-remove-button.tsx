"use client";

import { Button } from "@/shared/components/ui/button"
import { useAlertDialogStore } from "@/shared/providers/alert-dialog-store-provider"
import { X } from 'lucide-react'
import { REMOVE_WISHLIST_ITEM_DIALOG_ID } from './remove-wishlist-item-alert-dialog'

interface WishlistRemoveButtonProps {
	skuId: string
	itemId: string
	itemName: string
}

/**
 * Bouton supprimer de la wishlist - Client Component
 *
 * Pattern:
 * - Ouvre AlertDialog de confirmation
 * - AlertDialog contient le Server Action
 * - Cache auto-invalidé par updateTags()
 * - Source de vérité unique (DB) pour éviter désynchronisations
 */
export function WishlistRemoveButton({
	skuId,
	itemId,
	itemName,
}: WishlistRemoveButtonProps) {
	const openAlertDialog = useAlertDialogStore((state) => state.openAlertDialog)

	const handleRemove = () => {
		openAlertDialog(REMOVE_WISHLIST_ITEM_DIALOG_ID, {
			skuId,
			itemId,
			itemName,
		})
	}

	return (
		<Button
			onClick={handleRemove}
			variant="destructive"
			size="icon"
			className="h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
			aria-label="Retirer de la wishlist"
		>
			<X size={16} />
		</Button>
	)
}
