/**
 * Yönetim panelinde TL olarak yazılan tutarı kuruşa çevirir. Ondalık sayı aritmetiği kullanılmaz;
 * metin parçalanarak tam sayıya çevrilir.
 * "1.199" → 119900, "1199,50" → 119950, "1.199,5" → 119950, "850 TL" → 85000, "" → null
 */
export function parseTRYToKurus(input: string): number | null {
  const cleaned = input.replace(/\s|TL|₺/gi, "");
  if (!cleaned) return null;
  // Türkçe biçim: binlik "." ve ondalık ",". Sadece nokta varsa ve 3 haneli gruplar halindeyse binlik sayılır.
  let intPart: string;
  let fracPart = "";
  if (cleaned.includes(",")) {
    const [a, b, ...rest] = cleaned.split(",");
    if (rest.length) return null;
    intPart = a.replace(/\./g, "");
    fracPart = b;
  } else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    intPart = cleaned.replace(/\./g, "");
  } else if (/^\d+\.\d{1,2}$/.test(cleaned)) {
    [intPart, fracPart] = cleaned.split(".");
  } else {
    intPart = cleaned;
  }
  if (!/^\d+$/.test(intPart) || !/^\d{0,2}$/.test(fracPart)) return null;
  const kurus = Number(intPart) * 100 + Number(fracPart.padEnd(2, "0") || "0");
  return Number.isSafeInteger(kurus) ? kurus : null;
}

/** Kuruşu formda gösterilecek TL metnine çevirir: 119900 → "1199", 119950 → "1199,50" */
export function kurusToInput(kurus: number | null | undefined): string {
  if (kurus === null || kurus === undefined) return "";
  const lira = Math.trunc(kurus / 100);
  const frac = kurus % 100;
  return frac ? `${lira},${String(frac).padStart(2, "0")}` : String(lira);
}
