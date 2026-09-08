/**
 * Utility formatters for Indonesian currency, numbers, dates, and spelling (terbilang).
 */

export function formatRupiah(amount: number): string {
  if (isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number): string {
  if (isNaN(value)) return '0';
  return new Intl.NumberFormat('id-ID').format(value);
}

export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

function konversi(nilai: number): string {
  const n = Math.floor(Math.abs(nilai));
  if (n < 12) {
    return satuan[n];
  } else if (n < 20) {
    return konversi(n - 10) + ' Belas';
  } else if (n < 100) {
    return konversi(Math.floor(n / 10)) + ' Puluh ' + konversi(n % 10);
  } else if (n < 200) {
    return 'Seratus ' + konversi(n - 100);
  } else if (n < 1000) {
    return konversi(Math.floor(n / 100)) + ' Ratus ' + konversi(n % 100);
  } else if (n < 2000) {
    return 'Seribu ' + konversi(n - 1000);
  } else if (n < 1000000) {
    return konversi(Math.floor(n / 1000)) + ' Ribu ' + konversi(n % 1000);
  } else if (n < 1000000000) {
    return konversi(Math.floor(n / 1000000)) + ' Juta ' + konversi(n % 1000000);
  } else if (n < 1000000000000) {
    return konversi(Math.floor(n / 1000000000)) + ' Milyar ' + konversi(n % 1000000000);
  } else {
    return konversi(Math.floor(n / 1000000000000)) + ' Triliun ' + konversi(n % 1000000000000);
  }
}

export function terbilang(amount: number): string {
  if (!amount || amount === 0) return 'Nol Rupiah';
  const hasil = konversi(amount).trim().replace(/\s+/g, ' ');
  return hasil + ' Rupiah';
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
