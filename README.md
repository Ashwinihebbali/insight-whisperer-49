# 🎭 Sentiment Analysis Platform

A comprehensive AI-powered sentiment analysis platform that analyzes emotions from both text data and facial expressions in real-time.

![Sentiment Analysis](https://img.shields.io/badge/AI-Sentiment%20Analysis-blue)
![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-Cloud-3ECF8E?logo=supabase)

## ✨ Features

### 📝 Text Sentiment Analysis
- **File Upload**: Support for CSV and Excel files containing comments
- **Local Processing**: Browser-based AI using Hugging Face Transformers
- **Classification**: Positive, Negative, and Neutral sentiment detection
- **Confidence Scoring**: Comments with <70% confidence marked as Neutral

### 😊 Real-Time Face Sentiment Detection
- **Webcam Integration**: Live camera feed for facial analysis
- **AI Vision**: Powered by Google Gemini 2.5 Flash
- **Emotion Detection**: Classifies faces as Happy, Sad, or Neutral
- **Flexible Analysis**: Manual button or auto-analysis (10-second intervals)
- **Visual Feedback**: Bounding boxes with emoji indicators and confidence scores

🚀 **[Try the Live Demo](https://nsight-whisperer-49.onrender.com/)** — Experience real-time sentiment analysis for text and facial emotions!

### 📊 Interactive Dashboard
- **Pie Chart**: Overall sentiment distribution
- **Bar Chart**: Domain-wise sentiment breakdown
- **Word Clouds**: Separate clouds for positive, negative, and neutral sentiments
- **Summary Statistics**: Key findings and insights
- **Real-Time Feed**: Live analysis progress during processing
- **PDF Export**: Download complete reports with visualizations

### 🤖 AI chatbot
- Conversational AI assistant for sentiment-related queries
- Powered by Lovable AI Gateway

### 💬 Feedback Collection
- User feedback form with database storage
- Secure data handling with Row Level Security

## 🛠️ Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI Library |
| TypeScript | Type Safety |
| Tailwind CSS | Styling |
| Vite | Build Tool |
| Framer Motion | Animations |
| Shadcn/UI | Component Library |
| Recharts | Data Visualization |
| Lucide React | Icons |

### Backend & Cloud
| Technology | Purpose |
|------------|---------|
| Lovable Cloud | Full-stack Platform |
| Supabase | Database & Auth |
| Edge Functions | Serverless Backend |
| PostgreSQL | Data Storage |

### AI/ML
| Technology | Purpose |
|------------|---------|
| Hugging Face Transformers | Browser-based NLP |
| Google Gemini 2.5 Flash | Vision AI |
| Lovable AI Gateway | AI Integration |

## 📁 Project Structure

```
├── src/
│   ├── components/
│   │   ├── Hero.tsx                 # Landing section
│   │   ├── FileUpload.tsx           # CSV/Excel upload handler
│   │   ├── Dashboard.tsx            # Charts & analytics
│   │   ├── FaceSentimentDetector.tsx # Webcam emotion detection
│   │   ├── RealtimeAnalyzer.tsx     # Live text analysis
│   │   ├── Chatbot.tsx              # AI assistant
│   │   └── ui/                      # Shadcn components
│   ├── utils/
│   │   └── localSentimentAnalyzer.ts # Browser-based NLP
│   ├── integrations/
│   │   └── supabase/                # Database client & types
│   ├── hooks/                       # Custom React hooks
│   └── pages/
│       └── Index.tsx                # Main page
├── supabase/
│   └── functions/
│       ├── analyze-sentiment/       # Cloud text analysis
│       ├── analyze-face-emotion/    # Vision AI endpoint
│       ├── chatbot/                 # AI chat endpoint
│       └── send-feedback/           # Feedback storage
└── public/                          # Static assets
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or bun package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sentiment-analysis-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Set up environment variables**
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   # or
   bun dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:8080`

## 📖 Usage Guide

### Text Analysis
1. Click "Upload Dataset" on the homepage
2. Select a CSV or Excel file with a column containing comments
3. Choose between Local (browser) or Cloud analysis
4. View results in the interactive dashboard
5. Export results as PDF

### Face Sentiment Detection
1. Scroll to "Real-Time Face Sentiment Detection"
2. Click "Start Face Detection"
3. Allow camera access when prompted
4. Choose analysis mode:
   - **Manual**: Click "Analyze My Expression" button
   - **Auto**: Toggle on for 10-second interval analysis
5. View your detected emotion with confidence score

### Sample CSV Format
```csv
comment,domain
"This product is amazing!",Product
"Terrible customer service",Support
"It's okay, nothing special",General
```

## 🔒 Security Features

- **Row Level Security (RLS)**: Database tables protected
- **CORS Configuration**: Proper cross-origin handling
- **Rate Limiting**: Built-in API protection with cooldown
- **Data Privacy**: Local processing keeps data in browser

## 🎯 API Rate Limits

The face sentiment detection uses Lovable AI which has rate limits:
- **429 Error**: Wait 30 seconds before retrying
- **402 Error**: Add credits to your Lovable workspace
- **Recommendation**: Use manual mode for controlled usage

## 📈 Future Enhancements

- [ ] Multi-face simultaneous detection
- [ ] Emotion history timeline
- [ ] Snapshot capture feature
- [ ] Multi-language support
- [ ] Audio sentiment analysis
- [ ] CRM integration APIs
- [ ] Custom model training

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments
-Special thanks to Dr. Victor Ikechukwu for his invaluable guidance and support throughout the development of this project. Explore their work: [Victor-Ikechukwu](https://github.com/Victor-Ikechukwu).
- [Hugging Face](https://huggingface.co) - Transformers library
- [Supabase](https://supabase.com) - Backend infrastructure
- [Shadcn/UI](https://ui.shadcn.com) - Beautiful components
- [Google Gemini](https://deepmind.google/technologies/gemini/) - Vision AI

## ✨ Gratitude

Special thanks to my teammate for the collaboration and support on this project:

- **Geethanjali M** - [GitHub](https://github.com/GeethanjaliM25) 

---

