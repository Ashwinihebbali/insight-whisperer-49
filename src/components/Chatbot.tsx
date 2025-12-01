import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface SentimentResult {
  comment: string;
  sentiment: "positive" | "negative" | "neutral";
}

interface ChatbotProps {
  analysisResults?: SentimentResult[];
}

const Chatbot = ({ analysisResults = [] }: ChatbotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: analysisResults.length > 0 
        ? `Hi! I can see you've analyzed ${analysisResults.length} comments. Ask me anything about your sentiment analysis results!`
        : "Hi! I'm here to help you with sentiment analysis. Upload a dataset and I'll help you understand the results!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    const messageText = input;
    setInput("");
    setIsLoading(true);

    try {
      // Prepare analysis data
      const analysisData = analysisResults.length > 0 ? {
        totalComments: analysisResults.length,
        sentimentCounts: {
          positive: analysisResults.filter(r => r.sentiment === "positive").length,
          negative: analysisResults.filter(r => r.sentiment === "negative").length,
          neutral: analysisResults.filter(r => r.sentiment === "neutral").length,
        },
        comments: analysisResults,
      } : undefined;

      const { data, error } = await supabase.functions.invoke("chatbot", {
        body: {
          message: messageText,
          history: messages,
          analysisData,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.reply,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chatbot error:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to get response from chatbot";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-accent shadow-lg hover:shadow-xl"
        >
          {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        </Button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 h-[500px] bg-card rounded-2xl shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-accent p-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary-foreground">AI Assistant</h3>
              {analysisResults.length > 0 && (
                <span className="text-xs bg-primary-foreground/20 px-2 py-1 rounded-full text-primary-foreground">
                  {analysisResults.length} comments analyzed
                </span>
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary"
                      }`}
                    >
                      {message.content}
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-secondary p-3 rounded-lg">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Ask me anything..."
                  disabled={isLoading}
                />
                <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;
