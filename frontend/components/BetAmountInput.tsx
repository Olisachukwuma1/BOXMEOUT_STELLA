"use client";
import { useId } from "react";

export interface BetAmountInputProps {
  value: string;
  onChange: (val: string) => void;
  min: number;
  max: number;
  estimatedPayout: bigint | null;
  disabled?: boolean;
}

export function BetAmountInput({ value, onChange, min, max, estimatedPayout, disabled }: BetAmountInputProps): JSX.Element {
  const inputId: string = useId();
  const errorId: string = `${inputId}-error`;
  const payoutId: string = `${inputId}-payout`;

  const num = parseFloat(value);
  const error = value && (isNaN(num) || num < min || num > max)
    ? `Enter an amount between ${min} and ${max} XLM`
    : null;

  const showPayout = estimatedPayout !== null && !error;
  // Only reference IDs that are actually rendered, or axe flags a dangling target
  const describedBy = [error ? errorId : null, showPayout ? payoutId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-sm text-gray-400">
        Amount (XLM)
      </label>
      <input
        id={inputId}
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        step="any"
        inputMode="decimal"
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="w-full bg-gray-700 text-white rounded-lg px-3 h-11 border border-gray-600 focus:border-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        placeholder={`${min}–${max} XLM`}
      />
      {error && (
        <p id={errorId} role="alert" className="text-red-400 text-xs">
          {error}
        </p>
      )}
      {showPayout && (
        <p id={payoutId} className="text-xs text-gray-400">
          Est. payout: <span className="text-white">{(Number(estimatedPayout) / 1e7).toFixed(2)} XLM</span>
        </p>
      )}
    </div>
  );
}
