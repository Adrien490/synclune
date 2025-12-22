"use client"

import { useEffect } from "react"
import { Search } from "lucide-react"

import { useDialog } from "@/shared/providers/dialog-store-provider"
import { Button } from "@/shared/components/ui/button"
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
			className={cn("size-11 group-data-[scrolled=true]:sm:size-10 transition-all duration-300 ease-out", className)}
			aria-label="Ouvrir la recherche rapide"
		>
			<Search className="size-5" />
		</Button>
	)
}
