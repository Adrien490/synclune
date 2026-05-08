import { Info } from "lucide-react";

import type { ColorDetailReturn } from "@/modules/colors/data/get-color";
import { CopyButton } from "@/shared/components/copy-button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

interface ColorDetailInfoCardProps {
	color: ColorDetailReturn;
}

export function ColorDetailInfoCard({ color }: ColorDetailInfoCardProps) {
	return (
		<Card style={{ viewTransitionName: "color-edit-info" }}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Info className="size-5" aria-hidden="true" />
					Informations
				</CardTitle>
			</CardHeader>
			<CardContent>
				<dl className="grid gap-3 text-sm">
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Statut</dt>
						<dd>
							<Badge variant={color.isActive ? "default" : "secondary"}>
								{color.isActive ? "Active" : "Inactive"}
							</Badge>
						</dd>
					</div>
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Position</dt>
						<dd className="font-medium">#{color.position}</dd>
					</div>
					<div className="flex items-start justify-between gap-3">
						<dt className="text-muted-foreground shrink-0 pt-1.5">Slug</dt>
						<dd className="flex min-w-0 items-start gap-1">
							<span className="text-foreground/80 pt-1.5 font-mono text-xs break-all">
								{color.slug}
							</span>
							<CopyButton
								text={color.slug}
								label="Slug"
								className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
							/>
						</dd>
					</div>
					<div className="flex items-start justify-between gap-3">
						<dt className="text-muted-foreground shrink-0 pt-1.5">Hex</dt>
						<dd className="flex min-w-0 items-start gap-1">
							<span className="text-foreground/80 pt-1.5 font-mono text-xs">
								{color.hex.toUpperCase()}
							</span>
							<CopyButton
								text={color.hex.toUpperCase()}
								label="Code hex"
								className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
							/>
						</dd>
					</div>
				</dl>

				{!color.isActive ? (
					<p className="border-muted bg-muted/30 text-muted-foreground mt-4 rounded-md border p-3 text-xs">
						Cette couleur est désactivée et ne peut plus être assignée à de nouvelles variantes.
					</p>
				) : null}
			</CardContent>
		</Card>
	);
}
