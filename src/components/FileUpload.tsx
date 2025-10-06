import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onAnalyzeLocal: (comments: string[]) => void;
  onAnalyzeCloud: (comments: string[]) => void;
  isAnalyzing: boolean;
  analysisProgress: { current: number; total: number };
}

const FileUpload = ({ onAnalyzeLocal, onAnalyzeCloud, isAnalyzing, analysisProgress }: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [useLocalMode, setUseLocalMode] = useState(true);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === "text/csv" || droppedFile.name.endsWith(".csv"))) {
      setFile(droppedFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const parseCSV = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        // Assume first line is header, rest are comments
        const comments = lines.slice(1).map(line => line.trim()).filter(Boolean);
        resolve(comments);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleAnalyze = async () => {
    if (!file) return;

    try {
      const comments = await parseCSV(file);
      if (comments.length === 0) {
        toast({
          title: "No data found",
          description: "The CSV file appears to be empty",
          variant: "destructive",
        });
        return;
      }
      if (useLocalMode) {
        onAnalyzeLocal(comments);
      } else {
        onAnalyzeCloud(comments);
      }
    } catch (error) {
      toast({
        title: "Error parsing file",
        description: "Could not read the CSV file",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-8 shadow-lg"
        >
          <h2 className="text-3xl font-bold mb-6 text-center">Upload Your Data</h2>
          
          {/* Mode Toggle */}
          <div className="mb-6 flex items-center justify-center gap-4">
            <span className={`text-sm font-medium ${useLocalMode ? 'text-primary' : 'text-muted-foreground'}`}>
              Local (Fast)
            </span>
            <button
              onClick={() => setUseLocalMode(!useLocalMode)}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              style={{ backgroundColor: useLocalMode ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useLocalMode ? 'translate-x-1' : 'translate-x-6'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${!useLocalMode ? 'text-primary' : 'text-muted-foreground'}`}>
              Cloud (AI)
            </span>
          </div>
          
          <motion.div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            whileHover={{ scale: 1.01 }}
            className={`
              border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
              transition-colors duration-200
              ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
            `}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              disabled={isAnalyzing}
            />
            
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl font-semibold mb-2">
                {file ? file.name : "Drop your CSV file here"}
              </p>
              <p className="text-muted-foreground">
                or click to browse
              </p>
            </label>
          </motion.div>

          {file && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex items-center justify-between bg-secondary/50 p-4 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <span className="font-medium">{file.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFile(null)}
                disabled={isAnalyzing}
              >
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          <Button
            onClick={handleAnalyze}
            disabled={!file || isAnalyzing}
            className="w-full mt-6 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg py-6"
          >
            {isAnalyzing ? (
              <>
                Analyzing...
                {analysisProgress.total > 0 && (
                  <span className="ml-2">
                    {analysisProgress.current}/{analysisProgress.total}
                  </span>
                )}
              </>
            ) : (
              "Analyze Sentiment"
            )}
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FileUpload;
