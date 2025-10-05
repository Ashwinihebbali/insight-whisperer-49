import { motion } from "framer-motion";
import { Brain, TrendingUp, MessageSquare } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-accent/5 to-background py-20 px-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-block"
          >
            <div className="bg-gradient-to-r from-primary to-accent p-3 rounded-2xl shadow-lg inline-block">
              <Brain className="w-12 h-12 text-primary-foreground" />
            </div>
          </motion.div>

          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            E-Consultation Sentiment Analysis
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Analyze public feedback with AI-powered sentiment analysis. 
            Transform comments into actionable insights with beautiful visualizations.
          </p>

          <div className="flex flex-wrap justify-center gap-8 mt-12">
            <motion.div
              whileHover={{ y: -5 }}
              className="flex items-center gap-3 bg-card p-4 rounded-xl shadow-md"
            >
              <TrendingUp className="w-8 h-8 text-success" />
              <div className="text-left">
                <div className="font-semibold">Real-time Analysis</div>
                <div className="text-sm text-muted-foreground">Instant results</div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              className="flex items-center gap-3 bg-card p-4 rounded-xl shadow-md"
            >
              <MessageSquare className="w-8 h-8 text-accent" />
              <div className="text-left">
                <div className="font-semibold">AI Chatbot</div>
                <div className="text-sm text-muted-foreground">Get instant help</div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
