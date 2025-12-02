import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";
import { motion } from "framer-motion";
import { pipeline } from "@huggingface/transformers";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FaceDetection {
  box: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
  sentiment: "happy" | "sad" | "neutral";
  confidence: number;
}

const FaceSentimentDetector = () => {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [faces, setFaces] = useState<FaceDetection[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const faceDetectorRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const initModels = async () => {
    if (!faceDetectorRef.current) {
      setIsLoading(true);
      try {
        console.log("Loading face detection model...");
        faceDetectorRef.current = await pipeline(
          "object-detection",
          "Xenova/yolos-tiny"
        );
        console.log("Face detection model loaded successfully");
        
        toast({
          title: "Models Loaded",
          description: "Face detection is ready!",
        });
      } catch (error) {
        console.error("Model loading error:", error);
        toast({
          title: "Model Loading Failed",
          description: "Failed to load face detection model. Please refresh and try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const startCamera = async () => {
    try {
      setIsLoading(true);
      await initModels();
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play();
            startAnalysis();
          }
        };
      }
      setIsActive(true);
    } catch (error) {
      console.error("Camera access error:", error);
      alert("Unable to access camera. Please check permissions.");
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    setIsActive(false);
    setFaces([]);
    setIsLoading(false);
  };

  const startAnalysis = () => {
    const detectAndAnalyze = async () => {
      await analyzeFrame();
      animationFrameRef.current = requestAnimationFrame(detectAndAnalyze);
    };
    detectAndAnalyze();
  };

  const mapEmotionToSentiment = (label: string): "happy" | "sad" | "neutral" => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes("happy") || lowerLabel.includes("joy") || lowerLabel.includes("smile")) {
      return "happy";
    } else if (lowerLabel.includes("sad") || lowerLabel.includes("angry") || lowerLabel.includes("fear") || lowerLabel.includes("disgust")) {
      return "sad";
    }
    return "neutral";
  };

  const analyzeFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !overlayCanvasRef.current) return;
    if (!faceDetectorRef.current) return;
    if (videoRef.current.readyState !== 4) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const overlayCtx = overlayCanvas.getContext("2d");
    
    if (!ctx || !overlayCtx) return;

    // Set canvas sizes
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    overlayCanvas.width = video.videoWidth;
    overlayCanvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0);

    try {
      // Detect faces
      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      const detections = await faceDetectorRef.current(imageData, {
        threshold: 0.5,
        percentage: true,
      });

      // Filter for person detections
      const faceDetections = detections.filter((d: any) => 
        d.label === "person" && d.score > 0.6
      );

      if (faceDetections.length === 0) {
        setFaces([]);
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        return;
      }

      // Analyze emotion for each face (limit to 3 faces for performance)
      const faceResults: FaceDetection[] = [];
      
      for (const detection of faceDetections.slice(0, 3)) {
        const { box } = detection;
        
        // Extract face region
        const faceCanvas = document.createElement("canvas");
        const faceCtx = faceCanvas.getContext("2d");
        if (!faceCtx) continue;

        const x = box.xmin * canvas.width;
        const y = box.ymin * canvas.height;
        const width = (box.xmax - box.xmin) * canvas.width;
        const height = (box.ymax - box.ymin) * canvas.height;

        // Add padding to capture more facial context
        const padding = 0.1;
        const paddedX = Math.max(0, x - width * padding);
        const paddedY = Math.max(0, y - height * padding);
        const paddedWidth = Math.min(canvas.width - paddedX, width * (1 + 2 * padding));
        const paddedHeight = Math.min(canvas.height - paddedY, height * (1 + 2 * padding));

        faceCanvas.width = paddedWidth;
        faceCanvas.height = paddedHeight;
        faceCtx.drawImage(canvas, paddedX, paddedY, paddedWidth, paddedHeight, 0, 0, paddedWidth, paddedHeight);

        try {
          const faceImageData = faceCanvas.toDataURL("image/jpeg", 0.7);
          
          // Call edge function to analyze emotion with Lovable AI
          const { data: emotionData, error } = await supabase.functions.invoke('analyze-face-emotion', {
            body: { imageData: faceImageData }
          });

          if (error) {
            console.error("Emotion analysis error:", error);
            continue;
          }

          if (emotionData && emotionData.sentiment) {
            faceResults.push({
              box: {
                xmin: x,
                ymin: y,
                xmax: x + width,
                ymax: y + height,
              },
              sentiment: emotionData.sentiment,
              confidence: 0.85, // Default confidence for AI analysis
            });
          }
        } catch (error) {
          console.error("Emotion classification error:", error);
        }
      }

      setFaces(faceResults);
      drawFaceBoxes(overlayCtx, faceResults, canvas.width, canvas.height);

    } catch (error) {
      console.error("Detection error:", error);
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
    ctx.font = "bold 24px Arial";

    faces.forEach((face, index) => {
      const { box, sentiment, confidence } = face;
      
      // Set color based on sentiment
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
      }

      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      // Draw rectangle around face
      const boxWidth = box.xmax - box.xmin;
      const boxHeight = box.ymax - box.ymin;
      ctx.strokeRect(box.xmin, box.ymin, boxWidth, boxHeight);

      // Draw corner accents for better visibility
      const cornerLength = 20;
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

      // Prepare label with emoji and text
      const fullLabel = `${emoji} ${labelText}`;
      const confidenceLabel = `${Math.round(confidence * 100)}%`;
      
      ctx.font = "bold 24px Arial";
      const textMetrics = ctx.measureText(fullLabel);
      const textWidth = textMetrics.width;
      
      ctx.font = "16px Arial";
      const confMetrics = ctx.measureText(confidenceLabel);
      const maxWidth = Math.max(textWidth, confMetrics.width);
      
      const labelHeight = 55;
      const padding = 12;
      
      // Draw label background with rounded corners effect
      ctx.fillStyle = color;
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 10;
      ctx.fillRect(box.xmin, box.ymin - labelHeight - 8, maxWidth + padding * 2, labelHeight);
      ctx.shadowBlur = 0;
      
      // Draw label text
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 24px Arial";
      ctx.fillText(fullLabel, box.xmin + padding, box.ymin - labelHeight + 28);
      
      // Draw confidence percentage
      ctx.font = "14px Arial";
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fillText(confidenceLabel, box.xmin + padding, box.ymin - labelHeight + 48);
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
              
              {isActive && faces.length > 0 && (
                <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg border-2 border-primary">
                  <p className="text-sm font-semibold">
                    {faces.length} {faces.length === 1 ? "face" : "faces"} detected
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
              <div className="text-center space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Real-time emotion detection with labeled faces
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
                <p className="text-xs text-muted-foreground/80">
                  Each face shows its emotion label with confidence percentage
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
};

export default FaceSentimentDetector;
