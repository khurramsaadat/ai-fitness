import { Pause, Play, SkipForward, RotateCcw } from 'lucide-react';

interface WorkoutControlsProps {
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onReset: () => void;
  workoutState: {
    isStarted: boolean;
    isPaused: boolean;
    currentExerciseIndex: number;
  };
}

const WorkoutControls = ({ onPause, onResume, onSkip, onReset, workoutState }: WorkoutControlsProps) => {
  const handlePauseResume = () => {
    if (workoutState.isPaused) {
      onResume();
    } else {
      onPause();
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4">
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
        className="next-exercise-button bg-secondary hover:bg-accent text-secondary-foreground font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-transform transform hover:scale-105 disabled:opacity-50"
        disabled={!workoutState.isStarted || workoutState.currentExerciseIndex >= 0} // Adjust as needed
        title="Skip Exercise"
        onClick={onSkip}
      >
        <SkipForward className="w-5 h-5" />
        <span>Skip</span>
      </button>
      <button
        id="reset-button-sidebar"
        className="bg-secondary hover:bg-accent text-secondary-foreground font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-transform transform hover:scale-105"
        title="Reset Workout"
        onClick={onReset}
      >
        <RotateCcw className="w-5 h-5" />
        <span>Reset</span>
      </button>
    </div>
  );
};

export default WorkoutControls;
