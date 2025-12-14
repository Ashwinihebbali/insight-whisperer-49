import { motion } from "framer-motion";
import { PieChart, Pie, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import WordCloud from "./WordCloud";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Download, TrendingUp, TrendingDown, Minus, Lightbulb, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import html2canvas from "html2canvas";

interface SentimentResult {
  comment: string;
  sentiment: "positive" | "negative" | "neutral";
}

interface DashboardProps {
  results: SentimentResult[];
  onReset: () => void;
  isAnalyzing?: boolean;
  currentAnalysis?: SentimentResult | null;
}

const COLORS = {
  positive: "hsl(var(--success))",
  negative: "hsl(var(--error))",
  neutral: "hsl(var(--warning))",
};

const Dashboard = ({ results, onReset, isAnalyzing, currentAnalysis }: DashboardProps) => {
  const { toast } = useToast();
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const safeResults = results.filter((r): r is SentimentResult =>
    !!r &&
    typeof r.comment === "string" &&
    typeof r.sentiment === "string" &&
    ["positive", "negative", "neutral"].includes(r.sentiment)
  );

  const sentimentCounts = {
    positive: safeResults.filter(r => r.sentiment === "positive").length,
    negative: safeResults.filter(r => r.sentiment === "negative").length,
    neutral: safeResults.filter(r => r.sentiment === "neutral").length,
  };

  // Domain classification based on keywords
  const classifyDomain = (comment: string): string => {
    const lower = comment.toLowerCase();
    if (lower.match(/product|quality|feature|design|interface/)) return "Product";
    if (lower.match(/service|support|help|assist|response/)) return "Service";
    if (lower.match(/price|cost|expensive|cheap|value|worth/)) return "Pricing";
    if (lower.match(/delivery|shipping|arrived|package|time/)) return "Delivery";
    return "General";
  };

  // Calculate domain-wise sentiment
  const domainData = safeResults
    .filter(result => result && result.comment)
    .reduce((acc, result) => {
      const domain = classifyDomain(result.comment);
      if (!acc[domain]) {
        acc[domain] = { domain, positive: 0, negative: 0, neutral: 0 };
      }
      acc[domain][result.sentiment]++;
      return acc;
    }, {} as Record<string, { domain: string; positive: number; negative: number; neutral: number }>);

  const domainChartData = Object.values(domainData);

  const handleFeedbackSubmit = async () => {
    if (!feedbackName.trim() || !feedbackText.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both name and feedback",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-feedback", {
        body: { name: feedbackName, feedback: feedbackText },
      });

      if (error) throw error;

      setFeedbackSubmitted(true);
      toast({
        title: "Thank You!",
        description: "Your feedback has been submitted successfully",
      });
    } catch (error) {
      console.error("Feedback error:", error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadChart = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      const canvas = await html2canvas(element);
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      toast({
        title: "Download Complete",
        description: `${filename} has been downloaded`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download chart",
        variant: "destructive",
      });
    }
  };

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      const date = new Date().toLocaleDateString();
      
      doc.setFontSize(20);
      doc.text("Sentiment Analysis Report", 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated on: ${date}`, 14, 28);
      
      doc.setFontSize(14);
      doc.text("Summary Statistics", 14, 40);
      
      const summaryData = [
        ["Sentiment", "Count", "Percentage"],
        ["Positive", sentimentCounts.positive.toString(), `${(safeResults.length ? (sentimentCounts.positive / safeResults.length) * 100 : 0).toFixed(1)}%`],
        ["Negative", sentimentCounts.negative.toString(), `${(safeResults.length ? (sentimentCounts.negative / safeResults.length) * 100 : 0).toFixed(1)}%`],
        ["Neutral", sentimentCounts.neutral.toString(), `${(safeResults.length ? (sentimentCounts.neutral / safeResults.length) * 100 : 0).toFixed(1)}%`],
        ["Total", safeResults.length.toString(), "100%"]
      ];
      
      autoTable(doc, {
        startY: 45,
        head: [summaryData[0]],
        body: summaryData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241] },
      });
      
      const finalY = (doc as any).lastAutoTable.finalY || 80;
      doc.setFontSize(14);
      doc.text("Detailed Results", 14, finalY + 10);
      
      const detailedData = safeResults.map(result => [
        result.sentiment.charAt(0).toUpperCase() + result.sentiment.slice(1),
        result.comment.length > 80 ? result.comment.substring(0, 80) + "..." : result.comment
      ]);
      
      autoTable(doc, {
        startY: finalY + 15,
        head: [["Sentiment", "Comment"]],
        body: detailedData,
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241] },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 150 }
        },
        styles: { fontSize: 9 }
      });
      
      doc.save(`sentiment-analysis-${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: "Download Complete",
        description: "Your sentiment analysis has been exported to PDF format",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const pieData = [
    { name: "Positive", value: sentimentCounts.positive, color: COLORS.positive },
    { name: "Negative", value: sentimentCounts.negative, color: COLORS.negative },
    { name: "Neutral", value: sentimentCounts.neutral, color: COLORS.neutral },
  ];

  const barData = [
    { name: "Positive", count: sentimentCounts.positive, fill: COLORS.positive },
    { name: "Negative", count: sentimentCounts.negative, fill: COLORS.negative },
    { name: "Neutral", count: sentimentCounts.neutral, fill: COLORS.neutral },
  ];

  // Separate word clouds for each sentiment
  const generateWordCloudData = (sentiment: "positive" | "negative" | "neutral") => {
    const words = safeResults
      .filter(r => r.sentiment === sentiment && r.comment)
      .flatMap(r => r.comment.toLowerCase().split(/\s+/).filter(word => word.length > 3));
    
    const wordFreq = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(wordFreq)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 30);
  };

  const positiveWords = generateWordCloudData("positive");
  const negativeWords = generateWordCloudData("negative");
  const neutralWords = generateWordCloudData("neutral");

  // Calculate interesting facts with safety checks
  const avgCommentLength = safeResults.length > 0 
    ? Math.round(safeResults.reduce((acc, r) => acc + r.comment.length, 0) / safeResults.length)
    : 0;
  const longestComment = safeResults.length > 0 
    ? safeResults.reduce((longest, r) => r.comment.length > longest.comment.length ? r : longest, safeResults[0])
    : null;
  const sentimentPercentage = safeResults.length > 0
    ? ((sentimentCounts.positive / safeResults.length) * 100).toFixed(1)
    : "0";
  const dominantSentiment = Object.entries(sentimentCounts).reduce((a, b) => b[1] > a[1] ? b : a)[0];
  const mostDiscussedDomain = Object.keys(domainData).length > 0
    ? Object.entries(domainData).reduce((a, b) => 
        (b[1].positive + b[1].negative + b[1].neutral) > 
        (a[1].positive + a[1].negative + a[1].neutral) ? b : a
      )
    : null;

  // Catchy processing messages
  const processingMessages = [
    "🔮 AI magic in progress... Your insights are brewing!",
    "🧠 Teaching our AI to read emotions...",
    "✨ Transforming words into wisdom...",
    "🚀 Rocket-fast analysis happening right now!",
    "💡 Uncovering hidden sentiments in your data...",
    "🎯 Precision analysis: Every word counts!",
    "🌟 Almost there! Great things take a moment...",
    "📊 Building your personalized insights dashboard...",
    "🔍 Deep diving into your dataset...",
    "⚡ Lightning-speed processing in action!",
  ];

  const [messageIndex, setMessageIndex] = useState(0);

  // Rotate messages every 3 seconds during analysis
  useEffect(() => {
    if (isAnalyzing) {
      const interval = setInterval(() => {
        setMessageIndex(prev => (prev + 1) % processingMessages.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isAnalyzing, processingMessages.length]);

  return (
    <section className="py-12 px-4 bg-secondary/20">
      <div className="container mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Analysis Dashboard
            </h2>
            <Button
              onClick={downloadPDF}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              size="lg"
            >
              <Download className="mr-2 h-5 w-5" />
              Download Complete Report
            </Button>
          </div>

          {/* Catchy Processing Banner */}
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8"
            >
              <Card className="shadow-xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 border-2 border-primary/30 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/10 to-primary/5 animate-pulse" />
                <CardContent className="py-8 relative">
                  <div className="text-center">
                    <motion.div
                      key={messageIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4"
                    >
                      {processingMessages[messageIndex]}
                    </motion.div>
                    <div className="flex items-center justify-center gap-4 text-muted-foreground">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-lg font-medium">
                        Processing {safeResults.length} of {safeResults.length + (currentAnalysis ? 1 : 0)}+ comments
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      Sit back and relax — your comprehensive analysis is on its way! ☕
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Real-Time Analysis Feed */}
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <Card className="shadow-lg bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                    Real-Time Analysis
                  </CardTitle>
                  <CardDescription>Live sentiment detection as comments are processed</CardDescription>
                </CardHeader>
                <CardContent>
                  {currentAnalysis && (
                    <motion.div
                      key={currentAnalysis.comment}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-lg bg-background border-2"
                      style={{
                        borderColor: COLORS[currentAnalysis.sentiment],
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-muted-foreground mb-2">Current Comment:</p>
                          <p className="text-foreground font-medium break-words">{currentAnalysis.comment}</p>
                        </div>
                        <Badge
                          className="shrink-0"
                          style={{
                            backgroundColor: COLORS[currentAnalysis.sentiment],
                            color: "white",
                          }}
                        >
                          {currentAnalysis.sentiment === "positive" && <TrendingUp className="mr-1 h-3 w-3" />}
                          {currentAnalysis.sentiment === "negative" && <TrendingDown className="mr-1 h-3 w-3" />}
                          {currentAnalysis.sentiment === "neutral" && <Minus className="mr-1 h-3 w-3" />}
                          {currentAnalysis.sentiment.toUpperCase()}
                        </Badge>
                      </div>
                    </motion.div>
                  )}
                  
                  {safeResults.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-muted-foreground mb-3">
                        Recent Analyses ({safeResults.length} completed)
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {safeResults.slice(-5).reverse().map((result, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-3 p-3 rounded-md bg-secondary/50 text-sm"
                          >
                            <Badge
                              variant="outline"
                              className="shrink-0"
                              style={{
                                borderColor: COLORS[result.sentiment],
                                color: COLORS[result.sentiment],
                              }}
                            >
                              {result.sentiment === "positive" && <TrendingUp className="mr-1 h-3 w-3" />}
                              {result.sentiment === "negative" && <TrendingDown className="mr-1 h-3 w-3" />}
                              {result.sentiment === "neutral" && <Minus className="mr-1 h-3 w-3" />}
                              {result.sentiment}
                            </Badge>
                            <p className="text-muted-foreground truncate flex-1">{result.comment}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{safeResults.length}</div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-success/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Positive</CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{sentimentCounts.positive}</div>
                <p className="text-xs text-muted-foreground">
                  {safeResults.length > 0 ? ((sentimentCounts.positive / safeResults.length) * 100).toFixed(1) : "0"}%
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-error/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Negative</CardTitle>
                <TrendingDown className="h-4 w-4 text-error" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-error">{sentimentCounts.negative}</div>
                <p className="text-xs text-muted-foreground">
                  {safeResults.length > 0 ? ((sentimentCounts.negative / safeResults.length) * 100).toFixed(1) : "0"}%
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-warning/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Neutral</CardTitle>
                <Minus className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">{sentimentCounts.neutral}</div>
                <p className="text-xs text-muted-foreground">
                  {safeResults.length > 0 ? ((sentimentCounts.neutral / safeResults.length) * 100).toFixed(1) : "0"}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Dataset Summary */}
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-6"
            >
            <Card className="shadow-lg bg-gradient-to-br from-primary/10 to-accent/10">
              <CardHeader>
                <CardTitle className="text-2xl">Dataset Summary</CardTitle>
                <CardDescription>Comprehensive overview of sentiment analysis results</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-lg text-foreground">📊 Overall Sentiment</h4>
                      <p className="text-foreground">
                        This dataset contains <strong>{safeResults.length} total comments</strong> with a sentiment distribution of{" "} "
                        <span className="text-success font-semibold">{sentimentCounts.positive} positive</span> (
                        {((sentimentCounts.positive / (safeResults.length || 1)) * 100).toFixed(1)}%),{" "}
                        <span className="text-error font-semibold">{sentimentCounts.negative} negative</span> (
                        {((sentimentCounts.negative / (safeResults.length || 1)) * 100).toFixed(1)}%),{" "}
                        and <span className="text-warning font-semibold">{sentimentCounts.neutral} neutral</span> (
                        {((sentimentCounts.neutral / (safeResults.length || 1)) * 100).toFixed(1)}%).
                      </p>
                      <p className="text-foreground">
                        The dominant sentiment is <strong className="capitalize">{dominantSentiment}</strong>, 
                        indicating {dominantSentiment === "positive" ? "overall user satisfaction" : 
                        dominantSentiment === "negative" ? "areas requiring improvement" : 
                        "mixed or balanced opinions"}.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-lg text-foreground">🎯 Domain Insights</h4>
                      {mostDiscussedDomain ? (
                        <>
                          <p className="text-foreground">
                            The most discussed domain is{" "}
                            <strong>{mostDiscussedDomain[0]}</strong>{" "}
                            with{" "}
                            {mostDiscussedDomain[1].positive + mostDiscussedDomain[1].negative + mostDiscussedDomain[1].neutral} comments.
                          </p>
                          <p className="text-foreground">
                            Analysis across <strong>{Object.keys(domainData).length} domains</strong> reveals varied sentiment patterns, 
                            with each domain showing unique user engagement characteristics.
                          </p>
                        </>
                      ) : (
                        <p className="text-foreground">
                          No domain-specific patterns detected yet. Upload more data to see detailed domain insights.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-background rounded-lg border">
                    <h4 className="font-semibold text-lg text-foreground mb-3">💡 Key Findings</h4>
                    <ul className="space-y-2 text-foreground">
                      <li>• Average comment length: <strong>{avgCommentLength} characters</strong></li>
                      <li>
                        • Sentiment balance:{" "}
                        {sentimentCounts.positive > sentimentCounts.negative ? (
                          <span className="text-success font-medium">
                            Positive feedback outweighs negative by{" "}
                            {sentimentCounts.positive - sentimentCounts.negative} comments
                          </span>
                        ) : sentimentCounts.negative > sentimentCounts.positive ? (
                          <span className="text-error font-medium">
                            Negative feedback exceeds positive by{" "}
                            {sentimentCounts.negative - sentimentCounts.positive} comments
                          </span>
                        ) : (
                          <span className="text-warning font-medium">Equal positive and negative feedback</span>
                        )}
                      </li>
                      <li>
                        • Neutral sentiment represents{" "}
                        <strong>{((sentimentCounts.neutral / results.length) * 100).toFixed(1)}%</strong> of feedback, 
                        {sentimentCounts.neutral / results.length > 0.3 ? 
                          " indicating significant ambivalence or informational content" : 
                          " suggesting clear user opinions"}
                      </li>
                      <li>
                        • Engagement level:{" "}
                        {avgCommentLength > 100 ? (
                          <span className="font-medium">High - Users provide detailed feedback</span>
                        ) : (
                          <span className="font-medium">Moderate - Concise user responses</span>
                        )}
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Pie Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Sentiment Distribution</CardTitle>
                    <CardDescription>Overview of sentiment breakdown</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadChart("pie-chart", "sentiment-distribution")}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div id="pie-chart">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Bar Chart */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Sentiment Counts</CardTitle>
                    <CardDescription>Total comments per sentiment</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadChart("bar-chart", "sentiment-counts")}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div id="bar-chart">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                          {barData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Domain-wise Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-6"
          >
            <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Domain-wise Sentiment Analysis</CardTitle>
                  <CardDescription>Sentiment breakdown across different domains</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadChart("domain-chart", "domain-analysis")}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div id="domain-chart">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={domainChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="domain" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="positive" fill={COLORS.positive} name="Positive" />
                      <Bar dataKey="negative" fill={COLORS.negative} name="Negative" />
                      <Bar dataKey="neutral" fill={COLORS.neutral} name="Neutral" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sentiment-specific Word Clouds */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="shadow-lg border-success/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-success">Positive Words</CardTitle>
                    <CardDescription>Most frequent in positive comments</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadChart("positive-cloud", "positive-words")}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div id="positive-cloud" className="h-[300px]">
                    {positiveWords.length > 0 ? (
                      <WordCloud words={positiveWords} color="hsl(var(--success))" />
                    ) : (
                      <p className="text-center text-muted-foreground">No positive comments</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
              <Card className="shadow-lg border-error/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-error">Negative Words</CardTitle>
                    <CardDescription>Most frequent in negative comments</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadChart("negative-cloud", "negative-words")}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div id="negative-cloud" className="h-[300px]">
                    {negativeWords.length > 0 ? (
                      <WordCloud words={negativeWords} color="hsl(var(--error))" />
                    ) : (
                      <p className="text-center text-muted-foreground">No negative comments</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card className="shadow-lg border-warning/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-warning">Neutral Words</CardTitle>
                    <CardDescription>Most frequent in neutral comments</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadChart("neutral-cloud", "neutral-words")}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div id="neutral-cloud" className="h-[300px]">
                    {neutralWords.length > 0 ? (
                      <WordCloud words={neutralWords} color="hsl(var(--warning))" />
                    ) : (
                      <p className="text-center text-muted-foreground">No neutral comments</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Interesting Facts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mb-6"
          >
            <Card className="shadow-lg bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-6 w-6 text-primary" />
                  <CardTitle>Interesting Facts</CardTitle>
                </div>
                <CardDescription>Key insights from your data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-background rounded-lg">
                    <p className="text-sm text-muted-foreground">Average Comment Length</p>
                    <p className="text-2xl font-bold">{avgCommentLength} characters</p>
                  </div>
                  <div className="p-4 bg-background rounded-lg">
                    <p className="text-sm text-muted-foreground">Dominant Sentiment</p>
                    <p className="text-2xl font-bold capitalize">{dominantSentiment}</p>
                  </div>
                  <div className="p-4 bg-background rounded-lg">
                    <p className="text-sm text-muted-foreground">Positivity Rate</p>
                    <p className="text-2xl font-bold">{sentimentPercentage}%</p>
                  </div>
                  <div className="p-4 bg-background rounded-lg">
                    <p className="text-sm text-muted-foreground">Most Active Domain</p>
                    <p className="text-2xl font-bold">
                      {mostDiscussedDomain ? mostDiscussedDomain[0] : "N/A"}
                    </p>
                  </div>
                </div>
                {longestComment && (
                  <div className="p-4 bg-background rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Longest Comment ({longestComment.comment.length} characters)</p>
                    <p className="text-sm italic">{longestComment.comment}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Conclusion */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-6"
          >
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Conclusion</CardTitle>
                <CardDescription>Summary of sentiment analysis findings</CardDescription>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-foreground">
                  Based on the analysis of <strong>{safeResults.length}</strong> comments, the overall sentiment is predominantly{" "} "
                  <strong className="capitalize">{dominantSentiment}</strong> with {sentimentPercentage}% positive feedback.
                </p>
                <p className="text-foreground">
                  The data reveals {sentimentCounts.positive} positive comments, {sentimentCounts.negative} negative comments, 
                  and {sentimentCounts.neutral} neutral comments. The most discussed domain is{" "}
                  <strong>
                    {mostDiscussedDomain ? mostDiscussedDomain[0] : "N/A"}
                  </strong>, indicating where users are most engaged.
                </p>
                {sentimentCounts.positive > sentimentCounts.negative ? (
                  <p className="text-success font-medium">
                    ✓ The positive sentiment outweighs negative feedback, suggesting overall satisfaction.
                  </p>
                ) : (
                  <p className="text-error font-medium">
                    ⚠ Negative sentiment is significant and requires attention to improve user satisfaction.
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Feedback Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="mb-6"
          >
            <Card className="shadow-2xl border-0 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-50" />
              <CardHeader className="relative z-10 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent">
                    <Lightbulb className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      We Value Your Feedback
                    </CardTitle>
                    <CardDescription className="text-base mt-1">
                      Help us enhance your experience with this sentiment analysis tool
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 pt-2">
                {feedbackSubmitted ? (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-12 px-6"
                  >
                    <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-success/20 to-success/10 border-4 border-success/30">
                      <TrendingUp className="h-10 w-10 text-success" />
                    </div>
                    <h3 className="text-3xl font-bold text-foreground mb-3">
                      Thank You for Your Feedback!
                    </h3>
                    <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
                      Your insights are invaluable and will help us create a better experience for everyone.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                      <Button
                        onClick={() => {
                          setFeedbackSubmitted(false);
                          setFeedbackName("");
                          setFeedbackText("");
                          onReset();
                        }}
                        className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg px-8"
                        size="lg"
                      >
                        <FileText className="mr-2 h-5 w-5" />
                        Analyze New Dataset
                      </Button>
                      <Button
                        onClick={() => {
                          setFeedbackSubmitted(false);
                          setFeedbackName("");
                          setFeedbackText("");
                        }}
                        variant="outline"
                        className="text-lg px-8 border-2"
                        size="lg"
                      >
                        Submit More Feedback
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs">1</span>
                          Your Name
                        </label>
                        <Input
                          placeholder="Enter your full name"
                          value={feedbackName}
                          onChange={(e) => setFeedbackName(e.target.value)}
                          className="h-12 text-base border-2 focus:border-primary transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs">2</span>
                          Rate Your Experience
                        </label>
                        <div className="flex gap-2 h-12 items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              className="text-2xl hover:scale-110 transition-transform"
                            >
                              ⭐
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs">3</span>
                        Share Your Thoughts
                      </label>
                      <Textarea
                        placeholder="Tell us what you think about this sentiment analysis tool. What features do you love? What can we improve? Your detailed feedback helps us serve you better..."
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        rows={6}
                        className="text-base border-2 focus:border-primary transition-colors resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        {feedbackText.length} / 500 characters
                      </p>
                    </div>

                    <div className="pt-4">
                      <Button
                        onClick={handleFeedbackSubmit}
                        disabled={isSubmitting}
                        className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary via-primary to-accent hover:opacity-90 hover:scale-[1.02] transition-all shadow-lg"
                        size="lg"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                            Submitting Your Feedback...
                          </>
                        ) : (
                          <>
                            <Lightbulb className="mr-2 h-5 w-5" />
                            Submit Feedback
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="pt-4 border-t border-border/50">
                      <p className="text-sm text-center text-muted-foreground">
                        Your feedback is confidential and will only be used to improve our services.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Results Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Detailed Results</CardTitle>
                <CardDescription>All analyzed comments with sentiment labels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Sentiment</TableHead>
                        <TableHead>Comment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {safeResults.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge
                              variant={
                                result.sentiment === "positive"
                                  ? "default"
                                  : result.sentiment === "negative"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="capitalize"
                            >
                              {result.sentiment}
                            </Badge>
                          </TableCell>
                          <TableCell>{result.comment}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Dashboard;
