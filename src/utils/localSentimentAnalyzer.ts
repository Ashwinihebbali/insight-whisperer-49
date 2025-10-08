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
  onProgress?: (current: number, total: number, result?: { comment: string; sentiment: "positive" | "negative" | "neutral" }) => void
): Promise<{ comment: string; sentiment: "positive" | "negative" | "neutral" }[]> {
  const analyzer = await initializeSentimentAnalyzer();
  const results: { comment: string; sentiment: "positive" | "negative" | "neutral" }[] = [];

  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];
    const result = await analyzer(comment);
    
    // Map the result to our sentiment format using confidence threshold
    const label = result[0].label.toLowerCase();
    const score = result[0].score;
    
    // If confidence is below 0.7, classify as neutral
    let sentiment: "positive" | "negative" | "neutral";
    if (score < 0.7) {
      sentiment = "neutral";
    } else {
      sentiment = label === "positive" ? "positive" : "negative";
    }
    
    const analysisResult = { comment, sentiment };
    results.push(analysisResult);
    
    if (onProgress) {
      onProgress(i + 1, comments.length, analysisResult);
    }
  }

  return results;
}
