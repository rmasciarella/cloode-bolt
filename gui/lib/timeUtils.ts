/**
 * Time conversion utilities for OR-Tools scheduler
 * Converts between 15-minute interval indices (0-95) and human-readable time formats
 */

export interface TimeSlot {
  index: number;
  time24: string;
  time12: string;
}

/**
 * Convert 15-minute interval index to 24-hour time string
 * @param index - Time slot index (0-95, where 0 = 00:00, 95 = 23:45)
 * @returns Time string in HH:MM format
 */
export function indexToTime24(index: number): string {
  if (index < 0 || index > 95) {
    throw new Error('Time index must be between 0 and 95');
  }
  
  const hours = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Convert 15-minute interval index to 12-hour time string with AM/PM
 * @param index - Time slot index (0-95)
 * @returns Time string in h:MM AM/PM format
 */
export function indexToTime12(index: number): string {
  if (index < 0 || index > 95) {
    throw new Error('Time index must be between 0 and 95');
  }
  
  const hours24 = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const ampm = hours24 < 12 ? 'AM' : 'PM';
  
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Convert 24-hour time string to 15-minute interval index
 * @param timeStr - Time string in HH:MM format
 * @returns Time slot index (0-95)
 */
export function time24ToIndex(timeStr: string): number {
  const [hoursStr, minutesStr] = timeStr.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  
  if (hours < 0 || hours > 23) {
    throw new Error('Hours must be between 0 and 23');
  }
  
  if (minutes < 0 || minutes > 59) {
    throw new Error('Minutes must be between 0 and 59');
  }
  
  // Round minutes to nearest 15-minute interval
  const roundedMinutes = Math.round(minutes / 15) * 15;
  const adjustedHours = roundedMinutes === 60 ? hours + 1 : hours;
  const finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;
  
  if (adjustedHours > 23) {
    throw new Error('Time cannot exceed 23:59');
  }
  
  return adjustedHours * 4 + finalMinutes / 15;
}

/**
 * Convert 12-hour time string with AM/PM to 15-minute interval index
 * @param timeStr - Time string in h:MM AM/PM format
 * @returns Time slot index (0-95)
 */
export function time12ToIndex(timeStr: string): number {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    throw new Error('Invalid time format. Use h:MM AM/PM format');
  }
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  
  if (hours < 1 || hours > 12) {
    throw new Error('Hours must be between 1 and 12');
  }
  
  if (minutes < 0 || minutes > 59) {
    throw new Error('Minutes must be between 0 and 59');
  }
  
  // Convert to 24-hour format
  if (ampm === 'AM' && hours === 12) {
    hours = 0;
  } else if (ampm === 'PM' && hours !== 12) {
    hours += 12;
  }
  
  return time24ToIndex(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
}

/**
 * Generate all possible time slots for dropdown selection
 * @returns Array of time slot objects with index, 24-hour, and 12-hour formats
 */
export function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  
  for (let i = 0; i <= 95; i++) {
    slots.push({
      index: i,
      time24: indexToTime24(i),
      time12: indexToTime12(i)
    });
  }
  
  return slots;
}

/**
 * Get common work shift presets
 */
export const SHIFT_PRESETS = {
  MORNING: { start: 32, end: 64, name: '8:00 AM - 4:00 PM' }, // 8 AM to 4 PM
  AFTERNOON: { start: 56, end: 88, name: '2:00 PM - 10:00 PM' }, // 2 PM to 10 PM  
  NIGHT: { start: 88, end: 120, name: '10:00 PM - 6:00 AM' }, // 10 PM to 6 AM (next day)
  FULL_DAY: { start: 0, end: 95, name: '12:00 AM - 11:45 PM' }, // Full day
  BUSINESS: { start: 36, end: 68, name: '9:00 AM - 5:00 PM' }, // 9 AM to 5 PM
} as const;

/**
 * Validate time index is within valid range
 */
export function isValidTimeIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index <= 95;
}

/**
 * Get time range description
 */
export function getTimeRangeDescription(startIndex: number, endIndex: number): string {
  if (!isValidTimeIndex(startIndex) || !isValidTimeIndex(endIndex)) {
    return 'Invalid time range';
  }
  
  return `${indexToTime12(startIndex)} - ${indexToTime12(endIndex)}`;
}