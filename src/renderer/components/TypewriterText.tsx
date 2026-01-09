import React from 'react';
import { useTypewriter } from '../hooks/useTypewriter';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  onComplete?: () => void;
  showCursor?: boolean;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 50,
  delay = 0,
  className = '',
  onComplete,
  showCursor = true
}) => {
  const { displayedText, isTyping } = useTypewriter({
    text,
    speed,
    delay,
    onComplete
  });

  return (
    <span className={className}>
      {displayedText}
      {showCursor && isTyping && (
        <span className="inline-block w-2 h-5 ml-1 bg-current animate-pulse" />
      )}
    </span>
  );
};