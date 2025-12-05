import { motion } from "framer-motion";
import { Brain, TrendingUp, MessageSquare, Users, Github, Linkedin } from "lucide-react";

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

            <motion.div
              whileHover={{ y: -5 }}
              className="flex items-center gap-3 bg-card p-4 rounded-xl shadow-md"
            >
              <Users className="w-8 h-8 text-primary" />
              <div className="text-left">
                <div className="font-semibold">About Us</div>
                <div className="text-sm text-muted-foreground">Meet the team</div>
              </div>
            </motion.div>
          </div>

          {/* About Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 bg-card rounded-2xl shadow-lg p-8 max-w-4xl mx-auto"
          >
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center justify-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Meet the Team
            </h2>
            
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
                <div className="flex gap-3">
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
                <div className="flex gap-3">
                  <span className="text-sm text-muted-foreground italic">Contact details coming soon</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
