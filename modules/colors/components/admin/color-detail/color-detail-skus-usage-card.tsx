"use client";

import { ArrowRightIcon, ListDashesIcon, PackageIcon, StarIcon } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import Link from "next/link";

import type { ColorDetailReturn } from "@/modules/colors/data/get-color";
import { getSkuMaterialsLabel } from "@/modules/skus/utils/sku-materials-label";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { formatEuro } from "@/shared/utils/format-euro";

interface ColorDetailSkusUsageCardProps {
	color: ColorDetailReturn;
}

type SkuLike = ColorDetailReturn["skus"][number];
const materialsLabelOf = (sku: SkuLike) => getSkuMaterialsLabel(sku.materials);

export function ColorDetailSkusUsageCard({ color }: ColorDetailSkusUsageCardProps) {
	const haptic = useHaptic();
	const skus = color.skus;
	const total = color._count.skus;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between gap-2">
					<span className="flex items-center gap-2">
						<ListDashesIcon className="size-5" aria-hidden="true" />
						Variantes
					</span>
					<span className="text-muted-foreground text-sm font-normal">
						{total} variante{total > 1 ? "s" : ""}
					</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{skus.length === 0 ? (
					<p className="text-muted-foreground text-sm italic">
						Aucune variante n&apos;utilise cette couleur pour le moment.
					</p>
				) : (
					<ul className="-mx-2 space-y-1" aria-label={`${skus.length} variante(s) actives`}>
						{skus.map((sku) => {
							const image = sku.product.skus[0]?.images[0] ?? null;
							return (
								<li key={sku.id}>
									<Link
										href={`/admin/catalogue/produits/${sku.product.slug}/variantes/${sku.id}`}
										onClick={() => haptic("light")}
										className="hover:bg-muted/40 active:bg-muted/60 focus-visible:ring-ring flex items-center gap-3 rounded-md px-2 py-2 transition-colors outline-none focus-visible:ring-2"
									>
										{image ? (
											<Image
												src={image.url}
												alt={image.altText ?? sku.product.title}
												width={40}
												height={40}
												sizes="40px"
												className="size-10 shrink-0 rounded-md border object-cover"
												{...(image.blurDataUrl
													? { placeholder: "blur" as const, blurDataURL: image.blurDataUrl }
													: {})}
											/>
										) : (
											<div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md border">
												<PackageIcon className="text-muted-foreground size-4" aria-hidden="true" />
											</div>
										)}
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-1.5">
												<span className="text-foreground truncate text-sm font-medium">
													{sku.product.title}
												</span>
												{sku.isDefault ? (
													<Badge variant="secondary">
														<StarIcon className="size-3" aria-hidden="true" />
													</Badge>
												) : null}
											</div>
											<p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
												<span className="font-mono">{sku.sku}</span>
												{materialsLabelOf(sku) ? (
													<>
														<span aria-hidden="true">·</span>
														<span>{materialsLabelOf(sku)}</span>
													</>
												) : null}
												{sku.size ? (
													<>
														<span aria-hidden="true">·</span>
														<span>{sku.size}</span>
													</>
												) : null}
											</p>
										</div>
										<span className="text-foreground shrink-0 text-sm font-medium">
											{formatEuro(sku.priceInclTax)}
										</span>
									</Link>
								</li>
							);
						})}
					</ul>
				)}

				<Button
					render={
						<Link
							href={`/admin/catalogue/inventaire?colorId=${color.id}`}
							onClick={() => haptic("light")}
						/>
					}
					variant="outline"
					className="w-full transition-transform duration-150 active:scale-[0.98]"
				>
					Voir toutes les variantes
					<ArrowRightIcon className="size-4" aria-hidden="true" />
				</Button>
			</CardContent>
		</Card>
	);
}
