"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/shared/components/ui/dialog";
import { cn } from "@/shared/utils/cn";
import {
	AlertTriangle,
	BarChart3,
	ChevronLeft,
	ChevronRight,
	ListOrdered,
	PieChart,
	Receipt,
	ShoppingCart,
	Sparkles,
	TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

interface TutorialStep {
	title: string;
	description: string;
	icon: React.ReactNode;
	tips?: string[];
}

const tutorialSteps: TutorialStep[] = [
	{
		title: "Bienvenue sur votre tableau de bord ! 👋",
		description:
			"Ce guide va vous aider à comprendre toutes les informations affichées et comment elles peuvent vous aider à gérer votre boutique efficacement.",
		icon: <Sparkles className="h-12 w-12 text-primary" />,
		tips: [
			"Prenez votre temps pour explorer chaque section",
			"Vous pourrez rouvrir ce tutoriel à tout moment",
			"Toutes les données sont mises à jour en temps réel",
		],
	},
	{
		title: "Les cartes KPI (Indicateurs clés)",
		description:
			"En haut de votre dashboard, vous trouverez 5 cartes qui résument les chiffres les plus importants de votre activité.",
		icon: <TrendingUp className="h-10 w-10 text-blue-500" />,
		tips: [
			"📊 CA du jour TTC : Le chiffre d'affaires d'aujourd'hui (avec les flèches ↑↓ pour voir si c'est mieux ou moins bien qu'hier)",
			"🧾 TVA collectée : La TVA que vous avez collectée ce mois-ci (important pour votre comptabilité)",
			"🛒 Commandes en attente : Les commandes qui attendent d'être traitées (avec un badge rouge si certaines sont urgentes depuis plus de 48h)",
			"📦 Bijoux en rupture : Les bijoux qui n'ont plus de stock et qu'il faut réapprovisionner rapidement",
			"⏱️ Réservations actives : Les produits mis de côté par des clients (dans leur panier en cours)",
		],
	},
	{
		title: "Graphique des revenus (30 jours)",
		description:
			"Ce graphique avec des courbes colorées vous montre l'évolution de vos ventes sur les 30 derniers jours.",
		icon: <BarChart3 className="h-10 w-10 text-green-500" />,
		tips: [
			"📈 Ligne bleue (TTC) : Le montant total encaissé taxes comprises",
			"📗 Ligne verte (HT) : Le montant hors taxes (ce qui vous revient vraiment)",
			"📙 Ligne orange (TVA) : La TVA collectée pour l'État",
			"💡 Conseil : Si vous voyez des pics certains jours, notez quelles actions marketing vous aviez faites !",
		],
	},
	{
		title: "Top 5 des produits les plus vendus",
		description:
			"Ce graphique à barres horizontales vous montre vos 5 bijoux qui génèrent le plus de chiffre d'affaires.",
		icon: <BarChart3 className="h-10 w-10 text-purple-500" />,
		tips: [
			"🏆 Les barres les plus longues = vos bestsellers",
			"💰 Le montant affiché est le CA total généré par chaque produit",
			"🔢 Passez la souris pour voir le nombre d'unités vendues",
			"💡 Astuce : Assurez-vous d'avoir toujours du stock de vos bestsellers !",
		],
	},
	{
		title: "Répartition des statuts de commandes",
		description:
			"Ce graphique circulaire (donut) vous montre la répartition de vos commandes selon leur avancement.",
		icon: <PieChart className="h-10 w-10 text-orange-500" />,
		tips: [
			"🟦 En attente : Commandes reçues mais pas encore traitées",
			"🟨 En traitement : Vous préparez actuellement ces commandes",
			"🟩 Expédiée : Commandes parties chez le transporteur",
			"✅ Livrée : Commandes arrivées chez le client",
			"💡 Idéalement, gardez peu de commandes 'En attente' pour un service rapide !",
		],
	},
	{
		title: "Répartition de la TVA collectée",
		description:
			"Ce graphique vous montre la TVA que vous avez collectée ce mois-ci, répartie par taux (20%, 5.5%, etc.).",
		icon: <Receipt className="h-10 w-10 text-teal-500" />,
		tips: [
			"📊 Chaque part du cercle = un taux de TVA différent",
			"🔢 Le pourcentage affiché montre la proportion de chaque taux",
			"💰 Le montant total en euros est indiqué en haut",
			"📋 Info utile pour vos déclarations fiscales mensuelles",
		],
	},
	{
		title: "Dernières commandes",
		description:
			"Cette liste vous montre vos 5 commandes les plus récentes avec leurs informations essentielles.",
		icon: <ListOrdered className="h-10 w-10 text-indigo-500" />,
		tips: [
			"🔢 Numéro de commande : Cliquez dessus pour voir tous les détails",
			"👤 Nom et email du client",
			"🟢 Badge vert = commande payée",
			"🟡 Badge orange = paiement en attente",
			"📅 Date et heure précises de la commande",
			"💡 Vérifiez régulièrement cette liste pour traiter rapidement les nouvelles commandes !",
		],
	},
	{
		title: "Alertes stock",
		description:
			"Cette liste vous alerte sur les produits qui nécessitent votre attention au niveau du stock.",
		icon: <AlertTriangle className="h-10 w-10 text-red-500" />,
		tips: [
			"🔴 Icône paquet barré = Rupture totale (0 en stock)",
			"🟠 Icône triangle = Stock faible (moins de 5 unités)",
			"📦 Le chiffre à droite = nombre d'unités restantes",
			"🎯 Cliquez sur une alerte pour aller directement réapprovisionner",
			"💡 Conseil : Commandez vos bijoux AVANT la rupture complète pour ne jamais manquer de ventes !",
		],
	},
	{
		title: "Navigation dans l'administration",
		description:
			"Utilisez le menu latéral à gauche pour accéder aux différentes sections de votre boutique.",
		icon: <ShoppingCart className="h-10 w-10 text-pink-500" />,
		tips: [
			"📦 Commandes : Gérer toutes vos commandes",
			"💎 Catalogue : Vos produits, variantes et collections",
			"🎨 Attributs : Couleurs et matériaux de vos bijoux",
			"📦 Stock : Inventaire et mouvements de stock",
			"🏷️ Promotions : Codes promo et remises",
			"👥 Clients : Votre base de données clients",
			"⚙️ Paramètres : Configuration de votre boutique",
		],
	},
	{
		title: "Vous êtes prête ! 🎉",
		description:
			"Vous avez maintenant toutes les clés pour utiliser votre dashboard efficacement. N'hésitez pas à explorer !",
		icon: <Sparkles className="h-12 w-12 text-primary" />,
		tips: [
			"🔄 Ce tableau de bord se met à jour automatiquement",
			"📱 Vous pouvez y accéder depuis votre téléphone",
			"❓ En cas de question, contactez le support",
			"💪 Plus vous l'utiliserez, plus ce sera facile !",
		],
	},
];

const TUTORIAL_STORAGE_KEY = "dashboard-tutorial-completed";

interface TutorialDialogProps {
	/**
	 * Ouvre le dialog automatiquement (pour trigger programmatique)
	 */
	autoOpen?: boolean;
}

export function TutorialDialog({ autoOpen = false }: TutorialDialogProps = {}) {
	const [currentStep, setCurrentStep] = useState(0);
	const [isOpen, setIsOpen] = useState(autoOpen);
	const [dontShowAgain, setDontShowAgain] = useState(false);

	// Vérifier au montage si le tutoriel doit s'afficher automatiquement
	useEffect(() => {
		// Si autoOpen est true, on force l'ouverture
		if (autoOpen) {
			setIsOpen(true);
			return;
		}

		const hasCompleted = localStorage.getItem(TUTORIAL_STORAGE_KEY);
		// Ouvrir automatiquement si jamais vu
		if (!hasCompleted) {
			setIsOpen(true);
		}
	}, [autoOpen]);

	const handleNext = () => {
		if (currentStep < tutorialSteps.length - 1) {
			setCurrentStep(currentStep + 1);
		}
	};

	const handlePrevious = () => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handleReset = () => {
		setCurrentStep(0);
	};

	const handleClose = () => {
		// Si "ne plus afficher" est coché, sauvegarder la préférence
		if (dontShowAgain) {
			localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
		}
		setIsOpen(false);
		setDontShowAgain(false);
	};

	const step = tutorialSteps[currentStep];
	const isLastStep = currentStep === tutorialSteps.length - 1;
	const isFirstStep = currentStep === 0;

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					onClick={handleReset}
					className="w-full justify-start gap-2"
				>
					<Sparkles className="h-4 w-4" />
					<span>Aide - Tutoriel</span>
				</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col" onEscapeKeyDown={handleClose} onPointerDownOutside={handleClose}>
				<div className="shrink-0">
					<DialogHeader>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								{step.icon}
								<div>
									<DialogTitle className="text-xl">{step.title}</DialogTitle>
									<Badge variant="secondary" className="mt-1">
										Étape {currentStep + 1} / {tutorialSteps.length}
									</Badge>
								</div>
							</div>
						</div>
						<DialogDescription className="text-base pt-4">
							{step.description}
						</DialogDescription>
					</DialogHeader>
				</div>

				<div className="flex-1 overflow-y-auto px-6 py-4">
					{step.tips && (
						<div className="space-y-3">
							{step.tips.map((tip, index) => (
								<div
									key={index}
									className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
								>
									<div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
										{index + 1}
									</div>
									<p className="text-sm leading-relaxed">{tip}</p>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="shrink-0 border-t px-6 py-4 space-y-4">
					{/* Checkbox "Ne plus afficher" */}
					<div className="flex items-center space-x-2">
						<Checkbox
							id="dont-show-again"
							checked={dontShowAgain}
							onCheckedChange={(checked) => setDontShowAgain(checked === true)}
						/>
						<label
							htmlFor="dont-show-again"
							className="text-sm text-muted-foreground cursor-pointer select-none"
						>
							Ne plus afficher ce tutoriel automatiquement
						</label>
					</div>

					{/* Progress bar */}
					<div className="space-y-2">
						<div className="flex justify-between text-xs text-muted-foreground">
							<span>Progression</span>
							<span>
								{Math.round(((currentStep + 1) / tutorialSteps.length) * 100)}%
							</span>
						</div>
						<div className="w-full bg-muted rounded-full h-2">
							<div
								className="bg-primary h-2 rounded-full transition-all duration-300"
								style={{
									width: `${((currentStep + 1) / tutorialSteps.length) * 100}%`,
								}}
							/>
						</div>
					</div>

					{/* Navigation buttons */}
					<div className="flex items-center justify-between">
						<Button
							variant="outline"
							size="sm"
							onClick={handlePrevious}
							disabled={isFirstStep}
						>
							<ChevronLeft className="h-4 w-4 mr-1" />
							Précédent
						</Button>

						<Button size="sm" onClick={handleNext} disabled={isLastStep}>
							Suivant
							<ChevronRight className="h-4 w-4 ml-1" />
						</Button>
					</div>

					{/* Dots navigation */}
					<div className="flex justify-center gap-1.5">
						{tutorialSteps.map((_, index) => (
							<button
								key={index}
								onClick={() => setCurrentStep(index)}
								className={cn(
									"w-2 h-2 rounded-full transition-all",
									index === currentStep
										? "bg-primary w-8"
										: "bg-muted hover:bg-muted-foreground/50"
								)}
								aria-label={`Aller à l'étape ${index + 1}`}
							/>
						))}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
