/** Nigerian banks offered in the payout form. Free text is still accepted by the server. */
export const NIGERIAN_BANKS = [
  'Access Bank',
  'Citibank Nigeria',
  'Ecobank Nigeria',
  'Fidelity Bank',
  'First Bank of Nigeria',
  'First City Monument Bank (FCMB)',
  'Globus Bank',
  'Guaranty Trust Bank (GTBank)',
  'Heritage Bank',
  'Keystone Bank',
  'Kuda Microfinance Bank',
  'Moniepoint Microfinance Bank',
  'OPay',
  'PalmPay',
  'Polaris Bank',
  'Providus Bank',
  'Stanbic IBTC Bank',
  'Standard Chartered Bank',
  'Sterling Bank',
  'SunTrust Bank',
  'Union Bank',
  'United Bank for Africa (UBA)',
  'Unity Bank',
  'Wema Bank',
  'Zenith Bank',
] as const;

export interface PayoutInput {
  bank: string;
  accountNumber: string;
  accountName: string;
}

export type PayoutErrors = Partial<Record<keyof PayoutInput, string>>;

/** Strips spaces/dashes so "0123 456-789" is accepted. */
export function cleanAccountNumber(raw: string): string {
  return raw.replace(/[\s-]/g, '');
}

/** Mirrors the server's checks so people get instant feedback; the server is still the authority. */
export function validatePayout(input: PayoutInput): PayoutErrors {
  const errors: PayoutErrors = {};
  const bank = input.bank.trim();
  const name = input.accountName.replace(/\s+/g, ' ').trim();
  if (bank.length < 2 || bank.length > 80) errors.bank = 'Choose your bank';
  if (!/^[0-9]{10}$/.test(cleanAccountNumber(input.accountNumber))) errors.accountNumber = 'Account number must be 10 digits';
  if (name.length < 3 || name.length > 100) errors.accountName = 'Enter the name on the account';
  return errors;
}

/** "Sun 22 Nov, 11:59 PM" in the competition's timezone. */
export function formatDeadline(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const text = new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
  return d.getTime() < now.getTime() ? `${text} (passed)` : text;
}

/** "6 days left", "5 hours left", "40 minutes left", or null once passed. */
export function timeLeft(iso: string, now: Date = new Date()): string | null {
  const ms = new Date(iso).getTime() - now.getTime();
  if (ms <= 0) return null;
  const mins = Math.ceil(ms / 60_000);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} left`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'} left`;
  const days = Math.floor(hours / 24);
  return `${days} days left`;
}

export const ORDINAL: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' };

/** 2500, 'NGN' -> "₦2,500" */
export function formatMoney(amount: number, currency = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}
