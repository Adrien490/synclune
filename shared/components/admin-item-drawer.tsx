"use client";

import { type ReactNode } from "react";

import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/shared/components/ui/drawer";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/shared/components/ui/sheet";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";

interface AdminItemDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: ReactNode;
	children: ReactNode;
	footer?: ReactNode;
}

/**
 * Panneau latéral de détail d'item administrable.
 *
 * - Mobile (<768px) : Vaul bottom-sheet natif (drag handle, safe-area).
 * - Desktop (≥768px) : Sheet ancré à droite (sticky header/footer, scroll body).
 *
 * Composant controllé par le store de dialogs — mounter 1x par page.
 */
export function AdminItemDrawer({
	open,
	onOpenChange,
	title,
	description,
	children,
	footer,
}: AdminItemDrawerProps) {
	const isMobile = useIsMobile();
	const triggerHaptic = useHaptic();

	const handleOpenChange = (next: boolean) => {
		if (!next) {
			triggerHaptic("selection");
		}
		onOpenChange(next);
	};

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={handleOpenChange}>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>{title}</DrawerTitle>
						{description ? <DrawerDescription>{description}</DrawerDescription> : null}
					</DrawerHeader>
					<DrawerBody className="space-y-5">{children}</DrawerBody>
					{footer ? <DrawerFooter>{footer}</DrawerFooter> : null}
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Sheet direction="right" open={open} onOpenChange={handleOpenChange}>
			<SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px]">
				<SheetHeader className="bg-background sticky top-0 z-10 border-b px-6 py-4">
					<SheetTitle>{title}</SheetTitle>
					{description ? <SheetDescription>{description}</SheetDescription> : null}
				</SheetHeader>
				<div
					data-slot="admin-item-drawer-body"
					className="flex-1 space-y-5 overflow-y-auto px-6 py-4"
				>
					{children}
				</div>
				{footer ? (
					<SheetFooter className="bg-background sticky bottom-0 border-t px-6 py-4">
						{footer}
					</SheetFooter>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
