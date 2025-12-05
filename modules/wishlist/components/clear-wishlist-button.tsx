"use client";

import { Button } from "@/shared/components/ui/button"
import { useAlertDialogStore } from "@/shared/providers/alert-dialog-store-provider"
import { WISHLIST_DIALOG_IDS } from "@/modules/wishlist/constants/dialog-ids"
import { Trash2 } from 'lucide-react'

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
		open(WISHLIST_DIALOG_IDS.CLEAR, { itemCount })
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
