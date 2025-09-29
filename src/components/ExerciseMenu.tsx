import React from 'react';
import { X, RotateCcw, Clock, History } from 'lucide-react';
import Image from 'next/image';

interface Exercise {
  name: string;
  type: 'reps' | 'time';
  target: number;
  imageUrl: string;
  orientation: 'portrait' | 'landscape';
}

interface ExerciseMenuProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: Exercise[];
  onExerciseSelect: (exercise: Exercise) => void;
  onHistoryClick?: () => void;
}

const ExerciseMenu = ({ isOpen, onClose, exercises, onExerciseSelect, onHistoryClick }: ExerciseMenuProps) => {
  if (!isOpen) return null;

  const handleExerciseClick = (exercise: Exercise) => {
    onExerciseSelect(exercise);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="absolute top-0 right-0 h-full w-full max-w-sm bg-background border-l border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Exercises</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-secondary hover:bg-accent text-secondary-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {/* Workout History Option */}
            <div
              className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-accent/50 cursor-pointer transition-all duration-200 hover:scale-102 bg-primary/5"
              onClick={() => {
                onHistoryClick?.();
                onClose();
              }}
            >
              <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <History className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">Workout History</h3>
                <p className="text-sm text-muted-foreground">View your past workouts</p>
              </div>
              <div className="text-muted-foreground">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border my-4"></div>

            {exercises.map((exercise) => (
              <div
                key={exercise.name}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-accent/50 cursor-pointer transition-all duration-200 hover:scale-102"
                onClick={() => handleExerciseClick(exercise)}
              >
                {/* Exercise Image */}
                <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={exercise.imageUrl}
                    alt={`${exercise.name} exercise`}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>

                {/* Exercise Info */}
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">{exercise.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {exercise.type === 'reps' ? (
                      <RotateCcw className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                    <span>
                      {exercise.target} {exercise.type === 'reps' ? 'reps' : 'sec'}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="text-muted-foreground">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            Tap any exercise to start your workout
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExerciseMenu;
