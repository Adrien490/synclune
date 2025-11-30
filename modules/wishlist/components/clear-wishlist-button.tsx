"use client";

import { Button } from "@/shared/components/ui/button"
import { useAlertDialogStore } from "@/shared/providers/alert-dialog-store-provider"
import { Trash2 } from 'lucide-react'

export const CLEAR_WISHLIST_DIALOG_ID = "clear-wishlist"

interface ClearWishlistButtonProps {
	itemCount: number
}

/**
 * Bouton pour vider la wishlist - Client Component
 *
 * Pattern:
 * - Ouvre AlertDialog de confirmation
 * - AlertDialog contient le Server Action
 * - Cache auto-invalidé par updateTags()
 */
export function ClearWishlistButton({ itemCount }: ClearWishlistButtonProps) {
	const open = useAlertDialogStore((state) => state.openAlertDialog)

	const handleClick = () => {
		open(CLEAR_WISHLIST_DIALOG_ID, { itemCount })
	}

	return (
		<Button
			onClick={handleClick}
			variant="outline"
			size="sm"
			className="text-xs"
		>
			<Trash2 className="mr-2 h-4 w-4" />
			Vider la wishlist
		</Button>
	)
}
