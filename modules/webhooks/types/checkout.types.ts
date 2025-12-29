import type { PostWebhookTask } from "./webhook.types"

export interface OrderItem {
	productTitle: string | null
	skuColor: string | null
	skuMaterial: string | null
	skuSize: string | null
	quantity: number
	price: number
	skuId: string
	sku: {
		id: string
		inventory: number
		sku: string
	} | null
}

export interface OrderWithItems {
	id: string
	orderNumber: string
	userId: string | null
	shippingFirstName: string | null
	shippingLastName: string | null
	shippingAddress1: string | null
	shippingAddress2: string | null
	shippingPostalCode: string | null
	shippingCity: string | null
	shippingCountry: string | null
	shippingPhone: string | null
	subtotal: number
	discountAmount: number
	shippingCost: number
	taxAmount: number
	total: number
	items: OrderItem[]
}

export interface ProcessCheckoutResult {
	order: OrderWithItems
	tasks: PostWebhookTask[]
}
