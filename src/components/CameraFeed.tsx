import { PauseCircle, Target } from 'lucide-react';
import React, { RefObject } from 'react';

interface CameraFeedProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  loadingText: string;
  showLoadingSpinner: boolean;
  showPauseOverlay: boolean;
  showDetectionOverlay: boolean;
  poseConfidence: number;
  formScore: number;
  lowConfidenceNotice: boolean;
}

const CameraFeed = ({
  videoRef,
  canvasRef,
  loadingText,
  showLoadingSpinner,
  showPauseOverlay,
  showDetectionOverlay,
  poseConfidence,
  formScore,
  lowConfidenceNotice
}: CameraFeedProps) => {
  const clampedConfidence = Math.max(0, Math.min(100, Math.round(poseConfidence)));
  const clampedForm = Math.max(0, Math.min(100, Math.round(formScore)));

  return (
    <div className="flex-grow rounded-2xl bg-card shadow-2xl overflow-hidden relative min-h-[480px] border border-border">
      <video
        id="webcam"
        className="w-full h-full object-cover hidden"
        autoPlay
        playsInline
        ref={videoRef}
      ></video>
      <canvas
        id="main-canvas"
        className="w-full h-full absolute top-0 left-0"
        ref={canvasRef}
      ></canvas>

      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-none">
        <div className="bg-black/60 text-white px-4 py-2 rounded-lg shadow-lg border border-cyan-400/60 backdrop-blur-sm">
          <p className="text-xs uppercase tracking-widest text-cyan-200">Confidence</p>
          <p className="text-xl font-semibold text-cyan-100">{clampedConfidence}%</p>
        </div>
        <div className="bg-black/60 text-white px-4 py-2 rounded-lg shadow-lg border border-cyan-400/60 backdrop-blur-sm flex items-center gap-2">
          <Target className="w-4 h-4 text-cyan-300" />
          <div>
            <p className="text-xs uppercase tracking-widest text-cyan-200">Form</p>
            <p className="text-lg font-semibold text-cyan-100">{clampedForm}%</p>
          </div>
        </div>
      </div>

      <div
        id="detection-overlay"
        className={`absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded-md z-10 border border-cyan-300/40 ${showDetectionOverlay ? '' : 'hidden'}`}
      >
        <p className="flex items-center gap-2 text-sm">
          <span className="inline-flex h-2 w-2 rounded-full bg-red-400 animate-pulse"></span>
          {lowConfidenceNotice ? 'Tracking lost – step back into frame' : 'No person detected'}
        </p>
      </div>

      <div
        id="pause-overlay"
        className={`absolute inset-0 flex-col items-center justify-center bg-background/80 z-20 ${showPauseOverlay ? 'flex' : 'hidden'}`}
      >
        <PauseCircle className="w-24 h-24 text-foreground/80" />
        <p className="text-3xl font-bold mt-4">Paused</p>
      </div>

      <div
        id="loading-spinner"
        className={`absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-30 ${showLoadingSpinner ? 'flex' : 'hidden'}`}
      >
        <svg
          className="animate-spin -ml-1 mr-3 h-10 w-10 text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <p id="loading-text" className="mt-4 text-lg text-foreground">
          {loadingText}
        </p>
      </div>
    </div>
  );
};

export default CameraFeed;
