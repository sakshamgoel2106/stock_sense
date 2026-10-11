export const MNC_COUNTRIES = [
  {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    currency: 'INR',
    currencySymbol: '₹',
    locale: 'en-IN',
    taxSystem: 'GST',
    taxIdName: 'GSTIN',
    taxIdPlaceholder: '27ABCDE1234F1Z5',
    defaultTaxRates: [0, 5, 12, 18, 28],
    defaultRate: 18,
    paymentMethods: [
      { id: 'UPI', label: 'UPI / QR Code' },
      { id: 'BANK_TRANSFER', label: 'NEFT / RTGS / IMPS' },
      { id: 'CASH', label: 'Cash in Hand' },
      { id: 'CREDIT_CARD', label: 'Corporate Card' },
      { id: 'CHEQUE', label: 'Cheque' }
    ]
  },
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    currency: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    taxSystem: 'SALES_TAX',
    taxIdName: 'Federal EIN / Tax ID',
    taxIdPlaceholder: '12-3456789',
    defaultTaxRates: [0, 4, 6, 7.25, 8.875],
    defaultRate: 7.25,
    paymentMethods: [
      { id: 'ACH', label: 'ACH Direct Debit' },
      { id: 'WIRE_TRANSFER', label: 'Domestic / Fedwire' },
      { id: 'CREDIT_CARD', label: 'Credit Card (Stripe)' },
      { id: 'CHECK', label: 'Company Check' }
    ]
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    currency: 'GBP',
    currencySymbol: '£',
    locale: 'en-GB',
    taxSystem: 'VAT',
    taxIdName: 'HMRC VAT Reg No',
    taxIdPlaceholder: 'GB 123 4567 89',
    defaultTaxRates: [0, 5, 20],
    defaultRate: 20,
    paymentMethods: [
      { id: 'BACS', label: 'BACS / Faster Payments' },
      { id: 'WIRE_TRANSFER', label: 'CHAPS / Wire' },
      { id: 'CREDIT_CARD', label: 'Debit / Credit Card' }
    ]
  },
  {
    code: 'DE',
    name: 'Germany (EU)',
    flag: '🇩🇪',
    currency: 'EUR',
    currencySymbol: '€',
    locale: 'de-DE',
    taxSystem: 'VAT',
    taxIdName: 'USt-IdNr / VAT ID',
    taxIdPlaceholder: 'DE 123456789',
    defaultTaxRates: [0, 7, 19],
    defaultRate: 19,
    paymentMethods: [
      { id: 'SEPA', label: 'SEPA Credit Transfer' },
      { id: 'WIRE_TRANSFER', label: 'International Wire' },
      { id: 'CREDIT_CARD', label: 'Corporate Card' }
    ]
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    currency: 'AED',
    currencySymbol: 'د.إ',
    locale: 'ar-AE',
    taxSystem: 'VAT',
    taxIdName: 'FTA TRN (Tax Reg No)',
    taxIdPlaceholder: '100 1234 5678 00003',
    defaultTaxRates: [0, 5],
    defaultRate: 5,
    paymentMethods: [
      { id: 'WIRE_TRANSFER', label: 'UAE Central Bank Wire / IBAN' },
      { id: 'CREDIT_CARD', label: 'Credit Card' },
      { id: 'CASH', label: 'Cash in AED' }
    ]
  },
  {
    code: 'SG',
    name: 'Singapore',
    flag: '🇸🇬',
    currency: 'SGD',
    currencySymbol: 'S$',
    locale: 'en-SG',
    taxSystem: 'GST',
    taxIdName: 'IRAS GST / UEN',
    taxIdPlaceholder: '201912345A',
    defaultTaxRates: [0, 9],
    defaultRate: 9,
    paymentMethods: [
      { id: 'PAYNOW', label: 'PayNow Corporate' },
      { id: 'FAST', label: 'FAST / GIRO' },
      { id: 'WIRE_TRANSFER', label: 'International Wire' }
    ]
  }
];

export const GLOBAL_COUNTRY = {
  code: 'ALL',
  name: 'Global (All Countries)',
  flag: '🌐',
  currency: 'USD',
  currencySymbol: '$',
  taxSystem: 'GLOBAL'
};

export const getCountryByCode = (code) => {
  if (!code || code.toUpperCase() === 'ALL') return GLOBAL_COUNTRY;
  const found = MNC_COUNTRIES.find(c => c.code.toUpperCase() === code.toUpperCase());
  return found || MNC_COUNTRIES[0];
};

export const formatCurrency = (amount, currency = 'INR', symbol = '₹') => {
  if (amount === undefined || amount === null || isNaN(amount)) return `${symbol}0.00`;
  const num = Number(amount);
  
  if (currency === 'INR') {
    return `${symbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (currency === 'USD') {
    return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (currency === 'GBP') {
    return `${symbol}${num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (currency === 'EUR') {
    return `${symbol}${num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (currency === 'AED') {
    return `${symbol} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (currency === 'SGD') {
    return `${symbol}${num.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
