"use client"

import { Search } from "lucide-react"
import { useEffect, useState } from "react"

import { useDialog } from "@/shared/providers/dialog-store-provider"
import { Button } from "@/shared/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip"
import { cn } from "@/shared/utils/cn"
import { QUICK_SEARCH_DIALOG_ID } from "./constants"

interface QuickSearchTriggerProps {
	className?: string
}

/**
 * Trigger button for the quick search dialog.
 * Also registers a global Cmd+K / Ctrl+K shortcut to open the dialog.
 */
export function QuickSearchTrigger({ className }: QuickSearchTriggerProps) {
	const { open, isOpen } = useDialog(QUICK_SEARCH_DIALOG_ID)
	const [isMac, setIsMac] = useState(true)

	useEffect(() => {
		setIsMac(
			(navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData?.platform === "macOS"
			|| navigator.userAgent.includes("Mac")
		)
	}, [])

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault()
				if (!isOpen) open()
			}
		}

		document.addEventListener("keydown", handleKeyDown)
		return () => document.removeEventListener("keydown", handleKeyDown)
	}, [open, isOpen])

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => open()}
					className={cn(
						"size-11 transition-all duration-300 ease-out",
						className
					)}
					aria-label="Ouvrir la recherche rapide"
				>
					<Search className="size-5" />
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				<span className="flex items-center gap-1.5">
					Rechercher
					<kbd className="pointer-events-none inline-flex h-5 items-center gap-0.5 rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
						<span className="text-xs">{isMac ? "\u2318" : "Ctrl"}</span>K
					</kbd>
				</span>
			</TooltipContent>
		</Tooltip>
	)
}
