export function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function parseDateOfBirth(
  day: number,
  month: number,
  year: number
): Date | null {
  if (!day || !month || !year) return null;
  const date = new Date(year, month - 1, day);
  // Validate that the date exists (e.g., Feb 30 rolls over)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}