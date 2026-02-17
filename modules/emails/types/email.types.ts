export type EmailResult =
	| { success: true; data: { id: string } }
	| { success: false; error: unknown }

export type ShippingAddress = {
	firstName: string
	lastName: string
	address1: string
	address2?: string | null
	postalCode: string
	city: string
	country: string
	phone?: string
}

export type AdminShippingAddress = ShippingAddress & {
	phone: string
}

export type OrderItem = {
	productTitle: string
	skuColor: string | null
	skuMaterial: string | null
	skuSize: string | null
	quantity: number
	price: number
}
