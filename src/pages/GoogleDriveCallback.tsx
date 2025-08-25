import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { GoogleDriveAuthService } from '@/services/google-drive-auth';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function GoogleDriveCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage('Authorization was cancelled or failed.');
        toast({
          title: "Authorization Failed",
          description: "Google Drive authorization was cancelled or failed.",
          variant: "destructive",
        });
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('No authorization code received.');
        toast({
          title: "Authorization Failed",
          description: "No authorization code received from Google.",
          variant: "destructive",
        });
        return;
      }

      try {
        const result = await GoogleDriveAuthService.handleCallback(code);
        if (result.success) {
          setStatus('success');
          setMessage('Google Drive authorization successful!');
          toast({
            title: "Authorization Successful",
            description: "Google Drive has been successfully authorized.",
          });
          
          // Close the window after a delay
          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          setStatus('error');
          setMessage(result.error || 'Authorization failed.');
          toast({
            title: "Authorization Failed",
            description: result.error || "Failed to complete Google Drive authorization.",
            variant: "destructive",
          });
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred during authorization.');
        toast({
          title: "Authorization Error",
          description: "An error occurred during Google Drive authorization.",
          variant: "destructive",
        });
      }
    };

    handleCallback();
  }, [searchParams, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-6 w-6 text-green-500" />}
            {status === 'error' && <XCircle className="h-6 w-6 text-red-500" />}
            Google Drive Authorization
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Processing authorization...'}
            {status === 'success' && 'Authorization completed successfully!'}
            {status === 'error' && 'Authorization failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">{message}</p>
          
          {status === 'success' && (
            <p className="text-xs text-muted-foreground">
              This window will close automatically in a few seconds...
            </p>
          )}
          
          {status === 'error' && (
            <div className="space-y-2">
              <Button 
                onClick={() => window.close()}
                variant="outline"
                className="w-full"
              >
                Close Window
              </Button>
              <Button 
                onClick={() => navigate('/dashboard')}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
