import { motion } from "framer-motion";
import { PieChart, Pie, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import ReactWordcloud from "react-wordcloud";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { utils, write } from "xlsx";
import { useToast } from "@/hooks/use-toast";

interface SentimentResult {
  comment: string;
  sentiment: "positive" | "negative" | "neutral";
}

interface DashboardProps {
  results: SentimentResult[];
}

const COLORS = {
  positive: "hsl(var(--success))",
  negative: "hsl(var(--error))",
  neutral: "hsl(var(--warning))",
};

const Dashboard = ({ results }: DashboardProps) => {
  const { toast } = useToast();

  const sentimentCounts = {
    positive: results.filter(r => r.sentiment === "positive").length,
    negative: results.filter(r => r.sentiment === "negative").length,
    neutral: results.filter(r => r.sentiment === "neutral").length,
  };

  const downloadODF = () => {
    try {
      // Prepare data for export
      const exportData = [
        ["Comment", "Sentiment", "Timestamp"],
        ...results.map(result => [
          result.comment,
          result.sentiment.charAt(0).toUpperCase() + result.sentiment.slice(1),
          new Date().toLocaleString()
        ])
      ];

      // Add summary sheet data
      const summaryData = [
        ["Sentiment Analysis Summary"],
        [""],
        ["Sentiment Type", "Count", "Percentage"],
        ["Positive", sentimentCounts.positive, `${((sentimentCounts.positive / results.length) * 100).toFixed(1)}%`],
        ["Negative", sentimentCounts.negative, `${((sentimentCounts.negative / results.length) * 100).toFixed(1)}%`],
        ["Neutral", sentimentCounts.neutral, `${((sentimentCounts.neutral / results.length) * 100).toFixed(1)}%`],
        [""],
        ["Total Comments", results.length, "100%"]
      ];

      // Create workbook with multiple sheets
      const wb = utils.book_new();
      
      // Add summary sheet
      const summaryWs = utils.aoa_to_sheet(summaryData);
      utils.book_append_sheet(wb, summaryWs, "Summary");
      
      // Add detailed results sheet
      const detailsWs = utils.aoa_to_sheet(exportData);
      utils.book_append_sheet(wb, detailsWs, "Detailed Results");

      // Generate ODF (.ods) file
      const wbout = write(wb, { bookType: "ods", type: "array" });
      const blob = new Blob([wbout], { type: "application/vnd.oasis.opendocument.spreadsheet" });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sentiment-analysis-${new Date().toISOString().split('T')[0]}.ods`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Complete",
        description: "Your sentiment analysis has been exported to ODF format",
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

  // Generate word cloud data
  const words = results.flatMap(r => 
    r.comment.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
  );
  
  const wordFreq = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const wordCloudData = Object.entries(wordFreq)
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);

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
              onClick={downloadODF}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              size="lg"
            >
              <Download className="mr-2 h-5 w-5" />
              Download ODF
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Pie Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Sentiment Distribution</CardTitle>
                  <CardDescription>Overview of sentiment breakdown</CardDescription>
                </CardHeader>
                <CardContent>
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
                <CardHeader>
                  <CardTitle>Sentiment Counts</CardTitle>
                  <CardDescription>Total comments per sentiment</CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Word Cloud */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="shadow-lg mb-6">
              <CardHeader>
                <CardTitle>Word Cloud</CardTitle>
                <CardDescription>Most frequent words in comments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ReactWordcloud
                    words={wordCloudData}
                    options={{
                      rotations: 2,
                      rotationAngles: [0, 90],
                      fontSizes: [12, 60],
                      colors: [
                        "hsl(var(--primary))",
                        "hsl(var(--accent))",
                        "hsl(var(--success))",
                        "hsl(var(--warning))",
                      ],
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Results Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
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
