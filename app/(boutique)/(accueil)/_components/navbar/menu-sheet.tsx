"use client";

import type { CollectionImage } from "@/modules/collections/types/collection.types";
import type { NavbarSessionData } from "@/shared/types/session.types";
import ScrollFade from "@/shared/components/scroll-fade";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/shared/components/ui/sheet";
import type { getMobileNavItems } from "@/shared/constants/navigation";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { Menu } from "lucide-react";
import { MenuSheetFooter } from "./menu-sheet-footer";
import { MenuSheetNav } from "./menu-sheet-nav";

/**
 * navItems (flat list from getMobileNavItems) drives the mobile sheet's link rendering,
 * while productTypes/collections provide hierarchical data for sectioned display.
 * Both are needed because the flat list lacks the grouping structure required by sections.
 */
interface MenuSheetProps {
	navItems: ReturnType<typeof getMobileNavItems>;
	productTypes?: Array<{ slug: string; label: string }>;
	collections?: Array<{
		slug: string;
		label: string;
		images: CollectionImage[];
		createdAt?: Date;
	}>;
	isAdmin?: boolean;
	session?: NavbarSessionData | null;
}

export function MenuSheet({
	navItems,
	productTypes,
	collections,
	isAdmin = false,
	session,
}: MenuSheetProps) {
	const { isOpen, open: openMenu, close: closeMenu } = useDialog("menu-sheet");

	return (
		<Sheet direction="left" open={isOpen} onOpenChange={(open) => (open ? openMenu() : closeMenu())} preventScrollRestoration>
			<SheetTrigger asChild>
				<button
					type="button"
					className="relative -ml-3 inline-flex items-center justify-center size-11 rounded-xl lg:hidden bg-transparent hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-[transform,color,background-color] duration-300 ease-out motion-safe:hover:scale-105 motion-safe:active:scale-95 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
					aria-label="Ouvrir le menu de navigation"
					aria-controls="mobile-menu-synclune"
				>
					<Menu
						size={20}
						className="transition-transform duration-300 motion-safe:group-hover:rotate-6"
						aria-hidden="true"
					/>
				</button>
			</SheetTrigger>

			<SheetContent
				className="w-[min(88vw,340px)] sm:w-80 sm:max-w-md border-r bg-background/95 p-0! flex flex-col"
				id="mobile-menu-synclune"
			>

				{/* Header sr-only */}
				<SheetHeader className="p-0! sr-only">
					<SheetTitle>Menu de navigation</SheetTitle>
					<SheetDescription>
						Menu de navigation de Synclune - Découvrez nos bijoux et collections
					</SheetDescription>
				</SheetHeader>

				{/* Scrollable content */}
				<div className="flex-1 min-h-0">
					<ScrollFade axis="vertical" className="h-full" hideScrollbar={false}>
						<MenuSheetNav
							navItems={navItems}
							productTypes={productTypes}
							collections={collections}
							session={session}
							isOpen={isOpen}
						/>
					</ScrollFade>
				</div>

				<MenuSheetFooter isAdmin={isAdmin} />
			</SheetContent>
		</Sheet>
	);
}
