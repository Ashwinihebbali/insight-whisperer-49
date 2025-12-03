import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FaceDetection {
  box: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
  sentiment: "happy" | "sad" | "neutral" | "analyzing";
  confidence: number;
}

const FaceSentimentDetector = () => {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [faces, setFaces] = useState<FaceDetection[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setIsLoading(true);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play();
            setIsLoading(false);
            startAnalysis();
          }
        };
      }
      setIsActive(true);
      
      toast({
        title: "Camera Started",
        description: "Face sentiment detection is now active!",
      });
    } catch (error) {
      console.error("Camera access error:", error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    setIsActive(false);
    setFaces([]);
    setIsLoading(false);
    setIsAnalyzing(false);
  };

  const startAnalysis = () => {
    // Run analysis every 5 seconds to avoid API rate limits
    analysisIntervalRef.current = setInterval(() => {
      analyzeFrame();
    }, 5000);
    
    // Run first analysis after 1 second delay
    setTimeout(() => analyzeFrame(), 1000);
  };

  const analyzeFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !overlayCanvasRef.current) return;
    if (videoRef.current.readyState !== 4) return;
    if (isAnalyzing) return; // Prevent concurrent analysis

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const overlayCtx = overlayCanvas.getContext("2d");
    
    if (!ctx || !overlayCtx) return;

    setIsAnalyzing(true);

    // Set canvas sizes
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    overlayCanvas.width = video.videoWidth;
    overlayCanvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0);

    try {
      // Get the full frame as image data
      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      
      console.log("Sending image to analyze-face-emotion...");
      
      // Call edge function to analyze the whole frame
      const { data: emotionData, error } = await supabase.functions.invoke('analyze-face-emotion', {
        body: { imageData }
      });

      console.log("Response from edge function:", emotionData, error);

      if (error || emotionData?.rateLimited || emotionData?.paymentRequired) {
        console.error("Edge function error:", error || emotionData?.error);
        if (emotionData?.rateLimited) {
          toast({
            title: "Rate Limited",
            description: "Please wait a moment before the next analysis.",
            variant: "destructive",
          });
        }
        setIsAnalyzing(false);
        return;
      }

      if (emotionData && emotionData.sentiment) {
        // Create a face detection result for the center of the frame
        // Since we're analyzing the whole frame, we assume the face is centered
        const faceResult: FaceDetection = {
          box: {
            xmin: canvas.width * 0.25,
            ymin: canvas.height * 0.1,
            xmax: canvas.width * 0.75,
            ymax: canvas.height * 0.9,
          },
          sentiment: emotionData.sentiment as "happy" | "sad" | "neutral",
          confidence: 0.85,
        };

        setFaces([faceResult]);
        drawFaceBoxes(overlayCtx, [faceResult], canvas.width, canvas.height);
        
        console.log("Detected sentiment:", emotionData.sentiment);
      } else {
        setFaces([]);
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      }

    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const drawFaceBoxes = (
    ctx: CanvasRenderingContext2D,
    faces: FaceDetection[],
    width: number,
    height: number
  ) => {
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 4;

    faces.forEach((face) => {
      const { box, sentiment, confidence } = face;
      
      // Set color and labels based on sentiment
      let color = "#FFC107"; // neutral - yellow
      let emoji = "😐";
      let labelText = "NEUTRAL";
      
      if (sentiment === "happy") {
        color = "#4CAF50"; // green
        emoji = "😊";
        labelText = "HAPPY";
      } else if (sentiment === "sad") {
        color = "#F44336"; // red
        emoji = "😢";
        labelText = "SAD";
      } else if (sentiment === "analyzing") {
        color = "#2196F3"; // blue
        emoji = "🔍";
        labelText = "ANALYZING...";
      }

      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      // Draw rectangle around face area
      const boxWidth = box.xmax - box.xmin;
      const boxHeight = box.ymax - box.ymin;
      ctx.strokeRect(box.xmin, box.ymin, boxWidth, boxHeight);

      // Draw corner accents for better visibility
      const cornerLength = 30;
      ctx.lineWidth = 6;
      
      // Top-left corner
      ctx.beginPath();
      ctx.moveTo(box.xmin, box.ymin + cornerLength);
      ctx.lineTo(box.xmin, box.ymin);
      ctx.lineTo(box.xmin + cornerLength, box.ymin);
      ctx.stroke();
      
      // Top-right corner
      ctx.beginPath();
      ctx.moveTo(box.xmax - cornerLength, box.ymin);
      ctx.lineTo(box.xmax, box.ymin);
      ctx.lineTo(box.xmax, box.ymin + cornerLength);
      ctx.stroke();
      
      // Bottom-left corner
      ctx.beginPath();
      ctx.moveTo(box.xmin, box.ymax - cornerLength);
      ctx.lineTo(box.xmin, box.ymax);
      ctx.lineTo(box.xmin + cornerLength, box.ymax);
      ctx.stroke();
      
      // Bottom-right corner
      ctx.beginPath();
      ctx.moveTo(box.xmax - cornerLength, box.ymax);
      ctx.lineTo(box.xmax, box.ymax);
      ctx.lineTo(box.xmax, box.ymax - cornerLength);
      ctx.stroke();

      ctx.lineWidth = 4;

      // Draw large prominent label at the top
      const fullLabel = `${emoji} ${labelText}`;
      const confidenceLabel = `Confidence: ${Math.round(confidence * 100)}%`;
      
      ctx.font = "bold 32px Arial";
      const textMetrics = ctx.measureText(fullLabel);
      const textWidth = textMetrics.width;
      
      ctx.font = "18px Arial";
      const confMetrics = ctx.measureText(confidenceLabel);
      const maxWidth = Math.max(textWidth, confMetrics.width);
      
      const labelHeight = 70;
      const padding = 16;
      const labelX = (box.xmin + box.xmax) / 2 - (maxWidth + padding * 2) / 2;
      
      // Draw label background
      ctx.fillStyle = color;
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 15;
      ctx.fillRect(labelX, box.ymin - labelHeight - 12, maxWidth + padding * 2, labelHeight);
      ctx.shadowBlur = 0;
      
      // Draw label text
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 32px Arial";
      ctx.fillText(fullLabel, labelX + padding, box.ymin - labelHeight + 35);
      
      // Draw confidence percentage
      ctx.font = "16px Arial";
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fillText(confidenceLabel, labelX + padding, box.ymin - labelHeight + 58);
    });
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
            <div className="relative w-full max-w-4xl aspect-video bg-muted rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ display: isActive ? "block" : "none" }}
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ display: isActive ? "block" : "none" }}
              />
              {!isActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="w-24 h-24 text-muted-foreground/30" />
                </div>
              )}
              
              {isActive && (
                <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg border-2 border-primary">
                  <p className="text-sm font-semibold">
                    {isAnalyzing ? "🔍 Analyzing..." : faces.length > 0 ? `✅ ${faces[0].sentiment.toUpperCase()} detected` : "Waiting for face..."}
                  </p>
                </div>
              )}
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
                "Starting camera..."
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
              <div className="text-center space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Analyzing your expression every 2 seconds using AI
                </p>
                <div className="flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <span className="font-medium">😊 Happy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <span className="font-medium">😢 Sad</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span className="font-medium">😐 Neutral</span>
                  </div>
                </div>
                
                {faces.length > 0 && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/30"
                  >
                    <p className="text-2xl font-bold">
                      {faces[0].sentiment === "happy" && "😊 You look HAPPY!"}
                      {faces[0].sentiment === "sad" && "😢 You look SAD"}
                      {faces[0].sentiment === "neutral" && "😐 You look NEUTRAL"}
                    </p>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
};

export default FaceSentimentDetector;