const TR_MAP: Record<string, string> = {
  ı: "i",
  İ: "i",
  I: "i",
  ş: "s",
  Ş: "s",
  ğ: "g",
  Ğ: "g",
  ü: "u",
  Ü: "u",
  ö: "o",
  Ö: "o",
  ç: "c",
  Ç: "c",
  â: "a",
  Â: "a",
  î: "i",
  Î: "i",
  û: "u",
  Û: "u",
};

/** Türkçe karakterleri ASCII karşılığına çevirip küçük harfe indirir ("İpek Şal" → "ipek sal"). */
export function toAsciiLower(input: string): string {
  return input
    .replace(/[ıİIşŞğĞüÜöÖçÇâÂîÎûÛ]/g, (ch) => TR_MAP[ch] ?? ch)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** "Van Gogh Badem Çiçeği İpek Şal 70×175" → "van-gogh-badem-cicegi-ipek-sal-70x175" */
export function slugify(input: string): string {
  return toAsciiLower(input)
    .replace(/×/g, "x")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
