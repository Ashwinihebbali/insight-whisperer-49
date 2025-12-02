import { useState } from "react";
import Hero from "@/components/Hero";
import FileUpload from "@/components/FileUpload";
import Dashboard from "@/components/Dashboard";
import Chatbot from "@/components/Chatbot";
import RealtimeAnalyzer from "@/components/RealtimeAnalyzer";
import FaceSentimentDetector from "@/components/FaceSentimentDetector";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { analyzeSentimentLocal } from "@/utils/localSentimentAnalyzer";

interface SentimentResult {
  comment: string;
  sentiment: "positive" | "negative" | "neutral";
}

const Index = () => {
  const [results, setResults] = useState<SentimentResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });
  const [currentAnalysis, setCurrentAnalysis] = useState<SentimentResult | null>(null);
  const { toast } = useToast();

  const handleAnalyzeLocal = async (comments: string[]) => {
    setIsAnalyzing(true);
    setResults([]);
    setAnalysisProgress({ current: 0, total: comments.length });
    
    try {
      toast({
        title: "Starting Local Analysis",
        description: `Analyzing ${comments.length} comments in your browser...`,
      });

      const results = await analyzeSentimentLocal(comments, (current, total, result) => {
        setAnalysisProgress({ current, total });
        if (result) {
          setCurrentAnalysis(result);
          setResults(prev => [...prev, result]);
        }
      });

      setCurrentAnalysis(null);
      
      toast({
        title: "Analysis Complete!",
        description: `Successfully analyzed ${results.length} comments`,
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
      setAnalysisProgress({ current: 0, total: 0 });
      setCurrentAnalysis(null);
    }
  };

  const handleAnalyzeCloud = async (comments: string[]) => {
    setIsAnalyzing(true);
    
    try {
      toast({
        title: "Starting Cloud Analysis",
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
      <RealtimeAnalyzer />
      <FaceSentimentDetector />
      <FileUpload
        onAnalyzeLocal={handleAnalyzeLocal}
        onAnalyzeCloud={handleAnalyzeCloud}
        isAnalyzing={isAnalyzing}
        analysisProgress={analysisProgress}
      />
      {(results.length > 0 || isAnalyzing) && (
        <Dashboard 
          results={results} 
          onReset={() => {
            setResults([]);
            setAnalysisProgress({ current: 0, total: 0 });
            setCurrentAnalysis(null);
          }}
          isAnalyzing={isAnalyzing}
          currentAnalysis={currentAnalysis}
        />
      )}
      <Chatbot analysisResults={results} />
    </div>
  );
};

export default Index;
