import { pipeline } from "@huggingface/transformers";

let sentimentAnalyzer: any = null;

export async function initializeSentimentAnalyzer() {
  if (!sentimentAnalyzer) {
    sentimentAnalyzer = await pipeline(
      "sentiment-analysis",
      "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
    );
  }
  return sentimentAnalyzer;
}

export async function analyzeSentimentLocal(
  comments: string[],
  onProgress?: (current: number, total: number) => void
): Promise<{ comment: string; sentiment: "positive" | "negative" | "neutral" }[]> {
  const analyzer = await initializeSentimentAnalyzer();
  const results: { comment: string; sentiment: "positive" | "negative" | "neutral" }[] = [];

  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];
    const result = await analyzer(comment);
    
    // Map the result to our sentiment format
    const label = result[0].label.toLowerCase();
    const sentiment: "positive" | "negative" | "neutral" = 
      label === "positive" ? "positive" :
      label === "negative" ? "negative" : "neutral";
    
    results.push({ comment, sentiment });
    
    if (onProgress) {
      onProgress(i + 1, comments.length);
    }
  }

  return results;
}
