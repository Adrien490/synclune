/**
 * Médiateur de la consommation (art. L612-1 s. du Code de la consommation) — SSOT.
 *
 * Depuis 2016, tout professionnel vendant à des particuliers doit garantir l'accès
 * **gratuit** à un médiateur agréé, et ses **coordonnées** doivent figurer de façon
 * **visible et lisible** sur le site, dans les CGV **et** dans les mentions légales.
 * Ce n'est pas une clause à recopier dans les seules CGV — c'est précisément le
 * défaut qu'un audit du 2026-08-06 a trouvé ici : le bloc n'existait que dans
 * `/cgv`, et `/mentions-legales` n'en portait aucune trace.
 *
 * Trois graphies divergentes du même organisme coexistaient alors (« CNPM -
 * MÉDIATION DE LA CONSOMMATION », « CNPM », « Centre National de la Médiation »),
 * chacune dans un fichier différent. D'où cette SSOT : un organisme de médiation se
 * change (agrément non renouvelé, changement de prestataire), et une adresse
 * périmée sur une des trois pages est un défaut de conformité silencieux.
 *
 * ⚠️ **À ne pas confondre avec la plateforme européenne RLL/ODR**, fermée
 * définitivement le **2025-07-20** (règlement (UE) 2024/3228 abrogeant le règlement
 * n°524/2013). C'est l'orientation européenne qui a disparu ; l'obligation de
 * médiation, elle, **demeure entièrement**. Confondre les deux fait supprimer la
 * mauvaise clause — cf. le commentaire de `app/(legal)/cgv/page.tsx` § 11.2, posé
 * à l'endroit exact où l'on serait tenté de remettre le lien mort.
 */
export const CONSUMER_MEDIATOR = {
	/** Raison sociale, telle qu'elle doit être citée. */
	name: "CNPM - MÉDIATION DE LA CONSOMMATION",
	/** Développé du sigle — utile en première lecture, jamais seul. */
	fullName: "Centre National de la Médiation des Professions et des Métiers",
	address: {
		street: "27 avenue de la Libération",
		postalCode: "42400",
		city: "Saint-Chamond",
		country: "France",
	},
	/** Sans le protocole : c'est le libellé affiché. `websiteUrl` porte le href. */
	website: "cnpm-mediation-consommation.eu",
	websiteUrl: "https://cnpm-mediation-consommation.eu",
	email: "contact@cnpm-mediation-consommation.eu",
} as const;

/**
 * Le visa légal, en une phrase — celui qui rend le bloc opposable plutôt que
 * décoratif. Un encadré de coordonnées sans cet article ne dit pas au
 * consommateur *de quel droit* il dispose.
 */
export const MEDIATION_LEGAL_BASIS =
	"Conformément à l'article L612-1 du Code de la consommation, en cas d'échec de notre tentative de règlement amiable, vous avez la possibilité de recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable du litige.";

/**
 * Les deux conditions d'exercice que la loi impose de porter à la connaissance du
 * consommateur : la gratuité, et le délai d'un an à compter de la réclamation
 * écrite. Elles vont avec les coordonnées ; les afficher sans elles laisse croire
 * que la médiation est payante ou ouverte sans limite.
 */
export const MEDIATION_CONDITIONS =
	"Le recours à la médiation est gratuit pour le consommateur. Le médiateur doit être saisi dans un délai maximum d'un an à compter de votre réclamation écrite auprès de Synclune. La médiation n'est pas obligatoire mais constitue une alternative au recours judiciaire.";

/**
 * Délai légal de rétractation, en jours (art. L221-18 du Code de la consommation).
 *
 * ⚠️ Cette valeur est encore écrite en dur sur une quinzaine de surfaces (CGV,
 * `/retractation`, FAQ, pied de page, emails) — dette connue, à résorber en une
 * passe transverse et non fichier par fichier. La constante existe d'abord pour le
 * `hasMerchantReturnPolicy` du `@graph`, où une valeur ressaisie diverge en silence
 * de ce que les CGV promettent : Google la lit comme un engagement du marchand.
 */
export const LEGAL_WITHDRAWAL_DAYS = 14;
