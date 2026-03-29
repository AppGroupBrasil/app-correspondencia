"use client";

interface ProgressBarProps {
  progress: number;
  message: string;
  show: boolean;
}

export function ProgressBar({ progress, message, show }: ProgressBarProps) {
  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80 z-50">
      <div className="mb-2">
        <p className="text-sm font-medium text-gray-700">{message}</p>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1 text-right">{progress}%</p>
    </div>
  );
}