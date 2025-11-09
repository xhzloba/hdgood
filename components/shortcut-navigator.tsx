"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Глобальный хоткей: Shift + K (английская)
// Навигация на /admin без видимой ссылки в хедере.
export function ShortcutNavigator() {
  const router = useRouter();
  const pressedRef = useRef<Set<string>>(new Set());
  const lastNavRef = useRef<number>(0);

  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName?.toLowerCase();
      const editable = (node as HTMLElement).isContentEditable;
      return (
        editable ||
        tag === "input" ||
        tag === "textarea" ||
        (tag === "select")
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Не мешаем вводу в полях
      if (isEditable(e.target)) return;

      pressedRef.current.add(e.code);

      // Условие: одновременно зажаты Shift и K
      const hasCombo =
        pressedRef.current.has("KeyK") &&
        (pressedRef.current.has("ShiftLeft") || pressedRef.current.has("ShiftRight"));

      const now = Date.now();
      if (hasCombo && now - lastNavRef.current > 800) {
        // Блокируем частые срабатывания
        e.preventDefault();
        lastNavRef.current = now;
        router.push("/admin");
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      pressedRef.current.delete(e.code);
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown as EventListener);
      window.removeEventListener("keyup", onKeyUp as EventListener);
    };
  }, [router]);

  return null;
}