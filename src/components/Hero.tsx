import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, TrendingUp, MessageSquare, Users, Github, Linkedin, Mail, X } from "lucide-react";

const Hero = () => {
  const [showAbout, setShowAbout] = useState(false);

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

            <motion.div
              whileHover={{ y: -5 }}
              onClick={() => setShowAbout(true)}
              className="flex items-center gap-3 bg-card p-4 rounded-xl shadow-md cursor-pointer"
            >
              <Users className="w-8 h-8 text-primary" />
              <div className="text-left">
                <div className="font-semibold">About Us</div>
                <div className="text-sm text-muted-foreground">Meet the team</div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* About Modal */}
      <AnimatePresence>
        {showAbout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAbout(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-card rounded-2xl shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Users className="w-6 h-6 text-primary" />
                  Meet the Team
                </h2>
                <button
                  onClick={() => setShowAbout(false)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Ashwini Vishal */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-6 border border-border"
                >
                  <h3 className="text-xl font-semibold text-foreground mb-2">Ashwini Vishal</h3>
                  <p className="text-sm text-muted-foreground mb-1">CSE (AI) Engineer</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Passionate engineer solving real-world problems with AI and innovative solutions.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="https://github.com/Ashwinihebbali"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      <Github className="w-4 h-4" />
                      GitHub
                    </a>
                    <a
                      href="https://www.linkedin.com/in/ashwini-vishal-hebbali"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      <Linkedin className="w-4 h-4" />
                      LinkedIn
                    </a>
                    <a
                      href="mailto:ashwinihebbali068@gmail.com"
                      className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </a>
                  </div>
                </motion.div>

                {/* Geethanjali M */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-accent/10 to-primary/10 rounded-xl p-6 border border-border"
                >
                  <h3 className="text-xl font-semibold text-foreground mb-2">Geethanjali M</h3>
                  <p className="text-sm text-muted-foreground mb-1">CSE (AI) Engineer</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Dedicated engineer with a passion for building intelligent systems and impactful solutions.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="https://github.com/GeethanjaliM25"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      <Github className="w-4 h-4" />
                      GitHub
                    </a>
                    <a
                      href="https://www.linkedin.com/in/geethanjalimkarnataka"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      <Linkedin className="w-4 h-4" />
                      LinkedIn
                    </a>
                    <a
                      href="mailto:geethanjalishetty34@gmail.com"
                      className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </a>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default Hero;
