/** Opciones de diseño compartidas entre el editor (cliente) y el render (servidor). */

export const LANDING_LAYOUTS = ["split-left", "split-right", "stacked", "centered"] as const;
export const LANDING_IMAGE_FITS = ["contain", "cover"] as const;
export const LANDING_HEADLINE_SIZES = ["sm", "md", "lg", "xl"] as const;
export const LANDING_BUTTON_STYLES = ["solid", "outline"] as const;
export const LANDING_SPACINGS = ["compact", "normal", "wide"] as const;
export const LANDING_EFFECTS = ["none", "snow", "newyear", "halloween", "carnival", "birthday", "custom"] as const;

export type LandingDesignDTO = {
  layout: (typeof LANDING_LAYOUTS)[number];
  imageFit: (typeof LANDING_IMAGE_FITS)[number];
  imageHeight: number;
  imageRadius: number;
  imagePositionX: number;
  imagePositionY: number;
  imageZoom: number;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
  eyebrow: string;
  badgeText: string;
  buttonText: string;
  priceLabel: string;
  priceText: string;
  oldPriceText: string;
  discountText: string;
  footerText: string;
  headlineSize: (typeof LANDING_HEADLINE_SIZES)[number];
  buttonStyle: (typeof LANDING_BUTTON_STYLES)[number];
  spacing: (typeof LANDING_SPACINGS)[number];
  showBadge: boolean;
  showReference: boolean;
  showPrice: boolean;
  showWhatsapp: boolean;
  showBenefits: boolean;
  showFaqs: boolean;
  showFooter: boolean;
  showSummary: boolean;
  showVariants: boolean;
  effect: (typeof LANDING_EFFECTS)[number];
  effectIntensity: number;
  effectSpeed: number;
  effectEmoji: string;
};

export const DEFAULT_LANDING_DESIGN: LandingDesignDTO = {
  layout: "split-left",
  imageFit: "contain",
  imageHeight: 420,
  imageRadius: 16,
  imagePositionX: 50,
  imagePositionY: 50,
  imageZoom: 100,
  primaryColor: "#4f46e5",
  backgroundColor: "#ffffff",
  textColor: "#0f172a",
  buttonColor: "#4f46e5",
  buttonTextColor: "#ffffff",
  eyebrow: "",
  badgeText: "TIENDA OFICIAL",
  buttonText: "Hablar por WhatsApp",
  priceLabel: "PRECIO",
  priceText: "",
  oldPriceText: "",
  discountText: "",
  footerText: "Escríbenos para resolver tus consultas sobre este producto.",
  headlineSize: "lg",
  buttonStyle: "solid",
  spacing: "normal",
  showBadge: true,
  showReference: true,
  showPrice: true,
  showWhatsapp: true,
  showBenefits: true,
  showFaqs: true,
  showFooter: true,
  showSummary: true,
  showVariants: true,
  effect: "none",
  effectIntensity: 2,
  effectSpeed: 2,
  effectEmoji: "✨",
};
