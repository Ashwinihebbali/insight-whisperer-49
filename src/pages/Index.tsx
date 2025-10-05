import { useState } from "react";
import Hero from "@/components/Hero";
import FileUpload from "@/components/FileUpload";
import Dashboard from "@/components/Dashboard";
import Chatbot from "@/components/Chatbot";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SentimentResult {
  comment: string;
  sentiment: "positive" | "negative" | "neutral";
}

const Index = () => {
  const [results, setResults] = useState<SentimentResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async (comments: string[]) => {
    setIsAnalyzing(true);
    
    try {
      toast({
        title: "Starting Analysis",
        description: `Analyzing ${comments.length} comments...`,
      });

      const { data, error } = await supabase.functions.invoke("analyze-sentiment", {
        body: { comments },
      });

      if (error) {
        const errorMessage = error.message || "Unknown error occurred";
        throw new Error(errorMessage);
      }

      setResults(data.results);
      
      toast({
        title: "Analysis Complete!",
        description: `Successfully analyzed ${data.results.length} comments`,
      });
    } catch (error) {
      console.error("Analysis error:", error);
      const errorMessage = error instanceof Error ? error.message : "There was an error analyzing your data";
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <FileUpload onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
      {results.length > 0 && <Dashboard results={results} />}
      <Chatbot />
    </div>
  );
};

export default Index;
