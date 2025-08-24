import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Loader2, Mail, Mic, Wifi, XCircle } from "lucide-react";
import { useState } from "react";

interface TestResult {
  endpoint: string;
  status: number | string;
  success: boolean;
  error?: string;
  response?: any;
}

export function TestApiConnection() {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const testEndpoint = async (endpoint: string, method: string = 'GET', data?: any): Promise<TestResult> => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
    const url = `${baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text();
      }

      return {
        endpoint,
        status: response.status,
        success: response.ok,
        response: responseData
      };
    } catch (error) {
      return {
        endpoint,
        status: 'ERROR',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const runTests = async () => {
    setIsTesting(true);
    setResults([]);

    const testResults: TestResult[] = [];

    // Test 1: Health Check
    toast({
      title: "Testing API Connection",
      description: "Running health check...",
    });
    
    const healthResult = await testEndpoint('/health');
    testResults.push(healthResult);

    // Test 2: Meeting Invitations
    toast({
      title: "Testing API Connection",
      description: "Testing meeting invitations...",
    });
    
    const invitationData = {
      title: "Test Meeting",
      date: "2024-01-15",
      time: "14:00",
      venue: "Test Venue",
      description: "Test meeting description",
      meetingLink: "https://test.com",
      organizer: "Test Organizer",
      agenda: ["Test agenda item"],
      attendees: [
        {
          email: "test@example.com",
          name: "Test User",
          type: "internal"
        }
      ]
    };
    
    const invitationResult = await testEndpoint('/send-meeting-invitations', 'POST', invitationData);
    testResults.push(invitationResult);

    // Test 3: Transcription Endpoint
    toast({
      title: "Testing API Connection",
      description: "Testing transcription endpoint availability...",
    });
    
    // Test transcribe endpoint availability
    const transcriptionResult = await testEndpoint('/test-transcribe');
    testResults.push(transcriptionResult);

    setResults(testResults);
    setIsTesting(false);

    const successCount = testResults.filter(r => r.success).length;
    const totalCount = testResults.length;

    if (successCount === totalCount) {
      toast({
        title: "✅ All Tests Passed",
        description: `${successCount}/${totalCount} API endpoints are working correctly!`,
      });
    } else {
      toast({
        title: "⚠️ Some Tests Failed",
        description: `${successCount}/${totalCount} API endpoints are working. Check the results below.`,
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (result: TestResult) => {
    if (result.success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (result: TestResult) => {
    if (result.success) {
      return <Badge variant="default" className="bg-green-500">SUCCESS</Badge>;
    } else {
      return <Badge variant="destructive">FAILED</Badge>;
    }
  };

  const getEndpointIcon = (endpoint: string) => {
    switch (endpoint) {
      case '/health':
        return <Wifi className="h-4 w-4" />;
      case '/send-meeting-invitations':
        return <Mail className="h-4 w-4" />;
      case '/test-transcribe':
        return <Mic className="h-4 w-4" />;
      default:
        return <Wifi className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          API Connection Test
        </CardTitle>
        <CardDescription>
          Test connectivity to the Sync Essence backend API
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            API Base URL: {import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}
          </div>
          <Button 
            onClick={runTests}
            disabled={isTesting}
            className="w-auto"
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 mr-2" />
                Run Tests
              </>
            )}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold">Test Results:</h4>
            {results.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(result)}
                  <div className="flex items-center gap-2">
                    {getEndpointIcon(result.endpoint)}
                    <span className="font-mono text-sm">{result.endpoint}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(result)}
                  <span className="text-sm text-muted-foreground">
                    {typeof result.status === 'number' ? `HTTP ${result.status}` : result.status}
                  </span>
                </div>
              </div>
            ))}
            
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-2">Summary:</div>
              <div className="text-sm text-muted-foreground">
                {results.filter(r => r.success).length}/{results.length} endpoints working
              </div>
            </div>
          </div>
        )}

        {results.length > 0 && results.some(r => !r.success) && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">Troubleshooting:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Make sure the backend server is running on port 5001</li>
              <li>• Check that all environment variables are set correctly</li>
              <li>• Verify the API base URL in your environment configuration</li>
              <li>• Check the backend logs for any error messages</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
