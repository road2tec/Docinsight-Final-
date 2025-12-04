import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { 
  Send, 
  FileText, 
  MessageSquare,
  Bot,
  User,
  Loader2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { Document, ChatMessage } from "@shared/schema";
import { format } from "date-fns";

interface ChatMessageWithDocument extends ChatMessage {
  document?: Document;
}

const exampleQuestions = [
  "What is the main topic of this document?",
  "Summarize the key points mentioned",
  "What are the important dates or deadlines?",
  "List all the people mentioned",
  "What organizations are referenced?",
];

export default function Chat() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  const documentIdFromUrl = searchParams.get("document");

  const [selectedDocumentId, setSelectedDocumentId] = useState<string>(documentIdFromUrl || "");
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents, isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const completedDocuments = documents?.filter(d => d.status === "completed") || [];

  const { data: chatMessages, isLoading: messagesLoading } = useQuery<ChatMessageWithDocument[]>({
    queryKey: ["/api/chat", selectedDocumentId],
    enabled: !!selectedDocumentId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", "/api/chat", {
        documentId: selectedDocumentId,
        content,
      });
    },
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat", selectedDocumentId] });
      setMessage("");
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
        return;
      }
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsTyping(false);
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isTyping]);

  useEffect(() => {
    if (documentIdFromUrl && !selectedDocumentId) {
      setSelectedDocumentId(documentIdFromUrl);
    }
  }, [documentIdFromUrl, selectedDocumentId]);

  const handleSend = () => {
    if (!message.trim() || !selectedDocumentId || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(message.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExampleQuestion = (question: string) => {
    setMessage(question);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Document Q&A</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ask questions about your documents
                </p>
              </div>
            </div>
            <Select value={selectedDocumentId} onValueChange={setSelectedDocumentId}>
              <SelectTrigger className="w-64" data-testid="select-document">
                <SelectValue placeholder="Select a document" />
              </SelectTrigger>
              <SelectContent>
                {documentsLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Loading documents...
                  </div>
                ) : completedDocuments.length > 0 ? (
                  completedDocuments.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="truncate max-w-[180px]">{doc.originalName}</span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No processed documents
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {!selectedDocumentId ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">Select a document to start</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Choose a processed document from the dropdown above to begin asking questions
                </p>
                {completedDocuments.length === 0 && (
                  <Link href="/upload">
                    <Button variant="outline">
                      Upload Document
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 p-6">
                {messagesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3">
                        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-20 w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : chatMessages && chatMessages.length > 0 ? (
                  <div className="space-y-6">
                    {chatMessages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                        data-testid={`chat-message-${msg.id}`}
                      >
                        {msg.role === "assistant" && (
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                        <div className={`
                          max-w-[75%] rounded-2xl p-4
                          ${msg.role === "user" 
                            ? "bg-primary text-primary-foreground ml-auto" 
                            : "bg-muted"
                          }
                        `}>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </p>
                          <p className={`text-xs mt-2 ${
                            msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}>
                            {msg.createdAt && format(new Date(msg.createdAt), "h:mm a")}
                          </p>
                        </div>
                        {msg.role === "user" && (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div className="bg-muted rounded-2xl p-4">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <h4 className="font-medium mb-3">Start a conversation</h4>
                    <p className="text-sm text-muted-foreground mb-6">
                      Ask anything about your document
                    </p>
                    <div className="space-y-2">
                      {exampleQuestions.slice(0, 3).map((question, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="w-full justify-start text-left h-auto py-3 px-4"
                          onClick={() => handleExampleQuestion(question)}
                        >
                          <Sparkles className="w-4 h-4 mr-3 text-primary flex-shrink-0" />
                          <span className="text-sm">{question}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>

              <div className="border-t p-4">
                <div className="flex gap-3">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question about this document..."
                    className="min-h-[60px] resize-none"
                    disabled={sendMessageMutation.isPending}
                    data-testid="input-chat-message"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    className="h-[60px] px-6"
                    data-testid="button-send-message"
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="w-80 hidden lg:flex flex-col flex-shrink-0">
        <CardHeader className="border-b">
          <CardTitle className="text-base font-medium">Example Questions</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-4">
          <div className="space-y-2">
            {exampleQuestions.map((question, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start text-left h-auto py-3 px-3 hover-elevate"
                onClick={() => handleExampleQuestion(question)}
                disabled={!selectedDocumentId}
              >
                <span className="text-sm text-muted-foreground">{question}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
