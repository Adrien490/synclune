"use client";

import { Button } from "@/shared/components/ui/button"
import { useAlertDialogStore } from "@/shared/providers/alert-dialog-store-provider"
import { WISHLIST_DIALOG_IDS } from "@/modules/wishlist/constants/dialog-ids"
import { Trash2 } from 'lucide-react'
import { cn } from "@/shared/utils/cn"

interface ClearWishlistButtonProps {
	itemCount: number
	iconOnly?: boolean
	className?: string
}

/**
 * Bouton pour vider la wishlist - Client Component
 *
 * Pattern:
 * - Ouvre AlertDialog de confirmation
 * - AlertDialog contient le Server Action
 * - Cache auto-invalidé par updateTags()
 *
 * @param iconOnly - Affiche uniquement l'icône (pour mobile)
 */
export function ClearWishlistButton({ itemCount, iconOnly, className }: ClearWishlistButtonProps) {
	const open = useAlertDialogStore((state) => state.openAlertDialog)

	const handleClick = () => {
		open(WISHLIST_DIALOG_IDS.CLEAR, { itemCount })
	}

	if (iconOnly) {
		return (
			<Button
				onClick={handleClick}
				variant="ghost"
				size="icon"
				className={cn("size-11", className)}
				aria-label={`Vider la wishlist (${itemCount} article${itemCount > 1 ? "s" : ""})`}
			>
				<Trash2 className="size-5" />
			</Button>
		)
	}

	return (
		<Button
			onClick={handleClick}
			variant="outline"
			size="sm"
			className={cn("text-xs", className)}
		>
			<Trash2 className="mr-2 h-4 w-4" />
			Vider la wishlist
		</Button>
	)
}
