import { InfoIcon } from "@phosphor-icons/react/ssr";

import type { ColorDetailReturn } from "@/modules/colors/data/get-color";
import { CopyButton } from "@/shared/components/copy-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

interface ColorDetailInfoCardProps {
	color: ColorDetailReturn;
}

export function ColorDetailInfoCard({ color }: ColorDetailInfoCardProps) {
	const hex = color.hex?.toUpperCase() ?? null;

	return (
		<Card style={{ viewTransitionName: "color-edit-info" }}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<InfoIcon className="size-5" aria-hidden="true" />
					Informations
				</CardTitle>
			</CardHeader>
			<CardContent>
				<dl className="grid gap-3 text-sm">
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Nom</dt>
						<dd className="text-foreground/80">{color.name}</dd>
					</div>
					{hex ? (
						<div className="flex items-start justify-between gap-3">
							<dt className="text-muted-foreground shrink-0 pt-1.5">Hex</dt>
							<dd className="flex min-w-0 items-start gap-1">
								<span className="text-foreground/80 pt-1.5 font-mono text-xs">{hex}</span>
								<CopyButton
									text={hex}
									label="Code hex"
									className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
								/>
							</dd>
						</div>
					) : null}
				</dl>
			</CardContent>
		</Card>
	);
}
