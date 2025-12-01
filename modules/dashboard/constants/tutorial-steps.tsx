import {
	AlertTriangle,
	BarChart3,
	ListOrdered,
	PieChart,
	Receipt,
	ShoppingCart,
	Sparkles,
	TrendingUp,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface TutorialStep {
	title: string;
	description: string;
	icon: React.ReactNode;
	tips?: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const TUTORIAL_STORAGE_KEY = "dashboard-tutorial-completed";

export const TUTORIAL_STEPS: TutorialStep[] = [
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
