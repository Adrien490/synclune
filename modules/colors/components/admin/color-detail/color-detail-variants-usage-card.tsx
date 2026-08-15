"use client";

import { ArrowRightIcon, ListDashesIcon, PackageIcon } from "@phosphor-icons/react/ssr";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import Image from "next/image";
import Link from "next/link";

import type { ColorDetailReturn } from "@/modules/colors/data/get-color";
import { getVariantMaterialsLabel } from "@/modules/variants/utils/variant-materials-label";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { formatEuro } from "@/shared/utils/format-euro";

interface ColorDetailVariantsUsageCardProps {
	color: ColorDetailReturn;
}

type VariantLike = ColorDetailReturn["variants"][number];
const materialsLabelOf = (variant: VariantLike) => getVariantMaterialsLabel(variant.material);

export function ColorDetailVariantsUsageCard({ color }: ColorDetailVariantsUsageCardProps) {
	const haptic = useHaptic();
	const variants = color.variants;
	const total = color._count.variants;

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
				{variants.length === 0 ? (
					<p className="text-muted-foreground text-sm italic">
						Aucune variante n&apos;utilise cette couleur pour le moment.
					</p>
				) : (
					<ul className="-mx-2 space-y-1" aria-label={`${variants.length} variante(s) actives`}>
						{variants.map((variant) => {
							const image = variant.product.media[0] ?? null;
							return (
								<li key={variant.id}>
									<Link
										href={`/admin/catalogue/produits/${variant.product.slug}/variantes/${variant.id}`}
										onClick={() => haptic("light")}
										className="hover:bg-muted/40 active:bg-muted/60 focus-visible:ring-ring flex items-center gap-3 rounded-md px-2 py-2 transition-colors outline-none focus-visible:ring-2"
									>
										{image ? (
											<Image
												src={image.url}
												alt={image.alt ?? variant.product.name}
												width={40}
												height={40}
												sizes="40px"
												quality={IMAGE_QUALITY.THUMBNAIL}
												className="size-10 shrink-0 rounded-md border object-cover"
											/>
										) : (
											<div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md border">
												<PackageIcon className="text-muted-foreground size-4" aria-hidden="true" />
											</div>
										)}
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-1.5">
												<span className="text-foreground truncate text-sm font-medium">
													{variant.product.name}
												</span>
											</div>
											<p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
												{materialsLabelOf(variant) ? (
													<span>{materialsLabelOf(variant)}</span>
												) : null}
												{variant.size ? (
													<>
														{materialsLabelOf(variant) ? <span aria-hidden="true">·</span> : null}
														<span>{variant.size}</span>
													</>
												) : null}
											</p>
										</div>
										<span className="text-foreground shrink-0 text-sm font-medium">
											{formatEuro(variant.priceCents ?? variant.product.priceCents)}
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
