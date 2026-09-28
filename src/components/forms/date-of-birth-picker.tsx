"use client";

import { useMemo, useState, useEffect } from "react";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export type DateOfBirth = {
  day: number | null;
  month: number | null;
  year: number | null;
};

export function DateOfBirthPicker({
  value,
  onChange,
  label = "Date of birth",
  helpText,
}: {
  value: DateOfBirth;
  onChange: (v: DateOfBirth) => void;
  label?: string;
  helpText?: string;
}) {
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear - 5; // youngest allowed (5 yrs old)
  const minYear = currentYear - 120; // oldest allowed (120 yrs old)

  // Generate year options (descending order — newest first)
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = maxYear; y >= minYear; y--) arr.push(y);
    return arr;
  }, [maxYear, minYear]);

  // Day options depend on month + year (handles Feb 28/29, 30-day months, etc.)
  const days = useMemo(() => {
    if (!value.month || !value.year) return Array.from({ length: 31 }, (_, i) => i + 1);
    const daysInMonth = new Date(value.year, value.month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [value.month, value.year]);

  // Reset day if it exceeds the new month's max
  useEffect(() => {
    if (value.day && days.length < value.day) {
      onChange({ ...value, day: days.length });
    }
  }, [days, value, onChange]);

  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-2">
        {label}
      </label>
      <div className="grid grid-cols-3 gap-2">
        {/* Day */}
        <select
          value={value.day ?? ""}
          onChange={(e) =>
            onChange({ ...value, day: e.target.value ? Number(e.target.value) : null })
          }
          className="px-3 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-[15px] text-stone-800"
        >
          <option value="">Day</option>
          {days.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* Month */}
        <select
          value={value.month ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              month: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="px-3 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-[15px] text-stone-800"
        >
          <option value="">Month</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>

        {/* Year */}
        <select
          value={value.year ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              year: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="px-3 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-[15px] text-stone-800"
        >
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {helpText && (
        <p className="text-xs text-stone-500 mt-2 leading-relaxed">{helpText}</p>
      )}
    </div>
  );
}