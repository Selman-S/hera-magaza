/** T.C. Kimlik No: 11 hane, ilk hane 0 değil, 10. ve 11. haneler algoritmaya uygun. */
export function isValidTCKN(value: string): boolean {
  if (!/^[1-9]\d{10}$/.test(value)) return false;
  const d = value.split("").map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const d10 = (((odd * 7 - even) % 10) + 10) % 10;
  if (d10 !== d[9]) return false;
  const d11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return d11 === d[10];
}

/** Vergi Kimlik No: 10 hane, Gelir İdaresi kontrol algoritması. */
export function isValidVKN(value: string): boolean {
  if (!/^\d{10}$/.test(value)) return false;
  const d = value.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const tmp = (d[i] + 10 - (i + 1)) % 10;
    if (tmp === 9) {
      sum += 9;
    } else {
      sum += (tmp * 2 ** (10 - (i + 1))) % 9;
    }
  }
  return (10 - (sum % 10)) % 10 === d[9];
}

/** Türkiye cep telefonu: 5XX XXX XX XX (başında 0 veya +90 olabilir). Normalize edilmiş 10 haneyi döndürür. */
export function normalizeTRMobile(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("90") && digits.length === 12 ? digits.slice(2) : digits.startsWith("0") ? digits.slice(1) : digits;
  return /^5\d{9}$/.test(local) ? local : null;
}
