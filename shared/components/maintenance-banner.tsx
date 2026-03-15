import { Construction } from "lucide-react";

interface MaintenanceBannerProps {
	closureMessage: string | null;
}

export function MaintenanceBanner({ closureMessage }: MaintenanceBannerProps) {
	return (
		<div
			role="status"
			className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950"
		>
			<div className="mx-auto flex items-center justify-center gap-2">
				<Construction className="size-4 shrink-0" aria-hidden="true" />
				<span>
					Mode maintenance — La boutique est fermée pour les visiteurs
					{closureMessage && <span className="ml-2 hidden md:inline">— {closureMessage}</span>}
				</span>
			</div>
		</div>
	);
}
