Tu es un expert Next.js 16 / React 19 / TypeScript spécialisé en dashboards admin e-commerce. Analyse le module dashboard ci-dessous et
propose des améliorations concrètes et des implémentations modernes.

▎ Contexte technique

▎ - Stack : Next.js 16, React 19 (compiler, pas de useMemo/useCallback/memo), TypeScript strict, Prisma 7 (PostgreSQL), Tailwind CSS 4,
shadcn/ui, Recharts, Motion v12 (motion/react), date-fns, CVA, Zustand v5
▎ - Patterns existants : "use cache" directive (pas SWR/TanStack Query), Server Components async avec Suspense streaming, services purs (zero
side-effects), DDD modulaire (data/ → services/ → components/), cache profiles (dashboard = stale 1m / revalidate 30s), updateTag() pour
invalidation
▎ - UI : Textes en français, code en anglais, indentation tabs

▎ Architecture actuelle du module modules/dashboard/

▎ 25 fichiers prod (~1800 LOC) + 13 fichiers tests (~1700 LOC)

▎ Data layer (3 fetchers cachés)

▎ - get-kpis.ts : 2 requêtes prisma.order.aggregate() en Promise.all() (mois courant vs précédent) → CA, nb commandes, panier moyen +
évolution %
▎ - get-revenue-chart.ts : Raw SQL $queryRaw GROUP BY jour sur 30 jours → buildRevenueMap() + fillMissingDates() (série continue)
▎ - get-recent-orders.ts : prisma.order.findMany() avec select explicite, limit 5, tri paidAt desc → transformRecentOrders()

▎ Service layer (2 services purs)

▎ - revenue-chart-builder.service.ts : buildRevenueMap() (bigint→number), fillMissingDates() (gaps→0), formatChartData() (ISO→"15 janv." fr)
▎ - recent-orders-transformer.service.ts : transformRecentOrder() (aplatit user.name→customerName, default "Invité")

▎ Component layer (15 composants)

▎ - Page (app/admin/(dashboard)/page.tsx) : 3 <Suspense> boundaries (KPIs, chart, orders) avec skeletons dédiés
▎ - KPIs : DashboardKpis (async RSC) → 3× KpiCard (CVA variants: size/priority/status, lien href, tooltip, NumberTicker animé) + KpiEvolution
(flèche up/down + %)
▎ - Chart : RevenueChart (client, Recharts LineChart monotone) + LazyRevenueChart (wrapper lazy) + ChartScrollContainer (mobile overflow-x) +
ChartEmpty/ChartError
▎ - Orders : RecentOrdersList (client, cartes cliquables avec badges status/payment, date formatée, total €)
▎ - Skeletons : KpisSkeleton, ChartSkeleton, ListSkeleton (aria-busy, role="status")

▎ Constants

▎ - DASHBOARD_CACHE_TAGS (3 tags), CHART_STYLES (classes Tailwind centralisées, dimensions Recharts), EMPTY_STATES (configs icon/title/desc),
ORDER_STATUS_LABELS/VARIANTS (enum→FR label + badge variant)

▎ Limitations identifiées

▎ - Fenêtre fixe 30 jours (pas de sélecteur de période)
▎ - Pas de comparaison visuelle période précédente sur le graphique
▎ - 3 KPIs seulement (CA, commandes, panier moyen)
▎ - Pas de graphique pour les commandes (seulement revenus)
▎ - RecentOrdersList : pas de lien "Voir toutes les commandes"
▎ - Pas d'ErrorBoundary (ChartError existe mais n'est pas wrappé)
▎ - Pas de temps réel / polling / WebSocket
▎ - Recharts uniquement (pas de sparklines dans les KPI cards)
▎ - Pas de vue mobile optimisée dédiée (responsive via breakpoints seulement)

▎ Ta mission

▎ Propose 10-15 améliorations concrètes classées par impact (P1 haute valeur → P3 nice-to-have). Pour chaque proposition :

▎ 1. Titre court
▎ 2. Problème/Manque actuel
▎ 3. Solution technique détaillée (avec pseudo-code ou structure de fichiers si pertinent)
▎ 4. Bénéfice utilisateur concret
▎ 5. Complexité estimée (S/M/L)

▎ Concentre-toi sur :
▎ - Les patterns modernes Next.js 16 / React 19 (PPR, cache components, server actions, streaming)
▎ - Les améliorations UX à fort impact pour un admin e-commerce artisanal
▎ - Les bibliothèques modernes qui remplaceraient avantageusement l'existant
▎ - Les métriques business manquantes pour un dashboard e-commerce pertinent
▎ - L'accessibilité et la performance

▎ Ne propose PAS : refactoring cosmétique, changements de convention, migration i18n (site monolingue FR), remplacement de "use cache" par
TanStack Query (choix architectural validé). @modules/dashboard/
