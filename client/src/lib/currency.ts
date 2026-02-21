export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

const currencyMap: Record<string, CurrencyInfo> = {
  JPY: { code: "JPY", name: "日本円", symbol: "¥" },
  USD: { code: "USD", name: "米ドル", symbol: "$" },
  EUR: { code: "EUR", name: "ユーロ", symbol: "€" },
  GBP: { code: "GBP", name: "英ポンド", symbol: "£" },
  CNY: { code: "CNY", name: "人民元", symbol: "¥" },
  KRW: { code: "KRW", name: "韓国ウォン", symbol: "₩" },
  TWD: { code: "TWD", name: "台湾ドル", symbol: "NT$" },
  AUD: { code: "AUD", name: "豪ドル", symbol: "A$" },
  CAD: { code: "CAD", name: "カナダドル", symbol: "C$" },
  CHF: { code: "CHF", name: "スイスフラン", symbol: "CHF" },
  SGD: { code: "SGD", name: "シンガポールドル", symbol: "S$" },
  HKD: { code: "HKD", name: "香港ドル", symbol: "HK$" },
  THB: { code: "THB", name: "タイバーツ", symbol: "฿" },
  INR: { code: "INR", name: "インドルピー", symbol: "₹" },
  BRL: { code: "BRL", name: "ブラジルレアル", symbol: "R$" },
  MXN: { code: "MXN", name: "メキシコペソ", symbol: "MX$" },
};

export function getCurrencyInfo(code: string): CurrencyInfo {
  return currencyMap[code] || { code, name: code, symbol: code };
}

export function getCurrencyLabel(code: string): string {
  const info = getCurrencyInfo(code);
  if (info.name === code) return code;
  return `${code}（${info.name} ${info.symbol}）`;
}

export function getCurrencyShortLabel(code: string): string {
  const info = getCurrencyInfo(code);
  if (info.name === code) return code;
  return `${info.symbol} ${code}`;
}

export const allCurrencyCodes = Object.keys(currencyMap);
