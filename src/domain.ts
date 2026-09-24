export type SpaceId = 'atelier' | 'forum' | 'fokus';

export interface Space {
  id: SpaceId;
  number: string;
  name: string;
  label: string;
  description: string;
  capacity: number;
  rate: number;
  features: string[];
}

export const spaces: readonly Space[] = [
  {
    id: 'atelier',
    number: '01',
    name: 'Atelier',
    label: 'Untuk ide yang sedang tumbuh',
    description: 'Meja panjang, papan tulis, dan ruang untuk menyusun gagasan bersama.',
    capacity: 8,
    rate: 125_000,
    features: ['Papan tulis', 'Layar presentasi', 'Wi-Fi'],
  },
  {
    id: 'forum',
    number: '02',
    name: 'Forum',
    label: 'Untuk percakapan yang lebih besar',
    description: 'Susunan fleksibel untuk diskusi tim, lokakarya, dan sesi berbagi.',
    capacity: 14,
    rate: 175_000,
    features: ['Proyektor', 'Audio', 'Wi-Fi'],
  },
  {
    id: 'fokus',
    number: '03',
    name: 'Fokus',
    label: 'Untuk pekerjaan yang butuh tenang',
    description: 'Ruang kecil yang hangat untuk rapat inti dan pekerjaan mendalam.',
    capacity: 4,
    rate: 95_000,
    features: ['Monitor', 'Kopi', 'Wi-Fi'],
  },
] as const;

export const times = ['09:00', '11:00', '13:00', '15:00'] as const;
export type SlotTime = (typeof times)[number];

export function dateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return dateISO(date);
}

export function dateFromISO(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(dateFromISO(value));
}

export function money(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(value);
}
