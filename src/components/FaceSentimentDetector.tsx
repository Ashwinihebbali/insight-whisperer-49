import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Smile, Frown, Meh } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { pipeline } from "@huggingface/transformers";

interface EmotionResult {
  label: string;
  score: number;
}

const FaceSentimentDetector = () => {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emotion, setEmotion] = useState<EmotionResult | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<any>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const initModel = async () => {
    if (!modelRef.current) {
      setIsLoading(true);
      try {
        modelRef.current = await pipeline(
          "image-classification",
          "Xenova/vit-base-patch16-224-in21k-facial-expression",
          { device: "webgpu" }
        );
      } catch (error) {
        console.error("Model loading error:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const startCamera = async () => {
    try {
      setIsLoading(true);
      await initModel();
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsActive(true);
      startAnalysis();
    } catch (error) {
      console.error("Camera access error:", error);
      alert("Unable to access camera. Please check permissions.");
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    setIsActive(false);
    setEmotion(null);
  };

  const startAnalysis = () => {
    intervalRef.current = window.setInterval(() => {
      analyzeFrame();
    }, 1000);
  };

  const analyzeFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !modelRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    try {
      const imageData = canvas.toDataURL("image/jpeg");
      const results = await modelRef.current(imageData);
      
      if (results && results.length > 0) {
        setEmotion(results[0]);
      }
    } catch (error) {
      console.error("Analysis error:", error);
    }
  };

  const getEmotionIcon = (label: string) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes("happy") || lowerLabel.includes("joy")) {
      return <Smile className="w-8 h-8 text-green-500" />;
    } else if (lowerLabel.includes("sad") || lowerLabel.includes("angry")) {
      return <Frown className="w-8 h-8 text-red-500" />;
    }
    return <Meh className="w-8 h-8 text-yellow-500" />;
  };

  const getSentimentColor = (label: string) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes("happy") || lowerLabel.includes("joy")) {
      return "bg-green-500/20 border-green-500";
    } else if (lowerLabel.includes("sad") || lowerLabel.includes("angry")) {
      return "bg-red-500/20 border-red-500";
    }
    return "bg-yellow-500/20 border-yellow-500";
  };

  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Real-Time Face Sentiment Detection
          </h2>
          <p className="text-muted-foreground">
            Allow camera access to detect emotions from your facial expressions in real-time
          </p>
        </motion.div>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-2">
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-full max-w-2xl aspect-video bg-muted rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ display: isActive ? "block" : "none" }}
              />
              {!isActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="w-24 h-24 text-muted-foreground/30" />
                </div>
              )}
              
              <AnimatePresence>
                {emotion && isActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`absolute top-4 right-4 p-4 rounded-lg border-2 ${getSentimentColor(emotion.label)} backdrop-blur-md`}
                  >
                    <div className="flex items-center gap-3">
                      {getEmotionIcon(emotion.label)}
                      <div className="text-left">
                        <p className="font-bold text-foreground capitalize">{emotion.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {(emotion.score * 100).toFixed(1)}% confident
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <Button
              onClick={isActive ? stopCamera : startCamera}
              disabled={isLoading}
              size="lg"
              className="w-full max-w-md"
              variant={isActive ? "destructive" : "default"}
            >
              {isLoading ? (
                "Loading model..."
              ) : isActive ? (
                <>
                  <CameraOff className="mr-2 h-5 w-5" />
                  Stop Camera
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-5 w-5" />
                  Start Face Detection
                </>
              )}
            </Button>

            {isActive && (
              <p className="text-sm text-muted-foreground text-center">
                Position your face in front of the camera. Emotion detection updates every second.
              </p>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
};

export default FaceSentimentDetector;
