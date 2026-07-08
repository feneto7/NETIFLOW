import React from "react";
import { X } from "lucide-react";

export function Modal({
  title,
  onClose,
  icon,
  wide,
  children,
}: {
  title: string;
  onClose: () => void;
  icon?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl ${
          wide ? "max-w-2xl" : "max-w-md"
        } w-full max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center sticky top-0 bg-zinc-900 z-10">
          <div className="flex items-center gap-2">
            <div className="text-zinc-400">{icon}</div>
            <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
