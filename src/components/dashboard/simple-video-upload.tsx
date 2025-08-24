import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { FileVideo, Upload } from "lucide-react";
import { useRef, useState } from "react";

interface SimpleVideoUploadProps {
  meetingId: string;
  onUploadComplete: (videoData: {
    meeting_id: string;
    drive_share_link: string;
    original_filename: string;
    uploaded_by: string;
  }) => void;
  setIsUploading?: (v: boolean) => void;
  setUploadProgress?: (v: number) => void;
  setIsDriveUploading?: (v: boolean) => void;
  setDriveProgress?: (v: number) => void;
}

export function SimpleVideoUpload({
  meetingId,
  onUploadComplete,
  setIsUploading,
  setUploadProgress,
  setIsDriveUploading,
  setDriveProgress
}: SimpleVideoUploadProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localIsUploading, localSetIsUploading] = useState(false);
  const [localUploadProgress, localSetUploadProgress] = useState(0);
  const [localDriveProgress, localSetDriveProgress] = useState(0);
  const [localIsDriveUploading, localSetIsDriveUploading] = useState(false);
  const drivePollInterval = useRef<NodeJS.Timeout | null>(null);
  const [driveCompleted, setDriveCompleted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a video file",
        variant: "destructive",
      });
    }
  };

  const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB per chunk

  const handleUpload = async () => {
    if (!selectedFile) return;

    // Use parent setters if provided, else local state
    (setIsUploading ?? localSetIsUploading)(true);
    (setUploadProgress ?? localSetUploadProgress)(0);
    (setDriveProgress ?? localSetDriveProgress)(0);

    try {
      // Prepare form data for single file upload
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("meeting_id", meetingId);

      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const res = await fetch(`${baseUrl}/upload-drive-file`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("File upload failed");
      }

      const result = await res.json();
      const uploadId = result.upload_id || result.file_id || result.id;
      if (!uploadId) throw new Error("No upload_id returned");

      (setIsUploading ?? localSetIsUploading)(false);
      (setUploadProgress ?? localSetUploadProgress)(100);
      setUploadedFileId(uploadId);

      (setIsDriveUploading ?? localSetIsDriveUploading)(true);
      (setDriveProgress ?? localSetDriveProgress)(0);

      // Poll Google Drive upload status
      const pollDriveStatus = async () => {
        try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL;
          const statusRes = await fetch(`${baseUrl}/upload-drive-status/${uploadId}`);
          if (!statusRes.ok) throw new Error("Status fetch failed");
          const status = await statusRes.json();

          // Always update progress indicator
          (setDriveProgress ?? localSetDriveProgress)(status.progress ?? 0);

          // Stop polling if completed or error present
          if (status.completed === true) {
            (setDriveProgress ?? localSetDriveProgress)(100);
            (setIsDriveUploading ?? localSetIsDriveUploading)(false);
            clearInterval(drivePollInterval.current!);

            setDriveCompleted(true);

            // Store drive_file_id for deletion
            setDriveFileId(status.drive_file_id ?? null);

            const videoData = {
              meeting_id: meetingId,
              original_filename: selectedFile.name,
              uploaded_by: "system", // Use a default value since we don't have user context
              drive_share_link: status.drive_share_link
            };

            onUploadComplete(videoData);

            // Reset progress indicators
            setSelectedFile(null);
            (setUploadProgress ?? localSetUploadProgress)(0);
            (setDriveProgress ?? localSetDriveProgress)(0);

          } else if (status.error) {
            (setIsDriveUploading ?? localSetIsDriveUploading)(false);
            clearInterval(drivePollInterval.current!);

            toast({
              title: "Drive upload error",
              description: status.error,
              variant: "destructive",
            });

            // Reset progress indicators
            setSelectedFile(null);
            (setUploadProgress ?? localSetUploadProgress)(0);
            (setDriveProgress ?? localSetDriveProgress)(0);
            setDriveCompleted(false);
          }
        } catch {
          // ignore polling errors, will retry
        }
      };

      drivePollInterval.current = setInterval(pollDriveStatus, 2000);
      pollDriveStatus();

    } catch (error) {
      (setIsUploading ?? localSetIsUploading)(false);
      (setIsDriveUploading ?? localSetIsDriveUploading)(false);
      toast({
        title: "Upload failed",
        description: "Failed to upload video. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!driveFileId) return;
    setIsDeleting(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${baseUrl}/delete-drive-file`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ fileId: driveFileId })
      });

      if (response.ok) {
        toast({
          title: "File deleted",
          description: "The video file has been deleted from Google Drive.",
        });
        setUploadedFileId(null);
        setDriveFileId(null);
        setDriveCompleted(false);
      } else {
        toast({
          title: "Delete failed",
          description: "Could not delete the file. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Delete error",
        description: "An error occurred while deleting the file.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Only show local progress if parent handlers are not provided
  const showProgress =
    !setIsUploading && !setUploadProgress && !setIsDriveUploading && !setDriveProgress;

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
        <div className="text-center space-y-4">
          <FileVideo className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Meeting Recording
            </Button>
            <Input
              id="video-upload"
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
              ref={fileInputRef}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Select a video file to upload
          </p>
        </div>
      </div>

      {/* Upload Progress (only show if not controlled by parent) */}
      {showProgress && (localIsUploading || localIsDriveUploading) && (
        <div className="space-y-2">
          {localIsUploading && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm">Uploading to server...</span>
                <span className="text-sm font-medium">{localUploadProgress.toFixed(1)}%</span>
              </div>
              <Progress value={localUploadProgress} className="h-2" />
            </>
          )}
          {localIsDriveUploading && (
            <>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm">Uploading to Google Drive...</span>
                <span className="text-sm font-medium">{localDriveProgress.toFixed(1)}%</span>
              </div>
              <Progress value={localDriveProgress} className="h-2 bg-blue-100" />
            </>
          )}
        </div>
      )}

      {/* Selected File */}
      {selectedFile && !(showProgress ? localIsUploading : false) && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <FileVideo className="h-4 w-4" />
            <span className="text-sm">{selectedFile.name}</span>
          </div>
          <Button onClick={handleUpload} size="sm">
            Upload Video
          </Button>
        </div>
      )}

      {/* Uploaded File Actions */}
      {driveFileId && driveCompleted && !(showProgress ? localIsUploading || localIsDriveUploading : false) && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg mt-2">
          <span className="text-sm">Video uploaded to Google Drive</span>
          <Button
            onClick={handleDelete}
            size="sm"
            variant="destructive"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Video"}
          </Button>
        </div>
      )}
    </div>
  );
}