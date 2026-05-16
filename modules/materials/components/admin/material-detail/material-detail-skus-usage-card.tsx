"use client";

import { ArrowRight, LayoutList, Package, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { MaterialDetailReturn } from "@/modules/materials/data/get-material";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";

interface MaterialDetailSkusUsageCardProps {
	material: MaterialDetailReturn;
}

const PRICE_FORMATTER = new Intl.NumberFormat("fr-FR", {
	style: "currency",
	currency: "EUR",
});
const formatPrice = (cents: number) => PRICE_FORMATTER.format(cents / 100);

export function MaterialDetailSkusUsageCard({ material }: MaterialDetailSkusUsageCardProps) {
	const haptic = useHaptic();
	const skus = material.skus;
	const total = material._count.skus;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between gap-2">
					<span className="flex items-center gap-2">
						<LayoutList className="size-5" aria-hidden="true" />
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
						Aucune variante n&apos;utilise ce matériau pour le moment.
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
												<Package className="text-muted-foreground size-4" aria-hidden="true" />
											</div>
										)}
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-1.5">
												<span className="text-foreground truncate text-sm font-medium">
													{sku.product.title}
												</span>
												{sku.isDefault ? (
													<Badge variant="secondary">
														<Star className="size-3" aria-hidden="true" />
													</Badge>
												) : null}
											</div>
											<p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
												<span className="font-mono">{sku.sku}</span>
												{sku.colors && sku.colors.length > 0 ? (
													<>
														<span aria-hidden="true">·</span>
														<span className="inline-flex items-center gap-1">
															<span
																className="border-border size-3 rounded-full border"
																style={
																	sku.colors.length === 1
																		? { backgroundColor: sku.colors[0]!.color.hex }
																		: {
																				background: `linear-gradient(135deg, ${sku.colors
																					.map((c, i) => {
																						const pct = (100 / sku.colors!.length) * (i + 1);
																						return `${c.color.hex} ${pct - 100 / sku.colors!.length}% ${pct}%`;
																					})
																					.join(", ")})`,
																			}
																}
																aria-hidden="true"
															/>
															{sku.colors.map((c) => c.color.name).join(" + ")}
														</span>
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
											{formatPrice(sku.priceInclTax)}
										</span>
									</Link>
								</li>
							);
						})}
					</ul>
				)}

				<Button
					asChild
					variant="outline"
					className="w-full transition-transform duration-150 active:scale-[0.98]"
				>
					<Link
						href={`/admin/catalogue/inventaire?materialId=${material.id}`}
						onClick={() => haptic("light")}
					>
						Voir toutes les variantes
						<ArrowRight className="size-4" aria-hidden="true" />
					</Link>
				</Button>
			</CardContent>
		</Card>
	);
}
