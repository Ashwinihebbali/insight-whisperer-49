import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface FileUploadProps {
  onAnalyzeLocal: (comments: string[]) => void;
  onAnalyzeCloud: (comments: string[]) => void;
  isAnalyzing: boolean;
  analysisProgress: { current: number; total: number };
}

const SUPPORTED_FORMATS = [".csv", ".xlsx", ".xls", ".json", ".txt"];
const SUPPORTED_MIME_TYPES = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/json",
  "text/plain"
];

const FileUpload = ({ onAnalyzeLocal, onAnalyzeCloud, isAnalyzing, analysisProgress }: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [useLocalMode, setUseLocalMode] = useState(true);
  const { toast } = useToast();

  const isValidFile = (file: File): boolean => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    return SUPPORTED_FORMATS.includes(extension) || SUPPORTED_MIME_TYPES.includes(file.type);
  };

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
    if (droppedFile && isValidFile(droppedFile)) {
      setFile(droppedFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload CSV, Excel, JSON, or TXT file",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile);
    } else if (selectedFile) {
      toast({
        title: "Invalid file type",
        description: "Please upload CSV, Excel, JSON, or TXT file",
        variant: "destructive",
      });
    }
  };

  const parseCSV = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        const comments = lines.slice(1).map(line => line.trim()).filter(Boolean);
        resolve(comments);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const parseExcel = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];
          // Skip header row, flatten and filter
          const comments = jsonData.slice(1).flat().map(cell => String(cell || "").trim()).filter(Boolean);
          resolve(comments);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const parseJSON = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          let comments: string[] = [];
          if (Array.isArray(json)) {
            comments = json.map(item => typeof item === "string" ? item : Object.values(item).join(" ")).filter(Boolean);
          } else if (typeof json === "object") {
            comments = Object.values(json).flat().map(v => String(v)).filter(Boolean);
          }
          resolve(comments);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const parseTXT = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const comments = text.split('\n').map(line => line.trim()).filter(Boolean);
        resolve(comments);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const parseFile = async (file: File): Promise<string[]> => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "xlsx":
      case "xls":
        return parseExcel(file);
      case "json":
        return parseJSON(file);
      case "txt":
        return parseTXT(file);
      case "csv":
      default:
        return parseCSV(file);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    try {
      const comments = await parseFile(file);
      if (comments.length === 0) {
        toast({
          title: "No data found",
          description: "The file appears to be empty",
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
        description: "Could not read the file. Please check the format.",
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
              accept=".csv,.xlsx,.xls,.json,.txt"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              disabled={isAnalyzing}
            />
            
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl font-semibold mb-2">
                {file ? file.name : "Drop your dataset file here"}
              </p>
              <p className="text-muted-foreground mb-2">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supported: CSV, Excel (.xlsx, .xls), JSON, TXT
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
