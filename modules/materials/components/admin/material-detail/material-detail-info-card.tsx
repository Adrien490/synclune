import { SwatchesIcon } from "@phosphor-icons/react/ssr";

import type { MaterialDetailReturn } from "@/modules/materials/data/get-material";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

interface MaterialDetailInfoCardProps {
	material: MaterialDetailReturn;
}

export function MaterialDetailInfoCard({ material }: MaterialDetailInfoCardProps) {
	return (
		<Card style={{ viewTransitionName: "material-edit-info" }}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<SwatchesIcon className="size-5" aria-hidden="true" />
					Informations
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<dl className="grid gap-3 text-sm">
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Nom</dt>
						<dd className="text-foreground/80">{material.name}</dd>
					</div>
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Variantes actives</dt>
						<dd className="text-foreground/80">{material._count.variants}</dd>
					</div>
				</dl>
			</CardContent>
		</Card>
	);
}
