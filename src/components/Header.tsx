import { Dumbbell, History, Volume2, VolumeX, Menu, RotateCcw } from 'lucide-react';

interface HeaderProps {
  onToggleMute: () => void;
  isMuted: boolean;
  onToggleCamera?: () => void;
  showCameraToggle?: boolean;
}

const Header = ({ onToggleMute, isMuted, onToggleCamera, showCameraToggle = false }: HeaderProps) => {
  const isMobile = typeof window !== 'undefined' && 
    (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
     window.innerWidth <= 768);

  return (
    <header className={`flex-shrink-0 flex justify-between items-center px-4 sm:px-6 py-3 ${
      isMobile && showCameraToggle 
        ? 'bg-transparent' // Transparent on mobile during workout
        : 'bg-card/50 backdrop-blur-lg rounded-2xl border border-border' // Normal styling otherwise
    }`}>
      <div className="flex items-center gap-3">
        <Dumbbell className="text-primary" />
        <h1 className="text-lg sm:text-xl font-bold text-foreground">AI Fitness Coach</h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          id="history-button"
          className={`p-2 rounded-full transition-transform transform hover:scale-110 ${
            isMobile && showCameraToggle 
              ? 'bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm'
              : 'bg-secondary hover:bg-accent text-secondary-foreground'
          }`}
          title="View Workout History"
        >
          <History className="w-5 h-5" />
        </button>
        {showCameraToggle && onToggleCamera && (
          <button
            id="camera-toggle-button"
            className={`p-2 rounded-full transition-transform transform hover:scale-110 ${
              isMobile 
                ? 'bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm'
                : 'bg-secondary hover:bg-accent text-secondary-foreground'
            }`}
            title="Flip Camera"
            onClick={onToggleCamera}
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        )}
        <button
          id="mute-button-header"
          className={`p-2 rounded-full transition-transform transform hover:scale-110 ${
            isMobile && showCameraToggle 
              ? 'bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm'
              : 'bg-secondary hover:bg-accent text-secondary-foreground'
          }`}
          title="Toggle Audio"
          onClick={onToggleMute}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <button
          id="menu-button"
          className={`lg:hidden p-2 rounded-full transition-transform transform hover:scale-110 ${
            isMobile && showCameraToggle 
              ? 'bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm'
              : 'bg-secondary hover:bg-accent text-secondary-foreground'
          }`}
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;
