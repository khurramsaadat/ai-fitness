import { UserX, PauseCircle } from 'lucide-react';
import React, { RefObject } from 'react';

interface CameraFeedProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  loadingText: string;
  showLoadingSpinner: boolean;
  showPauseOverlay: boolean;
  showDetectionOverlay: boolean;
}

const CameraFeed = ({ videoRef, canvasRef, loadingText, showLoadingSpinner, showPauseOverlay, showDetectionOverlay }: CameraFeedProps) => {
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

      <div
        id="detection-overlay"
        className={`absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-md z-10 ${showDetectionOverlay ? '' : 'hidden'}`}
      >
        <p className="flex items-center gap-2 text-sm">
          <UserX className="w-4 h-4 text-primary" /> No person detected
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
