"use client";

import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
	ResponsiveDialogTrigger,
} from "@/shared/components/responsive-dialog";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Ruler, Info } from "lucide-react";

interface SizeGuideDialogProps {
	productTypeSlug?: string | null;
	children?: React.ReactNode;
}

/**
 * SizeGuideDialog - Guide des tailles pour bagues et bracelets
 *
 * Affiche un modal avec :
 * - Instructions de mesure
 * - Tableau des correspondances
 * - Conseils personnalisés selon le type de produit
 */
export function SizeGuideDialog({ productTypeSlug, children }: SizeGuideDialogProps) {
	const isRing = productTypeSlug?.toLowerCase().includes("ring");
	const isBracelet = productTypeSlug?.toLowerCase().includes("bracelet");
	const defaultTab = isRing ? "rings" : isBracelet ? "bracelets" : "rings";

	return (
		<ResponsiveDialog>
			<ResponsiveDialogTrigger asChild>
				{children ?? (
					<Button
						variant="outline"
						size="sm"
						className="border-primary/30 hover:border-primary hover:bg-primary/5 h-10 gap-1.5 px-3 text-xs"
						type="button"
					>
						<Ruler className="h-3.5 w-3.5" aria-hidden="true" />
						Guide des tailles
					</Button>
				)}
			</ResponsiveDialogTrigger>
			<ResponsiveDialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
				<ResponsiveDialogHeader className="shrink-0">
					<ResponsiveDialogTitle className="flex items-center gap-2">
						<Ruler className="text-primary h-5 w-5" aria-hidden="true" />
						Guide des tailles
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Trouvez la taille parfaite pour votre produit
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				<Tabs defaultValue={defaultTab} className="mt-4 flex min-h-0 flex-1 flex-col">
					<TabsList className="grid w-full shrink-0 grid-cols-2">
						<TabsTrigger value="rings">Bagues</TabsTrigger>
						<TabsTrigger value="bracelets">Bracelets</TabsTrigger>
					</TabsList>

					{/* Guide Bagues */}
					<TabsContent value="rings" className="mt-4 flex-1 space-y-4 overflow-y-auto">
						<div className="space-y-3">
							<h3 className="text-sm font-semibold">Comment mesurer ?</h3>
							<ol className="text-muted-foreground list-inside list-decimal space-y-2 text-sm">
								<li>Enroulez une ficelle ou un ruban autour de votre doigt</li>
								<li>Marquez l'endroit où les deux extrémités se rejoignent</li>
								<li>Mesurez la longueur obtenue en millimètres</li>
								<li>Comparez avec le tableau ci-dessous</li>
							</ol>
						</div>

						<div className="overflow-hidden rounded-lg border">
							<table className="w-full text-sm">
								<caption className="sr-only">
									Correspondances des tailles de bagues francaises
								</caption>
								<thead className="bg-muted/50">
									<tr>
										<th scope="col" className="px-3 py-2 text-left font-medium">
											Tour de doigt
										</th>
										<th scope="col" className="px-3 py-2 text-left font-medium">
											Diametre
										</th>
										<th scope="col" className="px-3 py-2 text-left font-medium">
											Taille FR
										</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									<tr>
										<td className="px-3 py-2">44 mm</td>
										<td className="px-3 py-2">14 mm</td>
										<td className="px-3 py-2">44</td>
									</tr>
									<tr>
										<td className="px-3 py-2">46 mm</td>
										<td className="px-3 py-2">14.6 mm</td>
										<td className="px-3 py-2">46</td>
									</tr>
									<tr>
										<td className="px-3 py-2">48 mm</td>
										<td className="px-3 py-2">15.3 mm</td>
										<td className="px-3 py-2">48</td>
									</tr>
									<tr>
										<td className="px-3 py-2">50 mm</td>
										<td className="px-3 py-2">15.9 mm</td>
										<td className="px-3 py-2">50</td>
									</tr>
									<tr>
										<td className="px-3 py-2">52 mm</td>
										<td className="px-3 py-2">16.5 mm</td>
										<td className="px-3 py-2">52</td>
									</tr>
									<tr>
										<td className="px-3 py-2">54 mm</td>
										<td className="px-3 py-2">17.2 mm</td>
										<td className="px-3 py-2">54</td>
									</tr>
									<tr>
										<td className="px-3 py-2">56 mm</td>
										<td className="px-3 py-2">17.8 mm</td>
										<td className="px-3 py-2">56</td>
									</tr>
									<tr>
										<td className="px-3 py-2">58 mm</td>
										<td className="px-3 py-2">18.5 mm</td>
										<td className="px-3 py-2">58</td>
									</tr>
									<tr>
										<td className="px-3 py-2">60 mm</td>
										<td className="px-3 py-2">19.1 mm</td>
										<td className="px-3 py-2">60</td>
									</tr>
									<tr>
										<td className="px-3 py-2">62 mm</td>
										<td className="px-3 py-2">19.7 mm</td>
										<td className="px-3 py-2">62</td>
									</tr>
								</tbody>
							</table>
						</div>

						<div className="bg-accent/50 flex items-start gap-2 rounded-lg p-3 text-sm">
							<Info className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
							<p className="text-muted-foreground">
								<strong className="text-foreground">Astuce :</strong> Mesurez en fin de journée
								quand vos doigts sont légèrement gonflés. En cas de doute, choisissez la taille
								supérieure.
							</p>
						</div>
					</TabsContent>

					{/* Guide Bracelets */}
					<TabsContent value="bracelets" className="mt-4 flex-1 space-y-4 overflow-y-auto">
						<div className="space-y-3">
							<h3 className="text-sm font-semibold">Comment mesurer ?</h3>
							<ol className="text-muted-foreground list-inside list-decimal space-y-2 text-sm">
								<li>Enroulez un mètre ruban souple autour de votre poignet</li>
								<li>Placez-le juste au-dessus de l'os du poignet</li>
								<li>Notez la mesure en centimètres</li>
								<li>Ajoutez 1 à 2 cm selon le confort souhaité</li>
							</ol>
						</div>

						<div className="overflow-hidden rounded-lg border">
							<table className="w-full text-sm">
								<caption className="sr-only">Correspondances des tailles de bracelets</caption>
								<thead className="bg-muted/50">
									<tr>
										<th scope="col" className="px-3 py-2 text-left font-medium">
											Tour de poignet
										</th>
										<th scope="col" className="px-3 py-2 text-left font-medium">
											Taille bracelet
										</th>
										<th scope="col" className="px-3 py-2 text-left font-medium">
											Ajustement
										</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									<tr>
										<td className="px-3 py-2">13-14 cm</td>
										<td className="px-3 py-2">15-16 cm</td>
										<td className="px-3 py-2">XS</td>
									</tr>
									<tr>
										<td className="px-3 py-2">14-15 cm</td>
										<td className="px-3 py-2">16-17 cm</td>
										<td className="px-3 py-2">S</td>
									</tr>
									<tr>
										<td className="px-3 py-2">15-16 cm</td>
										<td className="px-3 py-2">17-18 cm</td>
										<td className="px-3 py-2">M</td>
									</tr>
									<tr>
										<td className="px-3 py-2">16-17 cm</td>
										<td className="px-3 py-2">18-19 cm</td>
										<td className="px-3 py-2">L</td>
									</tr>
									<tr>
										<td className="px-3 py-2">17-18 cm</td>
										<td className="px-3 py-2">19-20 cm</td>
										<td className="px-3 py-2">XL</td>
									</tr>
								</tbody>
							</table>
						</div>

						<div className="bg-accent/50 flex items-start gap-2 rounded-lg p-3 text-sm">
							<Info className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
							<p className="text-muted-foreground">
								<strong className="text-foreground">Astuce :</strong> Si vous hésitez entre deux
								tailles, choisissez la plus grande pour un confort optimal.
							</p>
						</div>
					</TabsContent>
				</Tabs>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
