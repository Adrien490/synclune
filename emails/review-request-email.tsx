import { Img, Link, Section, Text } from "react-email";
import { EMAIL_CLASSES, EMAIL_STYLES } from "./email-colors";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";

interface ReviewRequestItem {
	productTitle: string;
	productSlug: string;
	productUrl: string;
	productImageUrl?: string | null;
}

interface ReviewRequestEmailProps {
	customerName: string;
	orderNumber: string;
	items: ReviewRequestItem[];
	unsubscribeUrl: string;
}

export const ReviewRequestEmail = ({
	customerName,
	orderNumber,
	items,
	unsubscribeUrl,
}: ReviewRequestEmailProps) => {
	const primaryItem = items[0];
	const primaryCTAHref = primaryItem?.productUrl;

	return (
		<EmailLayout
			preview="Ton avis compte beaucoup pour moi"
			footer={
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.tiny}>
					<Link href={unsubscribeUrl} style={{ ...EMAIL_STYLES.link, textDecoration: "underline" }}>
						Se désinscrire des emails commerciaux
					</Link>
				</Text>
			}
		>
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">Comment trouves-tu tes bijoux ?</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {customerName},
				</Text>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "8px" }}
				>
					Ta commande <strong>#{orderNumber}</strong> est arrivée chez toi il y a quelques jours.
					J&apos;espère que tu prends plaisir à porter tes pièces — j&apos;aimerais beaucoup savoir
					ce que tu en penses.
				</Text>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "8px" }}
				>
					Ton avis aide d&apos;autres clientes à choisir et m&apos;encourage à continuer de créer.
				</Text>
			</Section>

			{items.map((item) => (
				<Section key={item.productSlug} style={{ marginBottom: "16px", textAlign: "center" }}>
					{item.productImageUrl && (
						<Img
							src={item.productImageUrl}
							alt={item.productTitle}
							width={160}
							height={160}
							style={{
								borderRadius: "8px",
								margin: "0 auto 8px",
								objectFit: "cover",
							}}
						/>
					)}
					<Text
						className={EMAIL_CLASSES.text.body}
						style={{ ...EMAIL_STYLES.text.body, margin: "8px 0", fontWeight: 600 }}
					>
						{item.productTitle}
					</Text>
					<Link
						href={item.productUrl}
						style={{ ...EMAIL_STYLES.link, textDecoration: "underline" }}
					>
						Laisser un avis sur cette création
					</Link>
				</Section>
			))}

			{primaryCTAHref && (
				<EmailCTA href={primaryCTAHref} marginBottom="24px">
					Donner mon avis
				</EmailCTA>
			)}

			<Section style={{ marginBottom: "16px" }}>
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
					Quelques minutes suffisent — merci d&apos;avance ! Léane
				</Text>
			</Section>
		</EmailLayout>
	);
};

ReviewRequestEmail.PreviewProps = {
	customerName: "Marie",
	orderNumber: "SYN-2026-00042",
	items: [
		{
			productTitle: "Bague Éternité",
			productSlug: "bague-eternite",
			productUrl: "https://synclune.fr/creations/bague-eternite",
			productImageUrl: "https://utfs.io/f/example-bague-eternite.jpg",
		},
		{
			productTitle: "Bracelet Lune",
			productSlug: "bracelet-lune",
			productUrl: "https://synclune.fr/creations/bracelet-lune",
			productImageUrl: null,
		},
	],
	unsubscribeUrl: "https://synclune.fr/notifications/desinscription",
} as ReviewRequestEmailProps;

export default ReviewRequestEmail;
