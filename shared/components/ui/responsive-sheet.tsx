"use client"

import * as React from "react"
import { useIsMobile } from "@/shared/hooks/use-mobile"
import { cn } from "@/shared/utils/cn"
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "./sheet"
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "./drawer"

type Side = "top" | "right" | "bottom" | "left"

// Context pour partager l'état mobile et la direction avec les sous-composants
type ResponsiveSheetContextValue = {
	isMobile: boolean
	side: Side
}

const ResponsiveSheetContext =
	React.createContext<ResponsiveSheetContextValue | null>(null)

function useResponsiveSheetContext() {
	const context = React.useContext(ResponsiveSheetContext)
	if (!context) {
		throw new Error(
			"Les composants ResponsiveSheet doivent être utilisés dans un ResponsiveSheet"
		)
	}
	return context
}

// Props du composant racine
interface ResponsiveSheetProps {
	children: React.ReactNode
	open?: boolean
	onOpenChange?: (open: boolean) => void
	/** Direction du sheet (défaut: right) */
	side?: Side
	/** Forcer un mode spécifique indépendamment de la taille d'écran */
	forceMode?: "sheet" | "drawer"
}

function ResponsiveSheet({
	children,
	open,
	onOpenChange,
	side = "right",
	forceMode,
}: ResponsiveSheetProps) {
	const isMobileDetected = useIsMobile()
	const isMobile = forceMode ? forceMode === "drawer" : isMobileDetected

	const contextValue = { isMobile, side }

	if (isMobile) {
		return (
			<ResponsiveSheetContext.Provider value={contextValue}>
				<Drawer open={open} onOpenChange={onOpenChange} direction={side}>
					{children}
				</Drawer>
			</ResponsiveSheetContext.Provider>
		)
	}

	return (
		<ResponsiveSheetContext.Provider value={contextValue}>
			<Sheet open={open} onOpenChange={onOpenChange}>
				{children}
			</Sheet>
		</ResponsiveSheetContext.Provider>
	)
}

// Props du contenu
interface ResponsiveSheetContentProps
	extends Omit<React.ComponentProps<typeof SheetContent>, "side"> {
	/** Surcharger la direction pour ce contenu spécifique */
	side?: Side
}

function ResponsiveSheetContent({
	children,
	className,
	side: sideProp,
	...props
}: ResponsiveSheetContentProps) {
	const { isMobile, side: contextSide } = useResponsiveSheetContext()
	const side = sideProp ?? contextSide

	if (isMobile) {
		return (
			<DrawerContent className={cn("flex flex-col", className)} {...props}>
				{children}
			</DrawerContent>
		)
	}

	return (
		<SheetContent side={side} className={className} {...props}>
			{children}
		</SheetContent>
	)
}

// Header
function ResponsiveSheetHeader({
	className,
	...props
}: React.ComponentProps<"div">) {
	const { isMobile } = useResponsiveSheetContext()

	if (isMobile) {
		return <DrawerHeader className={cn("text-left", className)} {...props} />
	}

	return <SheetHeader className={className} {...props} />
}

// Footer
function ResponsiveSheetFooter({
	className,
	...props
}: React.ComponentProps<"div">) {
	const { isMobile } = useResponsiveSheetContext()

	if (isMobile) {
		return <DrawerFooter className={className} {...props} />
	}

	return <SheetFooter className={className} {...props} />
}

// Title
function ResponsiveSheetTitle({
	className,
	...props
}: React.ComponentProps<typeof SheetTitle>) {
	const { isMobile } = useResponsiveSheetContext()

	if (isMobile) {
		return <DrawerTitle className={className} {...props} />
	}

	return <SheetTitle className={className} {...props} />
}

// Description
function ResponsiveSheetDescription({
	className,
	...props
}: React.ComponentProps<typeof SheetDescription>) {
	const { isMobile } = useResponsiveSheetContext()

	if (isMobile) {
		return <DrawerDescription className={className} {...props} />
	}

	return <SheetDescription className={className} {...props} />
}

// Close
function ResponsiveSheetClose(
	props: React.ComponentProps<typeof SheetClose>
) {
	const { isMobile } = useResponsiveSheetContext()

	if (isMobile) {
		return <DrawerClose {...props} />
	}

	return <SheetClose {...props} />
}

// Trigger
function ResponsiveSheetTrigger(
	props: React.ComponentProps<typeof SheetTrigger>
) {
	const { isMobile } = useResponsiveSheetContext()

	if (isMobile) {
		return <DrawerTrigger {...props} />
	}

	return <SheetTrigger {...props} />
}

export {
	ResponsiveSheet,
	ResponsiveSheetClose,
	ResponsiveSheetContent,
	ResponsiveSheetDescription,
	ResponsiveSheetFooter,
	ResponsiveSheetHeader,
	ResponsiveSheetTitle,
	ResponsiveSheetTrigger,
	useResponsiveSheetContext,
}
