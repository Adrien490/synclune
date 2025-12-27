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
						className="text-xs gap-1.5 h-8 px-3 border-primary/30 hover:border-primary hover:bg-primary/5"
						type="button"
					>
						<Ruler className="w-3.5 h-3.5" aria-hidden="true" />
						Guide des tailles
					</Button>
				)}
			</ResponsiveDialogTrigger>
			<ResponsiveDialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
				<ResponsiveDialogHeader className="shrink-0">
					<ResponsiveDialogTitle className="flex items-center gap-2">
						<Ruler className="w-5 h-5 text-primary" aria-hidden="true" />
						Guide des tailles
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Trouve la taille parfaite pour ton produit
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				<Tabs defaultValue={defaultTab} className="mt-4 flex flex-col flex-1 min-h-0">
					<TabsList className="shrink-0 grid w-full grid-cols-2">
						<TabsTrigger value="rings">Bagues</TabsTrigger>
						<TabsTrigger value="bracelets">Bracelets</TabsTrigger>
					</TabsList>

					{/* Guide Bagues */}
					<TabsContent value="rings" className="flex-1 overflow-y-auto space-y-4 mt-4">
						<div className="space-y-3">
							<h3 className="text-sm font-semibold">Comment mesurer ?</h3>
							<ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
								<li>Enroule une ficelle ou un ruban autour de ton doigt</li>
								<li>Marque l'endroit où les deux extrémités se rejoignent</li>
								<li>Mesure la longueur obtenue en millimètres</li>
								<li>Compare avec le tableau ci-dessous</li>
							</ol>
						</div>

						<div className="rounded-lg border overflow-hidden">
							<table className="w-full text-sm">
								<caption className="sr-only">Correspondances des tailles de bagues francaises</caption>
								<thead className="bg-muted/50">
									<tr>
										<th scope="col" className="px-3 py-2 text-left font-medium">Tour de doigt</th>
										<th scope="col" className="px-3 py-2 text-left font-medium">Diametre</th>
										<th scope="col" className="px-3 py-2 text-left font-medium">Taille FR</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									<tr><td className="px-3 py-2">44 mm</td><td className="px-3 py-2">14 mm</td><td className="px-3 py-2">44</td></tr>
									<tr><td className="px-3 py-2">46 mm</td><td className="px-3 py-2">14.6 mm</td><td className="px-3 py-2">46</td></tr>
									<tr><td className="px-3 py-2">48 mm</td><td className="px-3 py-2">15.3 mm</td><td className="px-3 py-2">48</td></tr>
									<tr><td className="px-3 py-2">50 mm</td><td className="px-3 py-2">15.9 mm</td><td className="px-3 py-2">50</td></tr>
									<tr><td className="px-3 py-2">52 mm</td><td className="px-3 py-2">16.5 mm</td><td className="px-3 py-2">52</td></tr>
									<tr><td className="px-3 py-2">54 mm</td><td className="px-3 py-2">17.2 mm</td><td className="px-3 py-2">54</td></tr>
									<tr><td className="px-3 py-2">56 mm</td><td className="px-3 py-2">17.8 mm</td><td className="px-3 py-2">56</td></tr>
									<tr><td className="px-3 py-2">58 mm</td><td className="px-3 py-2">18.5 mm</td><td className="px-3 py-2">58</td></tr>
									<tr><td className="px-3 py-2">60 mm</td><td className="px-3 py-2">19.1 mm</td><td className="px-3 py-2">60</td></tr>
									<tr><td className="px-3 py-2">62 mm</td><td className="px-3 py-2">19.7 mm</td><td className="px-3 py-2">62</td></tr>
								</tbody>
							</table>
						</div>

						<div className="flex items-start gap-2 p-3 bg-accent/50 rounded-lg text-sm">
							<Info className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
							<p className="text-muted-foreground">
								<strong className="text-foreground">Astuce :</strong> Mesure en fin de journée quand tes doigts sont légèrement gonflés. En cas de doute, choisis la taille supérieure.
							</p>
						</div>
					</TabsContent>

					{/* Guide Bracelets */}
					<TabsContent value="bracelets" className="flex-1 overflow-y-auto space-y-4 mt-4">
						<div className="space-y-3">
							<h3 className="text-sm font-semibold">Comment mesurer ?</h3>
							<ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
								<li>Enroule un mètre ruban souple autour de ton poignet</li>
								<li>Place-le juste au-dessus de l'os du poignet</li>
								<li>Note la mesure en centimètres</li>
								<li>Ajoute 1 à 2 cm selon le confort souhaité</li>
							</ol>
						</div>

						<div className="rounded-lg border overflow-hidden">
							<table className="w-full text-sm">
								<caption className="sr-only">Correspondances des tailles de bracelets</caption>
								<thead className="bg-muted/50">
									<tr>
										<th scope="col" className="px-3 py-2 text-left font-medium">Tour de poignet</th>
										<th scope="col" className="px-3 py-2 text-left font-medium">Taille bracelet</th>
										<th scope="col" className="px-3 py-2 text-left font-medium">Ajustement</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									<tr><td className="px-3 py-2">13-14 cm</td><td className="px-3 py-2">15-16 cm</td><td className="px-3 py-2">XS</td></tr>
									<tr><td className="px-3 py-2">14-15 cm</td><td className="px-3 py-2">16-17 cm</td><td className="px-3 py-2">S</td></tr>
									<tr><td className="px-3 py-2">15-16 cm</td><td className="px-3 py-2">17-18 cm</td><td className="px-3 py-2">M</td></tr>
									<tr><td className="px-3 py-2">16-17 cm</td><td className="px-3 py-2">18-19 cm</td><td className="px-3 py-2">L</td></tr>
									<tr><td className="px-3 py-2">17-18 cm</td><td className="px-3 py-2">19-20 cm</td><td className="px-3 py-2">XL</td></tr>
								</tbody>
							</table>
						</div>

						<div className="flex items-start gap-2 p-3 bg-accent/50 rounded-lg text-sm">
							<Info className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
							<p className="text-muted-foreground">
								<strong className="text-foreground">Astuce :</strong> Si tu hésites entre deux tailles, choisis la plus grande pour un confort optimal.
							</p>
						</div>
					</TabsContent>
				</Tabs>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
