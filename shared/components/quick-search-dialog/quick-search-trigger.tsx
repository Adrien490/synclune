"use client"

import { useEffect } from "react"
import { Search } from "lucide-react"

import { useDialog } from "@/shared/providers/dialog-store-provider"
import { Button } from "@/shared/components/ui/button"
import { Kbd } from "@/shared/components/ui/kbd"
import { cn } from "@/shared/utils/cn"
import { QUICK_SEARCH_DIALOG_ID } from "./constants"

interface QuickSearchTriggerProps {
	className?: string
}

/**
 * Self-sufficient trigger button for the quick search dialog.
 * Handles Cmd+K / Ctrl+K keyboard shortcut.
 */
export function QuickSearchTrigger({ className }: QuickSearchTriggerProps) {
	const { open } = useDialog(QUICK_SEARCH_DIALOG_ID)

	// Cmd+K / Ctrl+K global shortcut
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault()
				open()
			}
		}
		document.addEventListener("keydown", handleKeyDown)
		return () => document.removeEventListener("keydown", handleKeyDown)
	}, [open])

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={() => open()}
			className={cn("size-11 relative", className)}
			aria-label="Rechercher (⌘K)"
		>
			<Search className="size-5" />
			<Kbd className="hidden can-hover:inline-flex absolute -bottom-1 -right-1.5 h-4 min-w-4 text-[9px] px-0.5 opacity-70">
				⌘K
			</Kbd>
		</Button>
	)
}
