import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";
import { motion } from "framer-motion";
import { pipeline } from "@huggingface/transformers";

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
  const emotionClassifierRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const initModels = async () => {
    if (!faceDetectorRef.current || !emotionClassifierRef.current) {
      setIsLoading(true);
      try {
        console.log("Loading face detection model...");
        faceDetectorRef.current = await pipeline(
          "object-detection",
          "Xenova/yolos-tiny",
          { device: "webgpu" }
        );
        
        console.log("Loading emotion classification model...");
        emotionClassifierRef.current = await pipeline(
          "image-classification",
          "Xenova/vit-base-patch16-224-in21k-facial-expression",
          { device: "webgpu" }
        );
        
        console.log("Models loaded successfully");
      } catch (error) {
        console.error("Model loading error:", error);
        alert("Failed to load AI models. Please refresh and try again.");
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
    if (!faceDetectorRef.current || !emotionClassifierRef.current) return;
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

      // Analyze emotion for each face
      const faceResults: FaceDetection[] = [];
      
      for (const detection of faceDetections.slice(0, 5)) { // Limit to 5 faces
        const { box, score } = detection;
        
        // Extract face region
        const faceCanvas = document.createElement("canvas");
        const faceCtx = faceCanvas.getContext("2d");
        if (!faceCtx) continue;

        const x = box.xmin * canvas.width;
        const y = box.ymin * canvas.height;
        const width = (box.xmax - box.xmin) * canvas.width;
        const height = (box.ymax - box.ymin) * canvas.height;

        faceCanvas.width = width;
        faceCanvas.height = height;
        faceCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);

        try {
          const faceImageData = faceCanvas.toDataURL("image/jpeg", 0.8);
          const emotions = await emotionClassifierRef.current(faceImageData);
          
          if (emotions && emotions.length > 0) {
            const sentiment = mapEmotionToSentiment(emotions[0].label);
            faceResults.push({
              box: {
                xmin: x,
                ymin: y,
                xmax: x + width,
                ymax: y + height,
              },
              sentiment,
              confidence: emotions[0].score,
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
    ctx.lineWidth = 3;
    ctx.font = "bold 20px Arial";

    faces.forEach((face) => {
      const { box, sentiment } = face;
      
      // Set color based on sentiment
      let color = "#FFC107"; // neutral - yellow
      if (sentiment === "happy") color = "#4CAF50"; // green
      if (sentiment === "sad") color = "#F44336"; // red

      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      // Draw rectangle
      const boxWidth = box.xmax - box.xmin;
      const boxHeight = box.ymax - box.ymin;
      ctx.strokeRect(box.xmin, box.ymin, boxWidth, boxHeight);

      // Draw label background
      const label = sentiment.toUpperCase();
      const textMetrics = ctx.measureText(label);
      const textWidth = textMetrics.width;
      const textHeight = 25;
      
      ctx.fillRect(box.xmin, box.ymin - textHeight - 5, textWidth + 16, textHeight + 5);
      
      // Draw label text
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(label, box.xmin + 8, box.ymin - 10);
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
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Multiple faces are detected automatically with real-time sentiment analysis
                </p>
                <div className="flex items-center justify-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Happy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>Sad</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span>Neutral</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
};

export default FaceSentimentDetector;
