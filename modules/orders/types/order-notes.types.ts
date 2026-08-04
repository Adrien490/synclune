/**
 * Structure d'une note de commande telle que stockée / mise en cache.
 *
 * ⚠️ Cette forme est partagée par le cache `"use cache"` de `fetchOrderNotes()`, dont
 * la clé ne dépend QUE de l'orderId : elle ne doit contenir aucune donnée propre au
 * visiteur, sinon un admin hériterait des capacités d'un autre.
 */
export type OrderNoteRecord = {
	id: string;
	content: string;
	authorId: string;
	authorName: string;
	createdAt: Date;
};

/**
 * Note enrichie de la capacité du visiteur courant, calculée HORS cache.
 *
 * `canDelete` : `deleteOrderNote` n'autorise que l'auteur
 * (`FORBIDDEN` sinon). Le panneau rendait auparavant l'icône Corbeille sur TOUTES les
 * notes — un bouton qui échouait systématiquement sur la note d'un collègue. La règle
 * est décidée côté serveur (qui connaît la session), pas re-dérivée côté client.
 */
export type OrderNoteItem = OrderNoteRecord & {
	canDelete: boolean;
};
