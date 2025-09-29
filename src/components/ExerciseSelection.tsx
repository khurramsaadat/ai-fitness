import { Sparkles, Clock, RotateCcw, Target } from 'lucide-react';
import React from 'react';
import Image from 'next/image';

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
      className="absolute inset-0 flex flex-col items-center justify-start bg-background/95 z-20 p-4 sm:p-6 text-center overflow-y-auto"
    >
      <div className="w-full max-w-7xl mx-auto py-8">
        <h1 id="start-screen-title" className="text-4xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          {workoutComplete ? "🎉 Workout Complete!" : "💪 Welcome Back!"}
        </h1>
        <p id="summary-text" className="text-muted-foreground mb-8 max-w-3xl mx-auto text-base sm:text-lg leading-relaxed">
          {workoutSummary?.summary || "Choose your exercises and let's get moving! Select the workouts you want to focus on today."}
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
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mb-8"
      >
        {availableExercises.map((exercise) => {
          const isSelected = selectedExercises.some((e) => e.name === exercise.name);
          return (
            <div
              key={exercise.name}
              className={`exercise-card group relative overflow-hidden rounded-2xl border-3 transition-all duration-300 cursor-pointer ${
                isSelected
                  ? 'border-primary ring-4 ring-primary/30 shadow-2xl scale-105'
                  : 'border-border hover:border-primary/50 hover:shadow-xl hover:scale-102'
              }`}
              title={`Select ${exercise.name} - ${exercise.target} ${exercise.type === 'reps' ? 'reps' : 'seconds'}`}
              onClick={() => onToggleExerciseSelection(exercise)}
            >
              {/* Exercise Image */}
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={exercise.imageUrl}
                  alt={`${exercise.name} exercise demonstration`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  priority={false}
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                
                {/* Exercise Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white text-xl font-bold mb-2 drop-shadow-lg">
                    {exercise.name}
                  </h3>
                  
                  <div className="flex items-center justify-between text-white/90 text-sm">
                    <div className="flex items-center gap-1">
                      {exercise.type === 'reps' ? (
                        <RotateCcw className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      <span className="font-medium">
                        {exercise.target} {exercise.type === 'reps' ? 'reps' : 'sec'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      <span className="capitalize font-medium">
                        {exercise.type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Hover Effect */}
              <div className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${
                isSelected 
                  ? 'opacity-0' 
                  : 'opacity-0 group-hover:opacity-100 bg-primary/10'
              }`} />
            </div>
          );
        })}
      </div>

        <div className="flex flex-col items-center gap-4 mt-8">
          <button
            id="start-button"
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-bold py-4 px-12 rounded-2xl text-xl transition-all transform hover:scale-105 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
            disabled={selectedExercises.length === 0}
            title={selectedExercises.length === 0 ? "Select at least one exercise to start" : "Start your workout now!"}
            onClick={onStartWorkout}
          >
            {workoutComplete ? "🚀 Start New Workout" : "🔥 Start Workout"}
          </button>
          
          {selectedExercises.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Select at least one exercise to begin your workout
            </p>
          )}
          
          {selectedExercises.length > 0 && (
            <p className="text-primary font-medium text-sm">
              {selectedExercises.length} exercise{selectedExercises.length > 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExerciseSelection;
