"use client";

import { useState } from "react";

interface TriviaSectionProps {
  trivia: string;
  maxLength?: number;
}

export function TriviaSection({ trivia, maxLength = 400 }: TriviaSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const needsTruncation = trivia.length > maxLength;

  const displayText =
    needsTruncation && !isExpanded
      ? trivia.slice(0, maxLength) + "..."
      : trivia;

  if (!needsTruncation) {
    return (
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-200">Факты</h2>
        <p className="text-sm text-zinc-400 leading-relaxed">{trivia}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-zinc-200">Факты</h2>
      <div className="space-y-2">
        <p className="text-sm text-zinc-400 leading-relaxed">{displayText}</p>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
        >
          {isExpanded ? "Свернуть" : "Показать еще"}
        </button>
      </div>
    </div>
  );
}
