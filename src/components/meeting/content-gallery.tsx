import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentItem, useContentGallery } from "@/hooks/use-content-gallery";
import { useToast } from "@/hooks/use-toast";
import {
    BookOpen,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    Download,
    ExternalLink,
    Eye,
    FileText,
    Image,
    Play,
    Share2,
    Users,
    Video
} from "lucide-react";
import { useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 9;

export const ContentGallery = () => {
  const { toast } = useToast();
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('all');
  const { data: contentItems = [], isLoading, error } = useContentGallery();

  const typeIcons = {
    transcript: FileText,
    mom: FileText,
    recordings: Video,
    poster: Image,
    blog: BookOpen
  };

  const typeColors = {
    transcript: 'bg-blue-500/10 text-blue-600 border-blue-200',
    mom: 'bg-green-500/10 text-green-600 border-green-200',
    recordings: 'bg-purple-500/10 text-purple-600 border-purple-200',
    poster: 'bg-orange-500/10 text-orange-600 border-orange-200',
    blog: 'bg-indigo-500/10 text-indigo-600 border-indigo-200'
  };

  // Memoized filtered content
  const filteredContent = useMemo(() => {
    if (activeTab === 'all') return contentItems;
    return contentItems.filter(item => item.type === activeTab);
  }, [contentItems, activeTab]);

  // Pagination logic
  const totalPages = Math.ceil(filteredContent.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = filteredContent.slice(startIndex, endIndex);

  // Reset page when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
  };

  const downloadContent = (item: ContentItem) => {
    if (item.type === 'recordings' && item.url) {
      // Open video in new tab
      window.open(item.url, '_blank');
      toast({
        title: "Video Opened",
        description: `Opening ${item.title} in new tab...`,
      });
    } else if (item.content) {
      // Create and download text content
      const blob = new Blob([item.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.title}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: `Downloading ${item.title}...`,
      });
    } else {
      toast({
        title: "No Content Available",
        description: "This item doesn't have downloadable content.",
        variant: "destructive",
      });
    }
  };

  const shareContent = (item: ContentItem) => {
    if (item.url) {
      // Copy link to clipboard
      navigator.clipboard.writeText(item.url);
      toast({
        title: "Link Copied",
        description: "Content link copied to clipboard.",
      });
    } else {
      toast({
        title: "No Shareable Link",
        description: "This content doesn't have a shareable link.",
        variant: "destructive",
      });
    }
  };

  const previewContent = (item: ContentItem) => {
    setSelectedContent(item);
  };

  if (isLoading) {
    return (
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Content Gallery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading content...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Content Gallery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Error loading content. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-gradient">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          Content Gallery
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="transcript">Transcripts</TabsTrigger>
            <TabsTrigger value="mom">Minutes</TabsTrigger>
            <TabsTrigger value="recordings">Recordings</TabsTrigger>
            <TabsTrigger value="poster">Posters</TabsTrigger>
            <TabsTrigger value="blog">Blogs</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredContent.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {activeTab === 'all' ? (
                  <div className="space-y-2">
                    <p className="font-medium">No content available yet.</p>
                    <p className="text-sm">Upload videos or generate content from your meetings to see them here.</p>
                  </div>
                ) : activeTab === 'transcript' ? (
                  <div className="space-y-2">
                    <p className="font-medium">No transcripts available.</p>
                    <p className="text-sm">Meeting transcripts will appear here once they are generated.</p>
                  </div>
                ) : activeTab === 'mom' ? (
                  <div className="space-y-2">
                    <p className="font-medium">No meeting minutes available.</p>
                    <p className="text-sm">Meeting minutes will appear here once they are generated.</p>
                  </div>
                ) : activeTab === 'recordings' ? (
                  <div className="space-y-2">
                    <p className="font-medium">No video recordings available.</p>
                    <p className="text-sm">Upload meeting recordings to see them here.</p>
                  </div>
                ) : activeTab === 'poster' ? (
                  <div className="space-y-2">
                    <p className="font-medium">No posters available.</p>
                    <p className="text-sm">Meeting posters will appear here once they are generated.</p>
                  </div>
                ) : activeTab === 'blog' ? (
                  <div className="space-y-2">
                    <p className="font-medium">No blog posts available.</p>
                    <p className="text-sm">Blog posts will appear here once they are generated from meeting content.</p>
                  </div>
                ) : (
                  `No ${activeTab} content available yet.`
                )}
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {currentItems.map((item, index) => {
                    const Icon = typeIcons[item.type];
                    return (
                      <Card key={item.id} className="card-hover animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-primary" />
                                <Badge className={typeColors[item.type]} variant="outline">
                                  {item.type}
                                </Badge>
                              </div>
                              {item.size && (
                                <span className="text-xs text-muted-foreground">{item.size}</span>
                              )}
                            </div>

                            {/* Thumbnail/Preview */}
                            {item.type === 'recordings' ? (
                              <div className="relative aspect-video bg-muted rounded overflow-hidden group">
                                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                                  <Video className="h-8 w-8 text-white" />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Play className="h-8 w-8 text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="aspect-video bg-muted rounded flex items-center justify-center">
                                <Icon className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}

                            {/* Content Info */}
                            <div className="space-y-2">
                              <h3 className="font-semibold text-sm leading-tight">{item.title}</h3>
                              <p className="text-xs text-muted-foreground">{item.meetingTitle}</p>
                              
                              {item.preview && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {item.preview}
                                </p>
                              )}

                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {item.date}
                                </div>
                                {item.duration && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {item.duration}
                                  </div>
                                )}
                                {item.participants && (
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {item.participants}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="flex-1" onClick={() => previewContent(item)}>
                                    <Eye className="h-3 w-3 mr-1" />
                                    Preview
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>{item.title}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    {item.type === 'recordings' && item.url ? (
                                      <div className="aspect-video bg-muted rounded overflow-hidden">
                                        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                                          <div className="text-center text-white">
                                            <Video className="h-12 w-12 mx-auto mb-2" />
                                            <p className="text-sm">Video Recording</p>
                                            <Button 
                                              variant="outline" 
                                              size="sm" 
                                              className="mt-2"
                                              onClick={() => window.open(item.url, '_blank')}
                                            >
                                              <ExternalLink className="h-4 w-4 mr-1" />
                                              Open Video
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    ) : item.content ? (
                                      <div className="p-4 bg-muted rounded max-h-96 overflow-y-auto">
                                        <pre className="text-sm whitespace-pre-wrap font-sans">{item.content}</pre>
                                      </div>
                                    ) : (
                                      <div className="p-4 bg-muted rounded">
                                        <p className="text-sm text-muted-foreground">No preview available</p>
                                      </div>
                                    )}
                                    <div className="flex gap-2">
                                      <Button onClick={() => downloadContent(item)}>
                                        <Download className="h-4 w-4 mr-2" />
                                        Download
                                      </Button>
                                      <Button variant="outline" onClick={() => shareContent(item)}>
                                        <Share2 className="h-4 w-4 mr-2" />
                                        Share
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              
                              <Button size="sm" onClick={() => downloadContent(item)}>
                                <Download className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => shareContent(item)}>
                                <Share2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredContent.length)} of {filteredContent.length} items
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};