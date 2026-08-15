import { PaletteIcon } from "@phosphor-icons/react/ssr";

import type { ColorDetailReturn } from "@/modules/colors/data/get-color";
import { CopyButton } from "@/shared/components/copy-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

interface ColorDetailPreviewCardProps {
	color: ColorDetailReturn;
}

export function ColorDetailPreviewCard({ color }: ColorDetailPreviewCardProps) {
	const hex = color.hex?.toUpperCase() ?? null;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<PaletteIcon className="size-5" aria-hidden="true" />
					Aperçu
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col items-center gap-4 py-8">
				<div
					className="border-border size-24 rounded-full border-2 shadow-md sm:size-40"
					style={{ backgroundColor: color.hex ?? undefined }}
					aria-label={`Aperçu de la couleur ${color.name}`}
					role="img"
				/>
				{hex ? (
					<div className="flex items-center gap-1">
						<span className="text-foreground font-mono text-sm">{hex}</span>
						<CopyButton
							text={hex}
							label="Code hex"
							className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
						/>
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}
