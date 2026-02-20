"use client";

import { InstagramIcon } from "@/shared/components/icons/instagram-icon";
import { TikTokIcon } from "@/shared/components/icons/tiktok-icon";
import { SheetClose } from "@/shared/components/ui/sheet";
import { BRAND } from "@/shared/constants/brand";
import { ROUTES } from "@/shared/constants/urls";
import { Settings } from "lucide-react";
import Link from "next/link";

interface MenuSheetFooterProps {
	isAdmin: boolean;
}

export function MenuSheetFooter({ isAdmin }: MenuSheetFooterProps) {
	return (
		<footer className="relative z-10 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0 border-t border-border/40">
			{/* Social links and admin */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<a
						href={BRAND.social.instagram.url}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center justify-center size-11 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 transition-all duration-150"
						aria-label="Suivre Synclune sur Instagram (nouvelle fenêtre)"
					>
						<InstagramIcon decorative size={18} />
					</a>
					<a
						href={BRAND.social.tiktok.url}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center justify-center size-11 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 transition-all duration-150"
						aria-label="Suivre Synclune sur TikTok (nouvelle fenêtre)"
					>
						<TikTokIcon decorative size={18} />
					</a>
				</div>
				<div className="flex items-center gap-2">
					{isAdmin && (
						<SheetClose asChild>
							<Link
								href={ROUTES.ADMIN.ROOT}
								className="inline-flex items-center justify-center size-11 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 transition-all duration-150"
								aria-label="Tableau de bord administrateur"
							>
								<Settings size={18} aria-hidden="true" />
							</Link>
						</SheetClose>
					)}
				</div>
			</div>

			{/* Copyright */}
			<p className="text-center text-xs text-muted-foreground mt-3">
				© {new Date().getFullYear()} {BRAND.name}
			</p>
		</footer>
	);
}
