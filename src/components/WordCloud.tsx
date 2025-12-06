import { useMemo } from "react";

interface Word {
  text: string;
  value: number;
}

interface WordCloudProps {
  words: Word[];
  color: string;
}

const WordCloud = ({ words, color }: WordCloudProps) => {
  const processedWords = useMemo(() => {
    if (words.length === 0) return [];
    
    const maxValue = Math.max(...words.map(w => w.value));
    const minValue = Math.min(...words.map(w => w.value));
    const range = maxValue - minValue || 1;
    
    return words.slice(0, 30).map((word, index) => {
      const normalizedValue = (word.value - minValue) / range;
      const fontSize = 12 + normalizedValue * 28; // 12px to 40px
      const opacity = 0.6 + normalizedValue * 0.4; // 0.6 to 1.0
      
      return {
        ...word,
        fontSize,
        opacity,
        rotate: Math.random() > 0.7 ? (Math.random() > 0.5 ? 15 : -15) : 0,
      };
    });
  }, [words]);

  if (processedWords.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 p-4 h-full">
      {processedWords.map((word, index) => (
        <span
          key={`${word.text}-${index}`}
          className="inline-block transition-all duration-200 hover:scale-110 cursor-default font-medium"
          style={{
            fontSize: `${word.fontSize}px`,
            color: color,
            opacity: word.opacity,
            transform: `rotate(${word.rotate}deg)`,
          }}
        >
          {word.text}
        </span>
      ))}
    </div>
  );
};

export default WordCloud;
