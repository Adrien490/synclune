import {
	Body,
	Button,
	Container,
	Head,
	Hr,
	Html,
	Img,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";

interface ReviewableProduct {
	title: string;
	slug: string;
	imageUrl: string | null;
	skuVariants: string | null; // "Or Rose · 45cm"
}

interface ReviewRequestEmailProps {
	customerName: string;
	orderNumber: string;
	products: ReviewableProduct[];
	reviewUrl: string;
}

export const ReviewRequestEmail = ({
	customerName,
	orderNumber,
	products,
	reviewUrl,
}: ReviewRequestEmailProps) => {
	const singleProduct = products.length === 1;
	const previewText = singleProduct
		? `Que penses-tu de ${products[0].title} ?`
		: `Donne ton avis sur ta commande ${orderNumber}`;

	return (
		<Html>
			<Head />
			<Preview>{previewText}</Preview>
			<Body style={{ backgroundColor: EMAIL_COLORS.background.main }}>
				<Container style={EMAIL_STYLES.container}>
					{/* Header */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Text
							style={{
								margin: 0,
								fontSize: "24px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
							}}
						>
							Synclune
						</Text>
					</Section>

					{/* Titre */}
					<Section style={{ marginBottom: "24px" }}>
						<Text style={EMAIL_STYLES.heading.h2}>
							{singleProduct
								? "Ton avis compte !"
								: "Tes avis comptent !"}
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
							Bonjour {customerName},
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "8px" }}>
							{singleProduct
								? "Ta commande a bien été livrée. Nous espérons que tu es ravie de ta création !"
								: "Ta commande a bien été livrée. Nous espérons que tu es ravie de tes créations !"}
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "8px" }}>
							Prends quelques instants pour partager ton expérience. Ton avis
							aide d&apos;autres clientes à faire leur choix et nous permet
							d&apos;améliorer nos créations.
						</Text>
					</Section>

					{/* Produits */}
					<Section style={{ marginBottom: "24px" }}>
						<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "16px" }}>
							{singleProduct ? "Ta création" : "Tes créations"}
						</Text>

						{products.map((product, index) => (
							<div
								key={product.slug}
								style={{
									display: "flex",
									alignItems: "center",
									gap: "16px",
									marginBottom: index < products.length - 1 ? "16px" : "0",
									paddingBottom: index < products.length - 1 ? "16px" : "0",
									borderBottom:
										index < products.length - 1
											? `1px solid ${EMAIL_COLORS.border}`
											: "none",
								}}
							>
								{product.imageUrl && (
									<Img
										src={product.imageUrl}
										alt={product.title}
										width={80}
										height={80}
										style={{
											borderRadius: "8px",
											objectFit: "cover",
										}}
									/>
								)}
								<div style={{ flex: 1 }}>
									<Text
										style={{
											margin: 0,
											fontSize: "16px",
											fontWeight: "600",
											color: EMAIL_COLORS.text.primary,
										}}
									>
										{product.title}
									</Text>
									{product.skuVariants && (
										<Text
											style={{
												...EMAIL_STYLES.text.small,
												marginTop: "4px",
											}}
										>
											{product.skuVariants}
										</Text>
									)}
								</div>
							</div>
						))}
					</Section>

					<Hr style={{ ...EMAIL_STYLES.hr, margin: "24px 0" }} />

					{/* Message incitatif */}
					<Section
						style={{
							...EMAIL_STYLES.section.card,
							marginBottom: "24px",
							textAlign: "center",
						}}
					>
						<Text
							style={{
								margin: 0,
								fontSize: "32px",
							}}
						>
							{"\u2B50\uFE0F"}
						</Text>
						<Text
							style={{
								...EMAIL_STYLES.text.body,
								marginTop: "12px",
								fontStyle: "italic",
							}}
						>
							Chaque avis est lu avec attention et contribue
							<br />
							a faire grandir notre petite marque artisanale.
						</Text>
					</Section>

					{/* CTA */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Button href={reviewUrl} style={EMAIL_STYLES.button.primary}>
							Donner mon avis
						</Button>
						<Text
							style={{
								...EMAIL_STYLES.text.tiny,
								marginTop: "12px",
							}}
						>
							Cela ne prend que 2 minutes
						</Text>
					</Section>

					{/* Footer */}
					<Section
						style={{
							paddingTop: "24px",
							borderTop: `1px solid ${EMAIL_COLORS.border}`,
							textAlign: "center",
						}}
					>
						<Text style={EMAIL_STYLES.text.tiny}>
							Merci pour ta confiance !
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.tiny, marginTop: "8px" }}>
							© {new Date().getFullYear()} Synclune
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
};

ReviewRequestEmail.PreviewProps = {
	customerName: "Marie",
	orderNumber: "CMD-1730000000-ABCD",
	products: [
		{
			title: "Collier Luna en Or Rose",
			slug: "collier-luna-or-rose",
			imageUrl: "https://synclune.fr/images/products/collier-luna.jpg",
			skuVariants: "Or Rose · 45cm",
		},
		{
			title: "Boucles d'oreilles Étoile",
			slug: "boucles-oreilles-etoile",
			imageUrl: "https://synclune.fr/images/products/boucles-etoile.jpg",
			skuVariants: "Argent 925",
		},
	],
	reviewUrl: "https://synclune.fr/mes-avis",
} as ReviewRequestEmailProps;

export default ReviewRequestEmail;
