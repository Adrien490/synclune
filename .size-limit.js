/**
 * Budgets de poids — recalibrés le 2026-08-16 pour la sortie TURBOPACK.
 *
 * ⚠️ L'ancien `.size-limit.json` datait de l'ère Webpack et n'a plus jamais
 * fonctionné depuis `next build --turbopack` :
 *
 *  - Turbopack émet des chunks PLATS à noms hachés dans `.next/static/chunks/`.
 *    Il n'y a AUCUN sous-dossier par route, donc les neuf budgets par page
 *    (`app/(shop)/creations/**`, `app/admin/catalogue/**`, `app/(legal)/**`…)
 *    ne matchaient rien : size-limit répondait « can't find files » sur chacun.
 *  - Et l'entrée « First Load JS (shared) » (`chunks/*.js`) ne mesurait pas le
 *    first load mais la SOMME de tous les chunks de l'application — 2,94 Mo
 *    contre une limite de 120 ko, soit un dépassement permanent de 2,82 Mo.
 *
 * Le job `Production build` échouait donc à chaque run sur cette étape, sans
 * qu'aucun budget n'ait jamais été vérifié.
 *
 * Ce qui reste mesurable par glob est conservé, et rien de plus : un budget
 * GLOBAL de JS servant de cliquet anti-gonflement (une dépendance lourde
 * ajoutée par mégarde le fait sauter), plus les images statiques. Le détail
 * par route, lui, est imprimé par `next build` dans sa propre table
 * « First Load JS » — c'est LÀ qu'il faut le lire, pas ici.
 */
const budgets = [
	{
		// Somme de TOUS les chunks Turbopack — mesuré 2,94 Mo le 2026-08-16.
		// Marge volontairement courte : c'est un cliquet, pas un plafond confortable.
		name: "JS total (tous chunks Turbopack)",
		path: ".next/static/chunks/*.js",
		limit: "3.2 MB",
		gzip: true,
	},
	{
		name: "Static images — splash screens",
		path: "public/splash/*.png",
		limit: "1900 kB",
		gzip: false,
	},
	{
		name: "Static images — icons & favicons",
		path: "public/icons/*.png",
		limit: "400 kB",
		gzip: false,
	},
];

export default budgets;
