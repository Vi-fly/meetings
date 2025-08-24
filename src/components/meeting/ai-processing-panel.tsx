import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  FileText, 
  Video, 
  Image, 
  BookOpen, 
  Users, 
  Clock, 
  Download, 
  Share2,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface ProcessingTask {
  id: string;
  type: 'transcript' | 'mom' | 'reels' | 'poster' | 'blog' | 'summary';
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: string;
  error?: string;
}

export const AIProcessingPanel = () => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<ProcessingTask[]>([
    { id: '1', type: 'transcript', status: 'completed', progress: 100, result: 'Meeting transcript generated with 98% accuracy' },
    { id: '2', type: 'mom', status: 'processing', progress: 65 },
    { id: '3', type: 'reels', status: 'pending', progress: 0 },
    { id: '4', type: 'poster', status: 'pending', progress: 0 },
    { id: '5', type: 'blog', status: 'pending', progress: 0 },
    { id: '6', type: 'summary', status: 'completed', progress: 100, result: 'Executive summary created with key insights' }
  ]);

  const taskIcons = {
    transcript: FileText,
    mom: FileText,
    reels: Video,
    poster: Image,
    blog: BookOpen,
    summary: Brain
  };

  const taskColors = {
    transcript: 'text-blue-500',
    mom: 'text-green-500',
    reels: 'text-purple-500',
    poster: 'text-orange-500',
    blog: 'text-indigo-500',
    summary: 'text-pink-500'
  };

  const startProcessing = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, status: 'processing' as const, progress: 0 }
        : task
    ));

    // Simulate processing
    const interval = setInterval(() => {
      setTasks(prev => {
        const updated = prev.map(task => {
          if (task.id === taskId && task.status === 'processing') {
            const newProgress = Math.min(task.progress + Math.random() * 20, 100);
            if (newProgress >= 100) {
              return { 
                ...task, 
                status: 'completed' as const, 
                progress: 100,
                result: `${task.type.charAt(0).toUpperCase() + task.type.slice(1)} generated successfully`
              };
            }
            return { ...task, progress: newProgress };
          }
          return task;
        });
        
        const completedTask = updated.find(t => t.id === taskId && t.status === 'completed');
        if (completedTask) {
          clearInterval(interval);
          toast({
            title: "Processing Complete",
            description: `${completedTask.type.charAt(0).toUpperCase() + completedTask.type.slice(1)} has been generated successfully.`,
          });
        }
        
        return updated;
      });
    }, 500);
  };

  const retryTask = (taskId: string) => {
    startProcessing(taskId);
  };

  const downloadResult = (taskType: string) => {
    toast({
      title: "Download Started",
      description: `Downloading ${taskType}...`,
    });
  };

  const shareResult = (taskType: string) => {
    toast({
      title: "Shared Successfully",
      description: `${taskType} has been shared with participants.`,
    });
  };

  const getStatusIcon = (status: ProcessingTask['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-warning animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: ProcessingTask['status']) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'error':
        return 'destructive';
      case 'processing':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="card-gradient">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Processing Center
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="queue">Queue</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tasks.map((task) => {
                const Icon = taskIcons[task.type];
                return (
                  <div key={task.id} className="p-4 border rounded-lg space-y-3 card-hover">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${taskColors[task.type]}`} />
                        <span className="font-medium capitalize">{task.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <Badge variant={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      </div>
                    </div>

                    {task.status === 'processing' && (
                      <div className="space-y-2">
                        <Progress value={task.progress} className="w-full" />
                        <p className="text-xs text-muted-foreground">
                          {Math.round(task.progress)}% complete
                        </p>
                      </div>
                    )}

                    {task.status === 'completed' && task.result && (
                      <p className="text-sm text-muted-foreground">{task.result}</p>
                    )}

                    {task.status === 'error' && task.error && (
                      <p className="text-sm text-destructive">{task.error}</p>
                    )}

                    <div className="flex gap-2">
                      {task.status === 'pending' && (
                        <Button size="sm" onClick={() => startProcessing(task.id)}>
                          Start
                        </Button>
                      )}
                      {task.status === 'error' && (
                        <Button size="sm" variant="outline" onClick={() => retryTask(task.id)}>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retry
                        </Button>
                      )}
                      {task.status === 'completed' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => downloadResult(task.type)}>
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                          <Button size="sm" onClick={() => shareResult(task.type)}>
                            <Share2 className="h-3 w-3 mr-1" />
                            Share
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            <div className="space-y-4">
              {tasks.filter(task => task.status === 'completed').map((task) => {
                const Icon = taskIcons[task.type];
                return (
                  <Card key={task.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${taskColors[task.type]}`} />
                        <div>
                          <h3 className="font-semibold capitalize">{task.type}</h3>
                          <p className="text-sm text-muted-foreground">{task.result}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => downloadResult(task.type)}>
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                        <Button size="sm" onClick={() => shareResult(task.type)}>
                          <Share2 className="h-3 w-3 mr-1" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="queue" className="space-y-4">
            <div className="space-y-4">
              {tasks.filter(task => task.status !== 'completed').map((task) => {
                const Icon = taskIcons[task.type];
                return (
                  <Card key={task.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${taskColors[task.type]}`} />
                        <div>
                          <h3 className="font-semibold capitalize">{task.type}</h3>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(task.status)}
                            <span className="text-sm text-muted-foreground capitalize">{task.status}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {task.status === 'pending' && (
                          <Button size="sm" onClick={() => startProcessing(task.id)}>
                            Start Processing
                          </Button>
                        )}
                        {task.status === 'error' && (
                          <Button size="sm" variant="outline" onClick={() => retryTask(task.id)}>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        )}
                      </div>
                    </div>
                    {task.status === 'processing' && (
                      <div className="mt-3">
                        <Progress value={task.progress} className="w-full" />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};