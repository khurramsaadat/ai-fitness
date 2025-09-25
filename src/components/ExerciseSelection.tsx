import { Sparkles } from 'lucide-react';
import React from 'react';

interface Exercise {
  name: string;
  type: 'reps' | 'time';
  target: number;
  imageUrl: string;
  orientation: 'portrait' | 'landscape';
}

interface ExerciseSelectionProps {
  availableExercises: Exercise[];
  selectedExercises: Exercise[];
  onToggleExerciseSelection: (exercise: Exercise) => void;
  onStartWorkout: () => Promise<void>;
  startScreenError: string | null;
  workoutSummary: { summary: string; suggestion: string } | null;
  workoutComplete: boolean;
}

const ExerciseSelection = ({
  availableExercises,
  selectedExercises,
  onToggleExerciseSelection,
  onStartWorkout,
  startScreenError,
  workoutSummary,
  workoutComplete,
}: ExerciseSelectionProps) => {
  return (
    <div
      id="start-screen"
      className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 z-20 p-4 sm:p-8 text-center"
    >
      <h1 id="start-screen-title" className="text-3xl sm:text-4xl font-bold mb-2 text-foreground">
        {workoutComplete ? "Workout Complete!" : "Welcome Back!"}
      </h1>
      <p id="summary-text" className="text-muted-foreground mb-6 max-w-2xl text-sm sm:text-base">
        {workoutSummary?.summary || "Select your exercises for today's workout."}
      </p>
      {startScreenError && (
        <p id="start-screen-error" className="text-destructive mb-4">
          {startScreenError}
        </p>
      )}

      {workoutSummary?.suggestion && (
        <div
          id="workout-suggestion-box"
          className="bg-card rounded-lg p-4 w-full max-w-2xl mb-6 text-left border border-border"
        >
          <h3 className="font-semibold text-primary flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> For Your Next Workout
          </h3>
          <p id="workout-suggestion-text" className="mt-2 text-muted-foreground">
            {workoutSummary.suggestion}
          </p>
        </div>
      )}

      <div
        id="exercise-selection"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full max-w-4xl mb-6"
      >
        {availableExercises.map((exercise) => (
          <div
            key={exercise.name}
            className={`exercise-card p-4 rounded-lg border-2 ${
              selectedExercises.some((e) => e.name === exercise.name)
                ? 'border-primary bg-primary/20'
                : 'border-border bg-card hover:bg-accent'
            } text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-transform transform hover:scale-105`}
            title={`Select ${exercise.name}`}
            onClick={() => onToggleExerciseSelection(exercise)}
          >
            <span className="text-foreground">{exercise.name}</span>
          </div>
        ))}
      </div>

      <button
        id="start-button"
        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-8 rounded-lg text-lg transition-all transform hover:scale-105 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
        disabled={selectedExercises.length === 0}
        title="Start Workout"
        onClick={onStartWorkout}
      >
        {workoutComplete ? "Start New Workout" : "Start Workout"}
      </button>
    </div>
  );
};

export default ExerciseSelection;
