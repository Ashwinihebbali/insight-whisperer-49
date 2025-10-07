import { motion } from "framer-motion";
import { PieChart, Pie, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import ReactWordcloud from "react-wordcloud";
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
import { useState } from "react";
import html2canvas from "html2canvas";

interface SentimentResult {
  comment: string;
  sentiment: "positive" | "negative" | "neutral";
}

interface DashboardProps {
  results: SentimentResult[];
  onReset: () => void;
}

const COLORS = {
  positive: "hsl(var(--success))",
  negative: "hsl(var(--error))",
  neutral: "hsl(var(--warning))",
};

const Dashboard = ({ results, onReset }: DashboardProps) => {
  const { toast } = useToast();
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sentimentCounts = {
    positive: results.filter(r => r.sentiment === "positive").length,
    negative: results.filter(r => r.sentiment === "negative").length,
    neutral: results.filter(r => r.sentiment === "neutral").length,
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
  const domainData = results.reduce((acc, result) => {
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
        ["Positive", sentimentCounts.positive.toString(), `${((sentimentCounts.positive / results.length) * 100).toFixed(1)}%`],
        ["Negative", sentimentCounts.negative.toString(), `${((sentimentCounts.negative / results.length) * 100).toFixed(1)}%`],
        ["Neutral", sentimentCounts.neutral.toString(), `${((sentimentCounts.neutral / results.length) * 100).toFixed(1)}%`],
        ["Total", results.length.toString(), "100%"]
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
      
      const detailedData = results.map(result => [
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
    const words = results
      .filter(r => r.sentiment === sentiment)
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

  // Calculate interesting facts
  const avgCommentLength = Math.round(results.reduce((acc, r) => acc + r.comment.length, 0) / results.length);
  const longestComment = results.reduce((longest, r) => r.comment.length > longest.comment.length ? r : longest, results[0]);
  const sentimentPercentage = ((sentimentCounts.positive / results.length) * 100).toFixed(1);
  const dominantSentiment = Object.entries(sentimentCounts).reduce((a, b) => b[1] > a[1] ? b : a)[0];

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

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{results.length}</div>
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
                  {((sentimentCounts.positive / results.length) * 100).toFixed(1)}%
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
                  {((sentimentCounts.negative / results.length) * 100).toFixed(1)}%
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
                  {((sentimentCounts.neutral / results.length) * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

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
                      <ReactWordcloud
                        words={positiveWords}
                        options={{
                          rotations: 1,
                          rotationAngles: [0, 0],
                          fontSizes: [12, 40],
                          colors: ["hsl(var(--success))"],
                        }}
                      />
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
                      <ReactWordcloud
                        words={negativeWords}
                        options={{
                          rotations: 1,
                          rotationAngles: [0, 0],
                          fontSizes: [12, 40],
                          colors: ["hsl(var(--error))"],
                        }}
                      />
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
                      <ReactWordcloud
                        words={neutralWords}
                        options={{
                          rotations: 1,
                          rotationAngles: [0, 0],
                          fontSizes: [12, 40],
                          colors: ["hsl(var(--warning))"],
                        }}
                      />
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
                      {Object.entries(domainData).reduce((a, b) => 
                        (b[1].positive + b[1].negative + b[1].neutral) > 
                        (a[1].positive + a[1].negative + a[1].neutral) ? b : a
                      )[0]}
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Longest Comment ({longestComment.comment.length} characters)</p>
                  <p className="text-sm italic">{longestComment.comment}</p>
                </div>
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
                  Based on the analysis of <strong>{results.length}</strong> comments, the overall sentiment is predominantly{" "}
                  <strong className="capitalize">{dominantSentiment}</strong> with {sentimentPercentage}% positive feedback.
                </p>
                <p className="text-foreground">
                  The data reveals {sentimentCounts.positive} positive comments, {sentimentCounts.negative} negative comments, 
                  and {sentimentCounts.neutral} neutral comments. The most discussed domain is{" "}
                  <strong>
                    {Object.entries(domainData).reduce((a, b) => 
                      (b[1].positive + b[1].negative + b[1].neutral) > 
                      (a[1].positive + a[1].negative + a[1].neutral) ? b : a
                    )[0]}
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

          {/* Feedback Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="mb-6"
          >
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Share Your Feedback</CardTitle>
                <CardDescription>Help us improve this analysis tool</CardDescription>
              </CardHeader>
              <CardContent>
                {feedbackSubmitted ? (
                  <div className="text-center py-8">
                    <h3 className="text-2xl font-bold text-success mb-4">Thank You for Your Feedback! 🎉</h3>
                    <p className="text-muted-foreground mb-6">
                      We appreciate your input and will use it to improve our service.
                    </p>
                    <Button
                      onClick={() => {
                        setFeedbackSubmitted(false);
                        setFeedbackName("");
                        setFeedbackText("");
                        onReset();
                      }}
                      className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                      size="lg"
                    >
                      Upload New Dataset
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Name</label>
                      <Input
                        placeholder="Enter your name"
                        value={feedbackName}
                        onChange={(e) => setFeedbackName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Feedback</label>
                      <Textarea
                        placeholder="Share your thoughts about this tool..."
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        rows={4}
                      />
                    </div>
                    <Button
                      onClick={handleFeedbackSubmit}
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                    >
                      {isSubmitting ? "Submitting..." : "Submit Feedback"}
                    </Button>
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
                      {results.map((result, index) => (
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
