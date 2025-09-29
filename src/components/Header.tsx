import { Dumbbell, History, Volume2, VolumeX, Menu, RotateCcw } from 'lucide-react';

interface HeaderProps {
  onToggleMute: () => void;
  isMuted: boolean;
  onToggleCamera?: () => void;
  showCameraToggle?: boolean;
}

const Header = ({ onToggleMute, isMuted, onToggleCamera, showCameraToggle = false }: HeaderProps) => {
  return (
    <header className="flex-shrink-0 flex justify-between items-center bg-card/50 backdrop-blur-lg rounded-2xl px-4 sm:px-6 py-3 border border-border">
      <div className="flex items-center gap-3">
        <Dumbbell className="text-primary" />
        <h1 className="text-lg sm:text-xl font-bold text-foreground">AI Fitness Coach</h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          id="history-button"
          className="bg-secondary hover:bg-accent text-secondary-foreground p-2 rounded-full transition-transform transform hover:scale-110"
          title="View Workout History"
        >
          <History className="w-5 h-5" />
        </button>
        {showCameraToggle && onToggleCamera && (
          <button
            id="camera-toggle-button"
            className="bg-secondary hover:bg-accent text-secondary-foreground p-2 rounded-full transition-transform transform hover:scale-110"
            title="Flip Camera"
            onClick={onToggleCamera}
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        )}
        <button
          id="mute-button-header"
          className="bg-secondary hover:bg-accent text-secondary-foreground p-2 rounded-full transition-transform transform hover:scale-110"
          title="Toggle Audio"
          onClick={onToggleMute}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <button
          id="menu-button"
          className="lg:hidden bg-secondary hover:bg-accent text-secondary-foreground p-2 rounded-full transition-transform transform hover:scale-110"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;
