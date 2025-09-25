import { HelpCircle, CheckCircle, AlertTriangle, Info, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface Exercise {
  name: string;
  type: 'reps' | 'time';
  target: number;
  imageUrl: string;
  orientation: 'portrait' | 'landscape';
}

interface FeedbackPanelProps {
  workoutState: {
    isStarted: boolean;
    repCount: number;
    holdTime: number;
    timeElapsed: number; // Added timeElapsed
    feedback: string;
    feedbackType: 'info' | 'good' | 'warning';
    personDetected: boolean;
  };
  currentExercise: Exercise | undefined;
  nextExercise: Exercise | undefined;
}

const FeedbackPanel = ({ workoutState, currentExercise, nextExercise }: FeedbackPanelProps) => {
  const [showTip, setShowTip] = useState(false);

  // Static exercise tips database
  const exerciseTips = {
    "Squats": "Keep your feet shoulder-width apart, lower until thighs are parallel to ground, and push through your heels. Keep your chest up and core engaged throughout the movement.",
    "Push-ups": "Start in plank position, lower your chest to the ground while keeping your body straight, then push back up. Keep your core tight and don't let your hips sag.",
    "Bicep Curls": "Stand with feet hip-width apart, keep your elbows close to your sides, and curl the weight up with control. Focus on squeezing your biceps at the top.",
    "Jumping Jacks": "Jump your feet apart while raising your arms overhead, then return to starting position. Land softly and maintain a steady rhythm throughout.",
    "Lunges": "Step forward into a lunge, lowering your hips until both knees are at 90 degrees. Push back to starting position and alternate legs.",
    "Plank": "Hold your body in a straight line from head to heels, engage your core, and breathe steadily. Don't let your hips drop or pike up."
  };

  const handleTipClick = () => {
    setShowTip(!showTip);
  };
  const getFeedbackIcon = (type: 'info' | 'good' | 'warning') => {
    const icons = {
      good: <CheckCircle className="w-12 h-12 text-green-500" />,
      warning: <AlertTriangle className="w-12 h-12 text-yellow-500" />,
      info: <Info className="w-12 h-12 text-blue-500" />,
    };
    return icons[type];
  };

  const getBorderColor = (type: 'info' | 'good' | 'warning') => {
    const colors = {
      good: 'border-green-500',
      warning: 'border-yellow-500',
      info: 'border-transparent',
    };
    return colors[type];
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <>
      <div className="bg-card rounded-2xl p-4 border border-border">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              CURRENT EXERCISE
            </h2>
            <p className="exercise-name text-3xl font-bold mt-1 text-foreground">
              {workoutState.isStarted && currentExercise ? currentExercise.name : "Get Ready"}
            </p>
          </div>
          <button
            className="explain-exercise-button bg-secondary hover:bg-accent text-secondary-foreground p-2 rounded-full transition-transform transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Get Exercise Tips"
            disabled={!workoutState.isStarted || !currentExercise}
            onClick={handleTipClick}
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
        <p className="next-exercise-text text-muted-foreground mt-1 text-sm">
          {workoutState.isStarted && nextExercise
            ? `Next: ${nextExercise.name}`
            : workoutState.isStarted && !nextExercise && currentExercise
            ? "Last one!"
            : "Select a workout to begin"}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl p-4 text-center col-span-1 border border-border">
          <h2 className="rep-count-label text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            {currentExercise?.type === 'time' ? 'HOLD' : 'REPS'}
          </h2>
          <p className="rep-count text-5xl font-bold mt-1 text-foreground">
            {currentExercise?.type === 'time'
              ? Math.max(0, currentExercise.target - Math.floor(workoutState.holdTime)).toFixed(0)
              : workoutState.repCount}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-4 text-center col-span-2 border border-border">
          <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            TIME
          </h2>
          <p className="timer text-5xl font-bold mt-1 text-foreground">
            {formatTime(workoutState.timeElapsed)}
          </p>
        </div>
      </div>
      <div
        className={`feedback-box bg-card rounded-2xl p-4 flex-grow flex flex-col justify-center items-center text-center transition-all duration-300 border-2 ${getBorderColor(workoutState.feedbackType)} overflow-hidden`}
      >
        {workoutState.isStarted && !workoutState.personDetected ? (
          <div className="exercise-image-content w-full h-full">
            <p className="text-xs text-muted-foreground mb-2">
              Can't see you! Here's a tip:
            </p>
            <img
              className="exercise-image w-full h-full object-cover rounded-lg"
              src={currentExercise?.imageUrl || "https://placehold.co/400x400/374151/9ca3af?text=Image+Not+Found"}
              alt="Exercise example"
            />
          </div>
        ) : showTip && currentExercise && exerciseTips[currentExercise.name as keyof typeof exerciseTips] ? (
          <div className="exercise-tip-content w-full">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-primary">Exercise Tip</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {exerciseTips[currentExercise.name as keyof typeof exerciseTips]}
            </p>
            <button 
              onClick={handleTipClick}
              className="mt-3 text-xs text-primary hover:text-primary/80 underline"
            >
              Hide tip
            </button>
          </div>
        ) : (
          <div className="regular-feedback-content">
            <div className="feedback-icon w-12 h-12 mb-2">
              {getFeedbackIcon(workoutState.feedbackType)}
            </div>
            <p className="feedback-text text-lg font-semibold text-foreground">
              {workoutState.feedback}
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default FeedbackPanel;
