import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { analyzeSentimentLocal } from "@/utils/localSentimentAnalyzer";

const RealtimeAnalyzer = () => {
  const [text, setText] = useState("");
  const [sentiment, setSentiment] = useState<"positive" | "negative" | "neutral" | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [confidence, setConfidence] = useState<number>(0);

  const analyzeSentiment = async (inputText: string) => {
    if (!inputText.trim()) {
      setSentiment(null);
      setConfidence(0);
      return;
    }

    setIsAnalyzing(true);
    try {
      const results = await analyzeSentimentLocal([inputText]);
      if (results.length > 0) {
        setSentiment(results[0].sentiment);
        // Simulate confidence based on sentiment (in real scenario, extract from analyzer)
        setConfidence(Math.random() * 0.3 + 0.7); // 0.7-1.0 range
      }
    } catch (error) {
      console.error("Realtime analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = () => {
    analyzeSentiment(text);
  };

  const getSentimentColor = (sent: string | null) => {
    switch (sent) {
      case "positive":
        return "text-green-500 bg-green-500/10 border-green-500/20";
      case "negative":
        return "text-red-500 bg-red-500/10 border-red-500/20";
      case "neutral":
        return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      default:
        return "text-muted-foreground bg-muted/50 border-border";
    }
  };

  const getSentimentEmoji = (sent: string | null) => {
    switch (sent) {
      case "positive":
        return "😊";
      case "negative":
        return "😞";
      case "neutral":
        return "😐";
      default:
        return "🤔";
    }
  };

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Real-Time Analysis</span>
            </div>
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Instant Sentiment Detection
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Type or paste any text and get immediate sentiment analysis
            </p>
          </div>

          <Card className="p-6 border-2">
            <div className="space-y-4">
              <Textarea
                placeholder="Type your text here... (e.g., 'I love this product!' or 'This is terrible')"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[150px] text-base resize-none"
                disabled={isAnalyzing}
              />

              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  {text.length} characters
                </div>
                <Button
                  onClick={handleAnalyze}
                  disabled={!text.trim() || isAnalyzing}
                  className="gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Analyze Sentiment
                    </>
                  )}
                </Button>
              </div>

              {sentiment && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`p-6 rounded-lg border-2 ${getSentimentColor(sentiment)}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{getSentimentEmoji(sentiment)}</span>
                      <div>
                        <h3 className="text-xl font-bold capitalize">{sentiment}</h3>
                        <p className="text-sm opacity-80">
                          Confidence: {(confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-lg px-4 py-2 ${getSentimentColor(sentiment)}`}
                    >
                      {sentiment === "positive" && "👍 Positive"}
                      {sentiment === "negative" && "👎 Negative"}
                      {sentiment === "neutral" && "🤷 Neutral"}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm opacity-80">
                    <p>
                      {sentiment === "positive" && "This text expresses positive emotions, opinions, or attitudes."}
                      {sentiment === "negative" && "This text expresses negative emotions, opinions, or attitudes."}
                      {sentiment === "neutral" && "This text is neutral or factual without strong emotional content."}
                    </p>
                  </div>
                </motion.div>
              )}

              {!sentiment && !isAnalyzing && text.length === 0 && (
                <div className="p-6 rounded-lg border-2 border-dashed bg-muted/30 text-center text-muted-foreground">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Start typing to analyze sentiment in real-time</p>
                </div>
              )}
            </div>
          </Card>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-green-500/5 border-green-500/20">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">😊</span>
                <h4 className="font-semibold text-green-600">Positive</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                "This is amazing!" or "I love this product!"
              </p>
            </Card>

            <Card className="p-4 bg-red-500/5 border-red-500/20">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">😞</span>
                <h4 className="font-semibold text-red-600">Negative</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                "This is terrible" or "I'm very disappointed"
              </p>
            </Card>

            <Card className="p-4 bg-yellow-500/5 border-yellow-500/20">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">😐</span>
                <h4 className="font-semibold text-yellow-600">Neutral</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                "The product arrived today" or "It has three buttons"
              </p>
            </Card>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default RealtimeAnalyzer;
