/**
 * Para yardımcıları. Tüm tutarlar kuruş cinsinden tam sayıdır (119900 = 1.199,00 TL).
 * Ondalık para hesabı yapılmaz; yüzde hesapları tam sayıya yuvarlanır.
 */

const formatterWhole = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const formatterCents = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function assertKurus(kurus: number): void {
  if (!Number.isSafeInteger(kurus)) {
    throw new TypeError(`Kuruş tutarı tam sayı olmalı: ${kurus}`);
  }
}

/** 119900 → "1.199 TL", 119950 → "1.199,50 TL", -5000 → "-50 TL" */
export function formatTRY(kurus: number): string {
  assertKurus(kurus);
  const sign = kurus < 0 ? "-" : "";
  const abs = Math.abs(kurus);
  const lira = abs / 100;
  const text = abs % 100 === 0 ? formatterWhole.format(lira) : formatterCents.format(lira);
  return `${sign}${text} TL`;
}

/** Bir tutarın yüzdesini kuruş olarak döndürür; kesirli kuruş aşağı yuvarlanır. */
export function percentOf(kurus: number, percent: number): number {
  assertKurus(kurus);
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new RangeError(`Yüzde 0–100 arası tam sayı olmalı: ${percent}`);
  }
  return Math.floor((kurus * percent) / 100);
}

export function sumKurus(values: readonly number[]): number {
  return values.reduce((total, value) => {
    assertKurus(value);
    return total + value;
  }, 0);
}
