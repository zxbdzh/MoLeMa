import { useState, useEffect, useRef } from 'react';

interface UseTypewriterOptions {
  text: string;
  speed?: number;
  delay?: number;
  onComplete?: () => void;
}

export function useTypewriter({
  text,
  speed = 50,
  delay = 0,
  onComplete
}: UseTypewriterOptions) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    // 清理之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    currentIndexRef.current = 0;
    setDisplayedText('');
    setIsTyping(false);

    const startTyping = () => {
      setIsTyping(true);
      
      const typeNextChar = () => {
        if (currentIndexRef.current < text.length) {
          setDisplayedText(text.slice(0, currentIndexRef.current + 1));
          currentIndexRef.current++;
          timeoutRef.current = setTimeout(typeNextChar, speed);
        } else {
          setIsTyping(false);
          onComplete?.();
        }
      };

      typeNextChar();
    };

    if (delay > 0) {
      timeoutRef.current = setTimeout(startTyping, delay);
    } else {
      startTyping();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, speed, delay, onComplete]);

  return { displayedText, isTyping };
}