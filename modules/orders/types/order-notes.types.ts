/**
 * Structure d'une note de commande
 */
export type OrderNoteItem = {
	id: string;
	content: string;
	authorId: string;
	authorName: string;
	createdAt: Date;
};
