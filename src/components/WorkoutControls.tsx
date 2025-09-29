import { Pause, Play, Home } from 'lucide-react';

interface WorkoutControlsProps {
  onPause: () => void;
  onResume: () => void;
  onHome: () => void;
  workoutState: {
    isStarted: boolean;
    isPaused: boolean;
    currentExerciseIndex: number;
  };
}

const WorkoutControls = ({ onPause, onResume, onHome, workoutState }: WorkoutControlsProps) => {
  const handlePauseResume = () => {
    if (workoutState.isPaused) {
      onResume();
    } else {
      onPause();
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        className="pause-button bg-secondary hover:bg-accent text-secondary-foreground font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-transform transform hover:scale-105 disabled:opacity-50"
        disabled={!workoutState.isStarted}
        title="Pause/Resume Workout"
        onClick={handlePauseResume}
      >
        {workoutState.isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
        <span>{workoutState.isPaused ? "Resume" : "Pause"}</span>
      </button>
      <button
        id="home-button-sidebar"
        className="bg-secondary hover:bg-accent text-secondary-foreground font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-transform transform hover:scale-105"
        title="Go Home"
        onClick={onHome}
      >
        <Home className="w-5 h-5" />
        <span>Home</span>
      </button>
    </div>
  );
};

export default WorkoutControls;
