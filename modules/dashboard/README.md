# Module Dashboard

Module d'administration pour le tableau de bord Synclune.

## Structure

```
dashboard/
├── actions/           # Server Actions
│   ├── contact-adrien.ts              # Envoi de message à l'admin
│   ├── set-contact-adrien-visibility.ts
│   └── toggle-contact-adrien-visibility.ts
├── components/        # Composants React
│   ├── contact-adrien.tsx             # FAB de contact
│   ├── dashboard-kpis.tsx             # KPIs principaux
│   ├── dashboard-tabs.tsx             # Navigation par onglets
│   ├── revenue-chart.tsx              # Graphique revenus 30j
│   ├── revenue-year-chart.tsx         # Graphique revenus 12 mois
│   └── ...
├── constants/         # Configuration
│   ├── cache.ts                       # Tags et helpers de cache
│   ├── chart-styles.ts                # Styles des graphiques
│   └── periods.ts                     # Périodes de filtrage
├── data/              # Fonctions de récupération de données
│   ├── get-kpis.ts                    # KPIs globaux
│   ├── get-revenue-chart.ts           # Données graphique revenus
│   └── ...
├── hooks/             # Hooks React
│   ├── use-contact-adrien-form.ts
│   └── use-toggle-contact-adrien-visibility.ts
├── schemas/           # Validation Zod
├── types/             # Types TypeScript
└── utils/             # Utilitaires
```

## Cache

Les tags de cache partagés sont définis dans `@/shared/constants/cache-tags.ts`:

```typescript
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

// Utilisation
updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
updateTag(SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST);
```

Tags disponibles:
- `ADMIN_BADGES` - Badges de notification admin
- `ADMIN_ORDERS_LIST` - Liste des commandes
- `ADMIN_CUSTOMERS_LIST` - Liste des clients
- `ADMIN_INVENTORY_LIST` - Liste inventaire

## Composant ContactAdrien

FAB (Floating Action Button) permettant d'envoyer un message à l'administrateur.

### Utilisation

```tsx
import { ContactAdrien } from "@/modules/dashboard/components/contact-adrien";
import { getContactAdrienVisibility } from "@/modules/dashboard/data/get-contact-adrien-visibility";

export default async function Layout({ children }) {
  const isHidden = await getContactAdrienVisibility();

  return (
    <>
      {children}
      <ContactAdrien initialHidden={isHidden} />
    </>
  );
}
```

## Data Fetching

Toutes les fonctions data utilisent le cache Next.js 16:

```typescript
export async function getKpis() {
  "use cache: remote";
  cacheDashboard();
  // ...
}
```

## Sécurité

- Rate limiting sur les actions sensibles
- Sanitization des inputs pour prévenir XSS
- Validation des variables d'environnement avec Zod
