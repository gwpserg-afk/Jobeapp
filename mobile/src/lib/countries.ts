// Country dial codes for the phone input. Senegal first (home market), then
// West Africa & the wider region, then common international. Flags are emoji
// (regional-indicator pairs) so no image assets are needed.
export type Country = { code: string; name: string; dial: string; flag: string };

export const COUNTRIES: Country[] = [
  { code: "SN", name: "Sénégal", dial: "+221", flag: "🇸🇳" },
  { code: "CI", name: "Côte d'Ivoire", dial: "+225", flag: "🇨🇮" },
  { code: "ML", name: "Mali", dial: "+223", flag: "🇲🇱" },
  { code: "GN", name: "Guinée", dial: "+224", flag: "🇬🇳" },
  { code: "BF", name: "Burkina Faso", dial: "+226", flag: "🇧🇫" },
  { code: "GM", name: "Gambie", dial: "+220", flag: "🇬🇲" },
  { code: "MR", name: "Mauritanie", dial: "+222", flag: "🇲🇷" },
  { code: "TG", name: "Togo", dial: "+228", flag: "🇹🇬" },
  { code: "BJ", name: "Bénin", dial: "+229", flag: "🇧🇯" },
  { code: "NE", name: "Niger", dial: "+227", flag: "🇳🇪" },
  { code: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬" },
  { code: "GH", name: "Ghana", dial: "+233", flag: "🇬🇭" },
  { code: "CM", name: "Cameroun", dial: "+237", flag: "🇨🇲" },
  { code: "CD", name: "RD Congo", dial: "+243", flag: "🇨🇩" },
  { code: "GA", name: "Gabon", dial: "+241", flag: "🇬🇦" },
  { code: "MA", name: "Maroc", dial: "+212", flag: "🇲🇦" },
  { code: "DZ", name: "Algérie", dial: "+213", flag: "🇩🇿" },
  { code: "TN", name: "Tunisie", dial: "+216", flag: "🇹🇳" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { code: "BE", name: "Belgique", dial: "+32", flag: "🇧🇪" },
  { code: "ES", name: "Espagne", dial: "+34", flag: "🇪🇸" },
  { code: "IT", name: "Italie", dial: "+39", flag: "🇮🇹" },
  { code: "DE", name: "Allemagne", dial: "+49", flag: "🇩🇪" },
  { code: "GB", name: "Royaume-Uni", dial: "+44", flag: "🇬🇧" },
  { code: "US", name: "États-Unis", dial: "+1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { code: "CN", name: "Chine", dial: "+86", flag: "🇨🇳" },
  { code: "AE", name: "Émirats arabes unis", dial: "+971", flag: "🇦🇪" },
  { code: "SA", name: "Arabie saoudite", dial: "+966", flag: "🇸🇦" },
  { code: "TR", name: "Turquie", dial: "+90", flag: "🇹🇷" },
  { code: "IN", name: "Inde", dial: "+91", flag: "🇮🇳" },
  { code: "BR", name: "Brésil", dial: "+55", flag: "🇧🇷" },
  { code: "ZA", name: "Afrique du Sud", dial: "+27", flag: "🇿🇦" },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // Senegal
