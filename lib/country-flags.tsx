import React from "react";

// Карта названий стран (RU/EN, распространённые синонимы) -> ISO2
const COUNTRY_NAME_TO_ISO2: Record<string, string> = {
  // Англоязычные
  "russia": "ru",
  "russian federation": "ru",
  "usa": "us",
  "u.s.a": "us",
  "united states": "us",
  "united states of america": "us",
  "uk": "gb",
  "united kingdom": "gb",
  "england": "gb",
  "great britain": "gb",
  "germany": "de",
  "france": "fr",
  "spain": "es",
  "italy": "it",
  "canada": "ca",
  "australia": "au",
  "japan": "jp",
  "china": "cn",
  "south korea": "kr",
  "korea": "kr",
  "india": "in",
  "turkey": "tr",
  "poland": "pl",
  "netherlands": "nl",
  "sweden": "se",
  "norway": "no",
  "denmark": "dk",
  "finland": "fi",
  "czech republic": "cz",
  "czechia": "cz",
  "slovakia": "sk",
  "switzerland": "ch",
  "austria": "at",
  "romania": "ro",
  "bulgaria": "bg",
  "greece": "gr",
  "portugal": "pt",
  "mexico": "mx",
  "brazil": "br",
  "argentina": "ar",
  "chile": "cl",
  "south africa": "za",
  "indonesia": "id",
  "malaysia": "my",
  "thailand": "th",
  "vietnam": "vn",
  "philippines": "ph",
  "saudi arabia": "sa",
  "uae": "ae",
  "united arab emirates": "ae",
  "egypt": "eg",
  "iran": "ir",
  "ireland": "ie",
  "iceland": "is",
  "belgium": "be",
  "hungary": "hu",
  "serbia": "rs",
  "croatia": "hr",
  "slovenia": "si",
  "estonia": "ee",
  "latvia": "lv",
  "lithuania": "lt",

  // Русскоязычные
  "россия": "ru",
  "рф": "ru",
  "сша": "us",
  "соединённые штаты": "us",
  "соединенные штаты": "us",
  "великобритания": "gb",
  "англия": "gb",
  "германия": "de",
  "франция": "fr",
  "испания": "es",
  "италия": "it",
  "канада": "ca",
  "австралия": "au",
  "япония": "jp",
  "китай": "cn",
  "южная корея": "kr",
  "корея": "kr",
  "индия": "in",
  "турция": "tr",
  "польша": "pl",
  "нидерланды": "nl",
  "голландия": "nl",
  "швеция": "se",
  "норвегия": "no",
  "дания": "dk",
  "финляндия": "fi",
  "чехия": "cz",
  "чешская республика": "cz",
  "словакия": "sk",
  "швейцария": "ch",
  "австрия": "at",
  "румыния": "ro",
  "болгария": "bg",
  "греция": "gr",
  "португалия": "pt",
  "мексика": "mx",
  "бразилия": "br",
  "аргентина": "ar",
  "чили": "cl",
  "юар": "za",
  "индонезия": "id",
  "малайзия": "my",
  "таиланд": "th",
  "вьетнам": "vn",
  "филиппины": "ph",
  "саудовская аравия": "sa",
  "оаэ": "ae",
  "египет": "eg",
  "иран": "ir",
  "ирландия": "ie",
  "исландия": "is",
  "бельгия": "be",
  "венгрия": "hu",
  "сербия": "rs",
  "хорватия": "hr",
  "словения": "si",
  "эстония": "ee",
  "латвия": "lv",
  "литва": "lt",
  "украина": "ua",
  "беларусь": "by",
  "казахстан": "kz",
  "грузия": "ge",
  "армения": "am",
  "азербайджан": "az",
};

function normalizeCountryName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[().]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ё/g, "е");
}

function valueToIso2(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const lower = normalizeCountryName(v);
  // ISO2 код (две буквы)
  if (/^[a-zA-Z]{2}$/.test(v)) return v.toLowerCase();
  // Частые псевдокоды
  if (/^uk$/i.test(v)) return "gb";
  if (/^usa$/i.test(v) || /^u\.?s\.?a$/i.test(v)) return "us";
  // Маппинг по словарю
  return COUNTRY_NAME_TO_ISO2[lower] || null;
}

export function extractCountryCodes(
  country: string | string[] | undefined | null
): string[] {
  if (!country) return [];
  const values = Array.isArray(country)
    ? country
    : String(country)
        .split(/[,/|]/)
        .map((s) => s.trim())
        .filter(Boolean);
  const codes = values
    .map((v) => valueToIso2(v))
    .filter((c): c is string => !!c);
  // Уникальные в порядке появления
  return Array.from(new Set(codes));
}

// Локальные переопределения названий стран (RU)
const COUNTRY_LABEL_OVERRIDES_RU: Record<string, string> = {
  us: "США",
};

export function getCountryLabel(
  country: string | string[] | undefined | null,
  locale: string = "ru"
): string | null {
  const codes = extractCountryCodes(country);
  if (codes.length > 0) {
    try {
      const code = codes[0].toLowerCase();
      // Сначала пробуем локальные переопределения
      if (locale === "ru" && COUNTRY_LABEL_OVERRIDES_RU[code]) {
        return COUNTRY_LABEL_OVERRIDES_RU[code];
      }
      const regionNames = new Intl.DisplayNames([locale], { type: "region" });
      const name = regionNames.of(code.toUpperCase());
      if (name) return name;
    } catch (_) {
      // noop
    }
  }
  if (!country) return null;
  const values = Array.isArray(country)
    ? country
    : String(country)
        .split(/[,/|]/)
        .map((s) => s.trim())
        .filter(Boolean);
  return values[0] || null;
}

type CountryFlagProps = {
  country?: string | string[] | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  title?: string;
};

export function CountryFlag({
  country,
  size = "sm",
  className,
  title,
}: CountryFlagProps) {
  const codes = extractCountryCodes(country);
  if (codes.length === 0) return null;
  const code = codes[0]; // Показываем первый флаг

  const sizeMap = {
    sm: { w: 16, h: 12 },
    md: { w: 20, h: 15 },
    lg: { w: 24, h: 18 },
  } as const;
  const { w, h } = sizeMap[size] || sizeMap.sm;

  return (
    <span
      className={`fi fi-${code} inline-block align-middle ${className || ""}`}
      style={{ width: w, height: h }}
      aria-label={title || code.toUpperCase()}
      title={title || code.toUpperCase()}
    />
  );
}

export default CountryFlag;