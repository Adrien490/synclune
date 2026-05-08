import { Construction } from "lucide-react";
import Link from "next/link";

interface MaintenanceBannerProps {
	closureMessage: string | null;
}

/**
 * Bottom banner shown to admins when the store is closed.
 */
export function MaintenanceBanner({ closureMessage }: MaintenanceBannerProps) {
	return (
		<div
			role="status"
			className="fixed inset-x-0 bottom-0 z-50 border-t border-amber-600/30 bg-amber-500/95 px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] text-center text-sm font-medium text-amber-950 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] backdrop-blur-md max-md:bottom-[calc(var(--bottom-bar-height,0px)+env(safe-area-inset-bottom,0px))] max-md:pb-2.5"
		>
			<div className="mx-auto flex items-center justify-center gap-2">
				<Construction className="size-4 shrink-0" aria-hidden="true" />
				<span>
					<span className="md:hidden">Boutique fermée</span>
					<span className="hidden md:inline">
						Mode maintenance : la boutique est fermée pour les visiteurs
					</span>
					{closureMessage && <span className="ml-1 hidden lg:inline">: {closureMessage}</span>}
				</span>
				<Link
					href="/admin/configuration/boutique"
					className="ml-1 shrink-0 rounded-full bg-amber-950/10 px-2.5 py-0.5 text-xs font-semibold transition-colors hover:bg-amber-950/20"
				>
					Gérer
				</Link>
			</div>
		</div>
	);
}
