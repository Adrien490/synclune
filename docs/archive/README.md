# Archive documentation

Documents historiques conservés pour traçabilité. **Ne pas se baser sur leur contenu pour des décisions courantes** — l'état actuel du code est la source de vérité.

Pour la doc vivante, voir [`../README`](../) (index parent).

## Contenu

| Fichier                                                        | Date       | Type                                | Statut implémentation                                                                                                                                                                                                  |
| -------------------------------------------------------------- | ---------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`audit-homepage-content.md`](./audit-homepage-content.md)     | 2026-03-13 | Audit landing page (UX/SEO/copy)    | Patterns intégrés au storefront (`app/(shop)/(home)/_components/`)                                                                                                                                                     |
| [`audit-refactoring-2026.md`](./audit-refactoring-2026.md)     | 2026-04-19 | Audit sur-ingénierie + surface code | Recommandations consommées (refactor 2026 Q2)                                                                                                                                                                          |
| [`refactoring-prompts-2026.md`](./refactoring-prompts-2026.md) | 2026-04-19 | Prompts d'audit batch               | Consommés via `docs/audit/` framework                                                                                                                                                                                  |
| [`mobile-list-card-ui.md`](./mobile-list-card-ui.md)           | 2026-04-19 | Design guide cards/list mobile      | Patterns implémentés (`shared/components/swipeable-card.tsx`, `shared/components/mobile-selection/`, `modules/orders/components/admin/orders-mobile-list-item.tsx`, `modules/cart/components/cart-sheet-item-row.tsx`) |

## Pourquoi archiver plutôt que supprimer

- **Audit conformité** : traçabilité des décisions techniques (Art. L123-22 pour la partie facturation, sécurité pour la partie auth).
- **Onboarding** : un nouvel arrivant peut comprendre pourquoi tel pattern a été retenu.
- **Memory Claude Code** : références croisées éventuelles depuis `~/.claude/projects/-Users-adrienpoirier-Projets-synclune/memory/`.

Si un document devient une dette pure (faux, contradictoire avec l'état courant), le supprimer plutôt que d'y laisser une mention périmée.
