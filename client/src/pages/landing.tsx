import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  FileText, 
  Brain, 
  MessageSquare, 
  BarChart3, 
  Upload, 
  Search,
  Shield,
  Zap
} from "lucide-react";

export default function Landing() {
  const features = [
    {
      icon: Upload,
      title: "Smart Upload",
      description: "Drag and drop PDFs with intelligent processing and progress tracking"
    },
    {
      icon: FileText,
      title: "Text Extraction",
      description: "Advanced OCR technology extracts text from any PDF document"
    },
    {
      icon: Brain,
      title: "AI Analysis",
      description: "Automatic entity recognition, keyword extraction, and summarization"
    },
    {
      icon: MessageSquare,
      title: "Document Q&A",
      description: "Ask questions about your documents and get contextual answers"
    },
    {
      icon: Search,
      title: "Smart Search",
      description: "Find information across all your documents instantly"
    },
    {
      icon: BarChart3,
      title: "Visual Reports",
      description: "Generate beautiful reports with charts and insights"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl">DocuMind</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href="/api/login">
              <Button data-testid="button-login">Sign In</Button>
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="py-24 lg:py-32">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-sm font-medium mb-8">
                <Zap className="w-4 h-4 text-primary" />
                AI-Powered Document Processing
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Transform Your Documents into{" "}
                <span className="text-primary">Actionable Insights</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                Upload PDFs, extract text and tables, analyze content with AI, and get instant answers 
                to your questions. The intelligent document processing platform for modern teams.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/api/login">
                  <Button size="lg" className="w-full sm:w-auto" data-testid="button-get-started">
                    Get Started Free
                  </Button>
                </a>
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Watch Demo
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-semibold mb-4">Powerful Features</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Everything you need to process, analyze, and understand your documents
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="hover-elevate transition-all">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-semibold mb-6">
                  Enterprise-Grade Security
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Your documents are protected with industry-leading security measures. 
                  Role-based access control, encrypted storage, and comprehensive audit logs 
                  ensure your data stays safe.
                </p>
                <div className="space-y-4">
                  {[
                    "End-to-end encryption for all documents",
                    "Role-based access control (RBAC)",
                    "Secure authentication with multiple providers",
                    "Comprehensive audit logging"
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:pl-8">
                <Card className="p-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
                      <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-medium mb-3">Secure by Design</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Built with security-first architecture to protect your most sensitive documents
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/30">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-semibold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of professionals who trust DocuMind for their document processing needs.
            </p>
            <a href="/api/login">
              <Button size="lg" data-testid="button-start-free">
                Start Processing Documents
              </Button>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-medium">DocuMind</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Intelligent Document Processing System
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
