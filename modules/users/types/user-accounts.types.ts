// ============================================================================
// TYPES - USER ACCOUNTS
// ============================================================================

export type UserAccount = {
	id: string;
	providerId: string;
	accountId: string;
	createdAt: Date;
};

export type GetUserAccountsReturn = UserAccount[];
