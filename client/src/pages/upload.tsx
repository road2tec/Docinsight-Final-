import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Upload as UploadIcon, 
  FileText, 
  X, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  Cloud,
} from "lucide-react";

interface UploadingFile {
  file: File;
  progress: number;
  status: "uploading" | "processing" | "completed" | "error";
  error?: string;
  documentId?: string;
}

export default function Upload() {
  const [, navigate] = useLocation();
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      return response.json();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(file => 
      file.type === "application/pdf"
    );

    if (pdfFiles.length === 0) {
      toast({
        title: "Invalid file type",
        description: "Please upload PDF files only",
        variant: "destructive",
      });
      return;
    }

    const newFiles: UploadingFile[] = pdfFiles.map(file => ({
      file,
      progress: 0,
      status: "uploading",
    }));

    setFiles(prev => [...prev, ...newFiles]);

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      const fileIndex = files.length + i;

      try {
        setFiles(prev => prev.map((f, idx) => 
          idx === fileIndex ? { ...f, progress: 30 } : f
        ));

        const result = await uploadMutation.mutateAsync(file);

        setFiles(prev => prev.map((f, idx) => 
          idx === fileIndex ? { 
            ...f, 
            progress: 100, 
            status: "completed",
            documentId: result.id,
          } : f
        ));

        queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });

        toast({
          title: "Upload successful",
          description: `${file.name} has been uploaded and is being processed`,
        });
      } catch (error) {
        setFiles(prev => prev.map((f, idx) => 
          idx === fileIndex ? { 
            ...f, 
            status: "error",
            error: error instanceof Error ? error.message : "Upload failed",
          } : f
        ));
      }
    }
  }, [files.length, uploadMutation, queryClient, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-upload-title">Upload Documents</h1>
        <p className="text-muted-foreground mt-1">
          Upload PDF files to extract text, analyze content, and enable AI-powered Q&A
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`
              relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
              transition-all duration-200
              ${isDragActive 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
              }
            `}
            data-testid="dropzone"
          >
            <input {...getInputProps()} data-testid="input-file" />
            <div className="max-w-md mx-auto">
              <div className={`
                w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center
                ${isDragActive ? "bg-primary/20" : "bg-muted"}
              `}>
                {isDragActive ? (
                  <Cloud className="w-8 h-8 text-primary" />
                ) : (
                  <UploadIcon className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <h3 className="text-lg font-medium mb-2">
                {isDragActive ? "Drop your files here" : "Drag & drop PDF files"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse from your computer
              </p>
              <Button variant="outline" type="button">
                Select Files
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Maximum file size: 50MB. Supported format: PDF
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Upload Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {files.map((uploadFile, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
                  data-testid={`upload-item-${index}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-medium truncate">{uploadFile.file.name}</p>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatFileSize(uploadFile.file.size)}
                      </span>
                    </div>
                    {uploadFile.status === "uploading" && (
                      <div className="space-y-1">
                        <Progress value={uploadFile.progress} className="h-1.5" />
                        <p className="text-xs text-muted-foreground">Uploading...</p>
                      </div>
                    )}
                    {uploadFile.status === "processing" && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing document...
                      </div>
                    )}
                    {uploadFile.status === "completed" && (
                      <div className="flex items-center gap-2 text-xs text-chart-2">
                        <CheckCircle2 className="w-3 h-3" />
                        Uploaded successfully
                      </div>
                    )}
                    {uploadFile.status === "error" && (
                      <div className="flex items-center gap-2 text-xs text-destructive">
                        <AlertCircle className="w-3 h-3" />
                        {uploadFile.error}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {uploadFile.status === "completed" && uploadFile.documentId && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/documents/${uploadFile.documentId}`)}
                      >
                        View
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                      className="text-muted-foreground"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
