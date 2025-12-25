"use client"

import { useEffect, useEffectEvent } from "react"
import { Search } from "lucide-react"

import { useDialog } from "@/shared/providers/dialog-store-provider"
import { useIsMac } from "@/shared/hooks/use-platform"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/utils/cn"
import { QUICK_SEARCH_DIALOG_ID } from "./constants"

interface QuickSearchTriggerProps {
	className?: string
	/** Show keyboard shortcut badge (default: true on desktop) */
	showShortcut?: boolean
}

/**
 * Self-sufficient trigger button for the quick search dialog.
 * Handles Cmd+K / Ctrl+K keyboard shortcut.
 */
export function QuickSearchTrigger({ className, showShortcut = true }: QuickSearchTriggerProps) {
	const { open } = useDialog(QUICK_SEARCH_DIALOG_ID)
	const isMac = useIsMac()

	// Effect Event pour gérer le raccourci clavier sans re-registration
	const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
		if ((e.metaKey || e.ctrlKey) && e.key === "k") {
			e.preventDefault()
			open()
		}
	})

	// Cmd+K / Ctrl+K global shortcut
	useEffect(() => {
		document.addEventListener("keydown", onKeyDown)
		return () => document.removeEventListener("keydown", onKeyDown)
	}, [onKeyDown])

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={() => open()}
			className={cn(
				"size-11 group-data-[scrolled=true]:sm:size-10 transition-all duration-300 ease-out relative",
				className
			)}
			aria-label={`Ouvrir la recherche rapide (${isMac ? "⌘" : "Ctrl+"}K)`}
		>
			<Search className="size-5" />
			{showShortcut && (
				<kbd
					className={cn(
						"hidden sm:inline-flex absolute -bottom-0.5 -right-0.5",
						"items-center justify-center",
						"h-4 min-w-[1.25rem] px-1",
						"text-[10px] font-medium leading-none",
						"bg-muted text-muted-foreground",
						"border border-border rounded",
						"pointer-events-none select-none",
						"shadow-sm"
					)}
					aria-hidden="true"
				>
					{isMac ? "⌘K" : "^K"}
				</kbd>
			)}
		</Button>
	)
}
