import type { SlotTime, SpaceId } from './domain';

export interface Booking {
  id: string;
  spaceId: SpaceId;
  date: string;
  time: SlotTime;
  name: string;
  email: string;
  attendees: number;
  purpose: string;
  createdAt: string;
}

const key = 'sela-bookings-v1';

export function readBookings(): Booking[] {
  try {
    const value = localStorage.getItem(key);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(item =>
      item && typeof item.id === 'string' && typeof item.spaceId === 'string' &&
      typeof item.date === 'string' && typeof item.time === 'string',
    ) as Booking[] : [];
  } catch {
    return [];
  }
}

export class SlotConflictError extends Error {}

export function saveBooking(booking: Booking): void {
  const bookings = readBookings();
  if (bookings.some(item => item.spaceId === booking.spaceId && item.date === booking.date && item.time === booking.time)) {
    throw new SlotConflictError('Slot ini sudah dipakai di browser ini. Pilih waktu lain.');
  }
  localStorage.setItem(key, JSON.stringify([...bookings, booking]));
}
