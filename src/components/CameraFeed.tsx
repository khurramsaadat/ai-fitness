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
  timeElapsed?: number;
  repCount?: number;
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
  lowConfidenceNotice,
  timeElapsed = 0,
  repCount = 0
}: CameraFeedProps) => {
  const clampedConfidence = Math.max(0, Math.min(100, Math.round(poseConfidence)));
  const clampedForm = Math.max(0, Math.min(100, Math.round(formScore)));
  
  // Mobile detection
  const isMobile = typeof window !== 'undefined' && 
    (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
     window.innerWidth <= 768);

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

      <div className={`absolute top-4 z-20 pointer-events-none ${
        isMobile 
          ? 'left-2 right-2 flex flex-wrap gap-2 justify-between' // Mobile: horizontal layout across top
          : 'left-4 flex flex-col gap-2' // Desktop: vertical layout on left
      }`}>
        {/* Time - Mobile only */}
        {isMobile && (
          <div className="bg-transparent text-white px-2 py-1 rounded-lg shadow-lg">
            <p className="text-xs uppercase tracking-widest text-cyan-200">Time</p>
            <p className="text-sm font-semibold text-cyan-100">{Math.floor(timeElapsed / 1000)}s</p>
          </div>
        )}
        
        {/* Confidence */}
        <div className={`text-white rounded-lg shadow-lg ${
          isMobile 
            ? 'bg-transparent px-2 py-1' // Transparent on mobile
            : 'bg-black/60 border border-cyan-400/60 backdrop-blur-sm px-4 py-2' // Normal on desktop
        }`}>
          <p className="text-xs uppercase tracking-widest text-cyan-200">Confidence</p>
          <p className={`font-semibold text-cyan-100 ${isMobile ? 'text-sm' : 'text-xl'}`}>{clampedConfidence}%</p>
        </div>
        
        {/* Form */}
        <div className={`text-white rounded-lg shadow-lg flex items-center gap-2 ${
          isMobile 
            ? 'bg-transparent px-2 py-1' // Transparent on mobile
            : 'bg-black/60 border border-cyan-400/60 backdrop-blur-sm px-4 py-2' // Normal on desktop
        }`}>
          <Target className={`text-cyan-300 ${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
          <div>
            <p className="text-xs uppercase tracking-widest text-cyan-200">Form</p>
            <p className={`font-semibold text-cyan-100 ${isMobile ? 'text-sm' : 'text-lg'}`}>{clampedForm}%</p>
          </div>
        </div>
        
        {/* Reps - Mobile only */}
        {isMobile && (
          <div className="bg-transparent text-white px-2 py-1 rounded-lg shadow-lg">
            <p className="text-xs uppercase tracking-widest text-cyan-200">Reps</p>
            <p className="text-sm font-semibold text-cyan-100">{repCount}</p>
          </div>
        )}
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

