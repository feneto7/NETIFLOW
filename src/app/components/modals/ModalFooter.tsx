import React from "react";

export function ModalFooter({
  onCancel,
  submitLabel,
  submitColor,
  disabled,
}: {
  onCancel: () => void;
  onSubmit?: () => void;
  submitLabel: string;
  submitColor: "blue" | "emerald";
  disabled?: boolean;
}) {
  const colorClasses =
    submitColor === "emerald"
      ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
      : "bg-blue-500 hover:bg-blue-400 text-zinc-950";

  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 px-4 py-2.5 border border-zinc-800 bg-zinc-950 text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={disabled}
        className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${colorClasses} ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {submitLabel}
      </button>
    </div>
  );
}
