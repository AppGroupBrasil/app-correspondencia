"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface ThemeToggleProps {
  variant?: "icon" | "dropdown";
}

/**
 * Componente de toggle de tema (Light/Dark/System)
 */
export default function ThemeToggle({ variant = "icon" }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === "icon") {
    return (
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
        title={resolvedTheme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
        aria-label="Alternar tema"
      >
        {resolvedTheme === "light" ? (
          <Moon className="w-5 h-5" />
        ) : (
          <Sun className="w-5 h-5" />
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
      <button
        onClick={() => setTheme("light")}
        className={`p-2 rounded-md transition-colors ${
          theme === "light"
            ? "bg-white dark:bg-gray-600 shadow-sm"
            : "hover:bg-gray-200 dark:hover:bg-gray-600"
        }`}
        title="Modo claro"
        aria-label="Modo claro"
      >
        <Sun
          className={`w-4 h-4 ${
            theme === "light"
              ? "text-yellow-500"
              : "text-gray-500 dark:text-gray-400"
          }`}
        />
      </button>

      <button
        onClick={() => setTheme("dark")}
        className={`p-2 rounded-md transition-colors ${
          theme === "dark"
            ? "bg-white dark:bg-gray-600 shadow-sm"
            : "hover:bg-gray-200 dark:hover:bg-gray-600"
        }`}
        title="Modo escuro"
        aria-label="Modo escuro"
      >
        <Moon
          className={`w-4 h-4 ${
            theme === "dark"
              ? "text-blue-500"
              : "text-gray-500 dark:text-gray-400"
          }`}
        />
      </button>

      <button
        onClick={() => setTheme("system")}
        className={`p-2 rounded-md transition-colors ${
          theme === "system"
            ? "bg-white dark:bg-gray-600 shadow-sm"
            : "hover:bg-gray-200 dark:hover:bg-gray-600"
        }`}
        title="Seguir sistema"
        aria-label="Seguir sistema"
      >
        <Monitor
          className={`w-4 h-4 ${
            theme === "system"
              ? "text-green-500"
              : "text-gray-500 dark:text-gray-400"
          }`}
        />
      </button>
    </div>
  );
}
