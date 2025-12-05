import { pipeline } from "@huggingface/transformers";

let sentimentAnalyzer: any = null;

export async function initializeSentimentAnalyzer() {
  if (!sentimentAnalyzer) {
    // Using a 3-class model that supports positive, negative, AND neutral
    sentimentAnalyzer = await pipeline(
      "sentiment-analysis",
      "Xenova/twitter-roberta-base-sentiment-latest"
    );
  }
  return sentimentAnalyzer;
}

export async function analyzeSentimentLocal(
  comments: string[],
  onProgress?: (current: number, total: number, result?: { comment: string; sentiment: "positive" | "negative" | "neutral" }) => void
): Promise<{ comment: string; sentiment: "positive" | "negative" | "neutral" }[]> {
  const analyzer = await initializeSentimentAnalyzer();
  const results: { comment: string; sentiment: "positive" | "negative" | "neutral" }[] = [];

  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];
    const result = await analyzer(comment);
    
    // Map the result to our sentiment format
    // This model directly outputs: negative, neutral, positive
    const label = result[0].label.toLowerCase();
    
    let sentiment: "positive" | "negative" | "neutral";
    if (label === "positive") {
      sentiment = "positive";
    } else if (label === "negative") {
      sentiment = "negative";
    } else {
      sentiment = "neutral";
    }
    
    const analysisResult = { comment, sentiment };
    results.push(analysisResult);
    
    if (onProgress) {
      onProgress(i + 1, comments.length, analysisResult);
    }
  }

  return results;
}
