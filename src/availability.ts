import { dateFromISO, times, type SlotTime, type SpaceId } from './domain';
import type { Booking } from './storage';

export interface AvailabilityRules {
  weeklyBlocked: Record<SpaceId, Partial<Record<string, SlotTime[]>>>;
}

export async function fetchAvailability(signal?: AbortSignal): Promise<AvailabilityRules> {
  const response = await fetch('/availability.json', { signal });
  if (!response.ok) throw new Error('Jadwal belum dapat dimuat. Coba lagi.');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('weeklyBlocked' in data)) {
    throw new Error('Format data jadwal tidak sesuai.');
  }
  const rules = (data as AvailabilityRules).weeklyBlocked;
  if (!rules || !['atelier', 'forum', 'fokus'].every(id => typeof rules[id as SpaceId] === 'object')) {
    throw new Error('Format data jadwal tidak sesuai.');
  }
  return { weeklyBlocked: rules };
}

export function availableTimes(
  rules: AvailabilityRules,
  spaceId: SpaceId,
  date: string,
  bookings: readonly Booking[],
): SlotTime[] {
  const day = String(dateFromISO(date).getDay());
  const blocked = rules.weeklyBlocked[spaceId]?.[day] ?? [];
  const taken = bookings.filter(booking => booking.spaceId === spaceId && booking.date === date).map(booking => booking.time);
  return times.filter(time => !blocked.includes(time) && !taken.includes(time));
}
