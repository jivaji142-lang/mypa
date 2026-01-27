import { useState, useRef } from "react";
import { Mic, Square, Play, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  isUploading?: boolean;
}

export function VoiceRecorder({ onRecordingComplete, isUploading }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setAudioUrl(base64data);
          setRecordedBlob(blob);
          onRecordingComplete(blob); // Note: We still pass blob for upload, but we'll use base64 for local playback/storage if upload is mock
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setAudioUrl(null);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-slate-50 rounded-xl border border-slate-100">
      <div className={cn(
        "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
        isRecording ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse" : "bg-blue-100"
      )}>
        {isRecording ? (
          <Mic className="w-8 h-8 text-white" />
        ) : (
          <Mic className="w-8 h-8 text-[#002E6E]" />
        )}
      </div>

      <div className="flex gap-2 w-full justify-center">
        {!isRecording ? (
          <Button
            type="button"
            onClick={startRecording}
            variant="outline"
            className="border-blue-200 text-[#002E6E] hover:bg-blue-50"
          >
            {audioUrl ? "Record Again" : "Start Recording"}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={stopRecording}
            variant="destructive"
            className="animate-pulse"
          >
            <Square className="w-4 h-4 mr-2" /> Stop Recording
          </Button>
        )}
      </div>

      {audioUrl && !isRecording && (
        <div className="w-full flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 mt-2">
          <audio controls src={audioUrl} className="w-full h-8" />
          {isUploading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
        </div>
      )}
      
      <p className="text-xs text-slate-400 italic text-center">
        {isRecording ? "Recording... Speak clearly." : "Tap start to record your alarm voice."}
      </p>
    </div>
  );
}
