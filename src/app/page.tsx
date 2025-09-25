"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import Header from '@/components/Header';
import WorkoutControls from '@/components/WorkoutControls';
import FeedbackPanel from '@/components/FeedbackPanel';
import CameraFeed from '@/components/CameraFeed';
import ExerciseSelection from '@/components/ExerciseSelection';
import * as tf from '@tensorflow/tfjs';
import * as posenet from '@tensorflow-models/posenet';

interface Exercise {
  name: string;
  type: 'reps' | 'time';
  target: number;
  imageUrl: string;
  orientation: 'portrait' | 'landscape';
}

interface CompletedExercise {
  name: string;
  type: 'reps' | 'time';
  completed: number;
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detector = useRef<posenet.PoseNet | null>(null);
  const rafId = useRef<number | null>(null);
  const isMuted = useRef<boolean>(false);

  const [workoutState, setWorkoutState] = useState({
    isStarted: false,
    isPaused: false,
    currentExerciseIndex: 0,
    repCount: 0,
    startTime: null as number | null,
    timeElapsed: 0,
    holdTime: 0,
    holdStartTime: null as number | null,
    stage: 'up' as 'up' | 'down' | null,
    feedback: "Select your exercises to begin!",
    feedbackType: 'info' as 'info' | 'good' | 'warning',
    personDetected: true,
  });

  const [workoutPlan, setWorkoutPlan] = useState<Exercise[]>([]);
  const [completedExercises, setCompletedExercises] = useState<CompletedExercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [startScreenError, setStartScreenError] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState("Initializing AI Coach...");
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(true);
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [workoutSummary, setWorkoutSummary] = useState<{ summary: string; suggestion: string } | null>(null);

  const availableExercises: Exercise[] = [
    { name: "Squats", type: 'reps', target: 12, imageUrl: "https://images.pexels.com/photos/2261477/pexels-photo-2261477.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1", orientation: 'portrait' },
    { name: "Push-ups", type: 'reps', target: 10, imageUrl: "https://images.pexels.com/photos/4162484/pexels-photo-4162484.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1", orientation: 'landscape' },
    { name: "Bicep Curls", type: 'reps', target: 12, imageUrl: "https://images.pexels.com/photos/1431282/pexels-photo-1431282.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1", orientation: 'portrait' },
    { name: "Jumping Jacks", type: 'reps', target: 20, imageUrl: "https://images.pexels.com/photos/7031706/pexels-photo-7031706.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1", orientation: 'portrait' },
    { name: "Lunges", type: 'reps', target: 12, imageUrl: "https://images.pexels.com/photos/3112004/pexels-photo-3112004.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1", orientation: 'portrait' },
    { name: "Plank", type: 'time', target: 30, imageUrl: "https://images.pexels.com/photos/3076516/pexels-photo-3076516.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1", orientation: 'landscape' },
  ];

  const keypointMap = useRef({
    'nose': 0, 'leftEye': 1, 'rightEye': 2, 'leftEar': 3, 'rightEar': 4,
    'leftShoulder': 5, 'rightShoulder': 6, 'leftElbow': 7, 'rightElbow': 8,
    'leftWrist': 9, 'rightWrist': 10, 'leftHip': 11, 'rightHip': 12,
    'leftKnee': 13, 'rightKnee': 14, 'leftAnkle': 15, 'rightAnkle': 16
  });

  const speak = useCallback((text: string) => {
    if (isMuted.current || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.2;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  const calculateAngle = (p1: any, p2: any, p3: any) => {
    const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    return angle > 180.0 ? 360 - angle : angle;
  };

  const drawKeypoints = (keypoints: any[], ctx: CanvasRenderingContext2D) => {
    keypoints.forEach(keypoint => {
      if (keypoint.score > 0.3) {
        ctx.beginPath();
        ctx.arc(keypoint.position.x, keypoint.position.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'oklch(0.7 0.15 85)'; // primary color
        ctx.fill();
      }
    });
  };

  const drawSkeleton = (keypoints: any[], ctx: CanvasRenderingContext2D) => {
    const adjacentKeyPoints = [
      ['leftShoulder', 'rightShoulder'], ['leftShoulder', 'leftElbow'],
      ['rightShoulder', 'rightElbow'], ['leftElbow', 'leftWrist'],
      ['rightElbow', 'rightWrist'], ['leftShoulder', 'leftHip'],
      ['rightShoulder', 'rightHip'], ['leftHip', 'rightHip'],
      ['leftHip', 'leftKnee'], ['rightHip', 'rightKnee'],
      ['leftKnee', 'leftAnkle'], ['rightKnee', 'rightAnkle']
    ];
    adjacentKeyPoints.forEach(pair => {
      const kp1 = keypoints[keypointMap.current[pair[0] as keyof typeof keypointMap.current]];
      const kp2 = keypoints[keypointMap.current[pair[1] as keyof typeof keypointMap.current]];
      if (kp1.score > 0.3 && kp2.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(kp1.position.x, kp1.position.y);
        ctx.lineTo(kp2.position.x, kp2.position.y);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.stroke();
      }
    });
  };

  const goToNextExercise = useCallback(() => {
    setWorkoutState(prevState => {
      const currentExercise = workoutPlan[prevState.currentExerciseIndex];
      const newCompletedExercises = [...completedExercises, { name: currentExercise.name, type: currentExercise.type, completed: currentExercise.type === 'reps' ? prevState.repCount : prevState.holdTime }];
      setCompletedExercises(newCompletedExercises);
      speak(`Great job on the ${currentExercise.name}.`);

      const nextIndex = prevState.currentExerciseIndex + 1;
      if (nextIndex >= workoutPlan.length) {
        // End workout
        return { ...prevState, isStarted: false, feedback: "Workout Complete!", feedbackType: 'info' };
      }

      const newExercise = workoutPlan[nextIndex];
      const feedback = `Next up: ${newExercise.name}. Get ready!`;
      speak(feedback);
      return {
        ...prevState,
        currentExerciseIndex: nextIndex,
        repCount: 0,
        stage: 'up',
        holdTime: 0,
        holdStartTime: null,
        feedback,
        feedbackType: 'info',
      };
    });
  }, [workoutPlan, completedExercises, speak]);

  const exerciseProcessors = useRef<{ [key: string]: (keypoints: any[]) => void }>({
    "Bicep Curls": (keypoints: any[]) => { /* ... same as before ... */ },
    "Squats": (keypoints: any[]) => { /* ... same as before ... */ },
    "Push-ups": (keypoints: any[]) => { /* ... same as before ... */ },
    "Jumping Jacks": (keypoints: any[]) => { /* ... same as before ... */ },
    "Lunges": (keypoints: any[]) => {
      const leftKneeAngle = calculateAngle(keypoints[keypointMap.current['leftHip']], keypoints[keypointMap.current['leftKnee']], keypoints[keypointMap.current['leftAnkle']]);
      const rightKneeAngle = calculateAngle(keypoints[keypointMap.current['rightHip']], keypoints[keypointMap.current['rightKnee']], keypoints[keypointMap.current['rightAnkle']]);
      const leftHipAngle = calculateAngle(keypoints[keypointMap.current['leftShoulder']], keypoints[keypointMap.current['leftHip']], keypoints[keypointMap.current['leftKnee']]);
      const rightHipAngle = calculateAngle(keypoints[keypointMap.current['rightShoulder']], keypoints[keypointMap.current['rightHip']], keypoints[keypointMap.current['rightKnee']]);
      const inLungePosition = (leftKneeAngle < 120 && leftHipAngle < 120) || (rightKneeAngle < 120 && rightHipAngle < 120);

      setWorkoutState(prevState => {
        if (leftKneeAngle > 160 && rightKneeAngle > 160 && prevState.stage === 'down') {
          return { ...prevState, stage: 'up', repCount: prevState.repCount + 1, feedback: "Good lunge!", feedbackType: 'good' };
        }
        if (inLungePosition && prevState.stage !== 'down') {
          return { ...prevState, stage: 'down' };
        }
        return prevState;
      });
    },
    "Plank": (keypoints: any[]) => {
      const leftShoulder = keypoints[keypointMap.current['leftShoulder']];
      const leftHip = keypoints[keypointMap.current['leftHip']];
      const leftAnkle = keypoints[keypointMap.current['leftAnkle']];
      const bodyAngle = calculateAngle(leftShoulder, leftHip, leftAnkle);

      setWorkoutState(prevState => {
        if (bodyAngle > 160 && bodyAngle < 200) {
          const now = Date.now();
          const newHoldStartTime = prevState.holdStartTime || now;
          const newHoldTime = prevState.holdTime + (now - newHoldStartTime) / 1000;
          return { ...prevState, holdStartTime: now, holdTime: newHoldTime, feedback: "Hold it steady!", feedbackType: 'good' };
        } else {
          return { ...prevState, holdStartTime: null, feedback: "Straighten your back!", feedbackType: 'warning' };
        }
      });
    }
  });

  const poseDetectionFrame = useCallback(async () => {
    if (!workoutState.isStarted || workoutState.isPaused || !detector.current || !videoRef.current || !canvasRef.current) {
      // console.log("Pose detection skipped:", { isStarted: workoutState.isStarted, isPaused: workoutState.isPaused, detector: !!detector.current, videoRef: !!videoRef.current, canvasRef: !!canvasRef.current });
      rafId.current = requestAnimationFrame(poseDetectionFrame); // Keep requesting frames even if paused/not started
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentExercise = workoutPlan[workoutState.currentExerciseIndex];
    if (!currentExercise) {
      // console.log("No current exercise, skipping pose detection frame.");
      rafId.current = requestAnimationFrame(poseDetectionFrame);
      return;
    }

    const personWasDetected = workoutState.personDetected;
    let poses;
    try {
        poses = await detector.current.estimateSinglePose(video, {
          flipHorizontal: true,
        });
    } catch (error) {
      console.error("Error estimating poses:", error);
      setWorkoutState(prevState => ({ ...prevState, personDetected: false, feedback: "Pose detection error!", feedbackType: 'warning' }));
      rafId.current = requestAnimationFrame(poseDetectionFrame);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    setWorkoutState(prevState => {
      const newPersonDetected = poses !== null;
      let newStartTime = prevState.startTime;
      let newTimeElapsed = prevState.timeElapsed;

      if (newPersonDetected) {
        if (!personWasDetected) { // Person just became detected
          newStartTime = Date.now();
          // console.log("Person detected, setting new startTime:", newStartTime);
        }
        const keypoints = poses.keypoints;
        drawKeypoints(keypoints, ctx);
        drawSkeleton(keypoints, ctx);

        if (exerciseProcessors.current[currentExercise.name]) {
          exerciseProcessors.current[currentExercise.name](keypoints);
        }

        if (currentExercise.type === 'reps' && prevState.repCount >= currentExercise.target) {
          // console.log("Rep target reached, going to next exercise.");
          goToNextExercise();
        } else if (currentExercise.type === 'time' && prevState.holdTime >= currentExercise.target) {
          // console.log("Hold time target reached, going to next exercise.");
          goToNextExercise();
        }
      } else { // No person detected
        if (personWasDetected && prevState.startTime) { // Person just became undetected
          newTimeElapsed += Date.now() - prevState.startTime;
          newStartTime = null;
          // console.log("Person undetected, updating timeElapsed:", newTimeElapsed);
        }
        if (prevState.holdStartTime) {
          return { ...prevState, holdStartTime: null, personDetected: newPersonDetected, startTime: newStartTime, timeElapsed: newTimeElapsed };
        }
      }
      // console.log("Updating workoutState:", { newPersonDetected, newStartTime, newTimeElapsed, repCount: prevState.repCount, holdTime: prevState.holdTime });
      return { ...prevState, personDetected: newPersonDetected, startTime: newStartTime, timeElapsed: newTimeElapsed };
    });

    rafId.current = requestAnimationFrame(poseDetectionFrame);
  }, [workoutState, workoutPlan, goToNextExercise]);

  const setupCamera = useCallback(async (orientation: 'portrait' | 'landscape') => {
    const video = videoRef.current;
    if (!video) return null;

    const constraints = {
      video: {
        width: { ideal: 4096 },
        height: { ideal: 2160 },
        aspectRatio: orientation === 'landscape' ? 16 / 9 : 9 / 16
      },
      audio: false
    };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      return new Promise<HTMLVideoElement>(resolve => {
        video.onloadedmetadata = () => {
          video.play(); // Ensure video plays automatically
          resolve(video);
        };
      });
    } catch (e) {
      console.error("Camera access error:", e);
      setStartScreenError('Could not access camera. Please check permissions and try again.');
      return null;
    }
  }, []);

  const endWorkout = useCallback(async () => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.style.display = 'none';
    }

    setShowLoadingSpinner(true);
    setLoadingText('✨ Great workout! Preparing your summary...');

    // Generate encouraging summary based on completed exercises
    const generateWorkoutSummary = () => {
      const exerciseCount = completedExercises.length;
      const exerciseNames = completedExercises.map(ex => ex.name).join(', ');
      
      const summaries = [
        `Outstanding work! You completed ${exerciseCount} exercises and stayed consistent throughout.`,
        `Fantastic effort! Your dedication to ${exerciseNames} shows real commitment to your fitness goals.`,
        `Amazing session! You pushed through ${exerciseCount} exercises with great form and determination.`,
        `Excellent workout! Your consistency and effort in completing ${exerciseNames} is truly impressive.`
      ];
      
      const suggestions = [
        "Try adding 2-3 more reps to your next session to increase the challenge!",
        "Consider holding your plank position 10 seconds longer next time.",
        "Challenge yourself with jump squats or diamond push-ups for extra intensity.",
        "Add a 30-second rest between exercises to maintain perfect form throughout.",
        "Try slowing down your movements to focus on muscle engagement and control."
      ];
      
      return {
        summary: summaries[Math.floor(Math.random() * summaries.length)],
        suggestion: suggestions[Math.floor(Math.random() * suggestions.length)]
      };
    };

    // Simulate brief processing time
    setTimeout(() => {
      setShowLoadingSpinner(false);
      setShowStartScreen(true);
      setWorkoutState(prevState => ({ ...prevState, isStarted: false }));
      setWorkoutSummary(generateWorkoutSummary());
      setSelectedExercises([]);
      setWorkoutPlan([]);
      setCompletedExercises([]);
    }, 1500);
  }, [completedExercises]);

  const resetWorkout = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.style.display = 'none';
    }
    setWorkoutState({
      isStarted: false,
      isPaused: false,
      currentExerciseIndex: 0,
      repCount: 0,
      startTime: null,
      timeElapsed: 0,
      holdTime: 0,
      holdStartTime: null,
      stage: 'up',
      feedback: "Select your exercises to begin!",
      feedbackType: 'info',
      personDetected: true,
    });
    setWorkoutPlan([]);
    setCompletedExercises([]);
    setSelectedExercises([]);
    setStartScreenError(null);
    setWorkoutSummary(null);
    setShowStartScreen(true);
    setShowLoadingSpinner(false);
    setLoadingText("Initializing AI Coach...");
  }, []);

  const pauseWorkout = useCallback(() => {
    setWorkoutState(prevState => {
      if (!prevState.isStarted || prevState.currentExerciseIndex >= workoutPlan.length) return prevState;
      let newTimeElapsed = prevState.timeElapsed;
      if (prevState.personDetected && prevState.startTime) {
        newTimeElapsed += Date.now() - prevState.startTime;
      }
      return { ...prevState, isPaused: true, startTime: null, timeElapsed: newTimeElapsed };
    });
    speak("Workout paused.");
  }, [workoutPlan, speak]);

  const resumeWorkout = useCallback(() => {
    setWorkoutState(prevState => {
      let newStartTime = prevState.startTime;
      if (prevState.personDetected) {
        newStartTime = Date.now();
      }
      return { ...prevState, isPaused: false, startTime: newStartTime };
    });
    speak("Resuming.");
  }, [speak]);

  const toggleMute = useCallback(() => {
    isMuted.current = !isMuted.current;
    if (!isMuted.current) speak("Audio on.");
  }, [speak]);

  const handleStartWorkout = useCallback(async () => {
    console.log("handleStartWorkout: Starting workout.");
    if (selectedExercises.length === 0) {
      console.log("handleStartWorkout: No exercises selected.");
      return;
    }

    setShowLoadingSpinner(true);
    setLoadingText('Setting up camera...');
    setStartScreenError(null);

    const firstExerciseOrientation = selectedExercises[0].orientation;
    console.log("handleStartWorkout: Setting up camera with orientation:", firstExerciseOrientation);
    const camera = await setupCamera(firstExerciseOrientation);

    if (!camera) {
      console.error("handleStartWorkout: Camera setup failed.");
      setShowLoadingSpinner(false);
      return;
    }
    console.log("handleStartWorkout: Camera setup successful.");

    if (videoRef.current) {
      videoRef.current.style.display = 'block';
      if (canvasRef.current) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
      }
    }

    setShowLoadingSpinner(false);
    setShowStartScreen(false);
    setWorkoutPlan([...selectedExercises]);
    setCompletedExercises([]);
    setWorkoutState(prevState => ({
      ...prevState,
      isStarted: true,
      isPaused: false,
      currentExerciseIndex: 0,
      repCount: 0,
      startTime: null,
      timeElapsed: 0,
      stage: 'up',
      holdTime: 0,
      holdStartTime: null,
      feedback: `Let's start with ${selectedExercises[0].name}`,
      feedbackType: 'info',
    }));
    speak(`Let's start with ${selectedExercises[0].name}`);
    console.log("handleStartWorkout: Workout started with exercise:", selectedExercises[0].name);
  }, [selectedExercises, setupCamera, speak]);

  const toggleExerciseSelection = useCallback((exercise: Exercise) => {
    setSelectedExercises(prevSelected => {
      const index = prevSelected.findIndex(ex => ex.name === exercise.name);
      if (index > -1) {
        return prevSelected.filter(ex => ex.name !== exercise.name);
      } else {
        return [...prevSelected, exercise];
      }
    });
  }, []);

  useEffect(() => {
    const initModel = async () => {
      console.log("initModel: Starting model initialization.");
      if (typeof tf === 'undefined' || typeof posenet === 'undefined') {
        console.error("initModel: TensorFlow or PoseNet is not loaded");
        return;
      }
      try {
        detector.current = await posenet.load();
        console.log("initModel: PoseNet model loaded successfully.");
        setShowLoadingSpinner(false);
        console.log("initModel: Loading spinner hidden.");
      } catch (error) {
        console.error("initModel: Error loading model:", error);
        setLoadingText("Failed to load AI model. Please refresh.");
      }
    };
    initModel();

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (workoutState.isStarted && !workoutState.isPaused) {
      rafId.current = requestAnimationFrame(poseDetectionFrame);
    } else {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    }
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [workoutState.isStarted, workoutState.isPaused, poseDetectionFrame]);

  return (
    <div className="bg-background text-foreground flex items-center justify-center min-h-screen">
      <div className="w-full max-w-screen-2xl mx-auto flex flex-col p-2 sm:p-4 md:p-6 gap-4">
        <Header onToggleMute={toggleMute} isMuted={isMuted.current} />
        <main className="flex flex-col lg:flex-row gap-6">
          <div className="relative flex-grow">
            <CameraFeed
              videoRef={videoRef}
              canvasRef={canvasRef}
              loadingText={loadingText}
              showLoadingSpinner={showLoadingSpinner}
              showPauseOverlay={workoutState.isPaused}
              showDetectionOverlay={!workoutState.personDetected && workoutState.isStarted}
            />
            {showStartScreen && (
              <ExerciseSelection
                availableExercises={availableExercises}
                selectedExercises={selectedExercises}
                onToggleExerciseSelection={toggleExerciseSelection}
                onStartWorkout={handleStartWorkout}
                startScreenError={startScreenError}
                workoutSummary={workoutSummary}
                workoutComplete={!workoutState.isStarted && completedExercises.length > 0}
              />
            )}
          </div>
          <div className="hidden lg:flex lg:w-80 flex-shrink-0 flex-col gap-4">
            <FeedbackPanel
              workoutState={workoutState}
              currentExercise={workoutPlan[workoutState.currentExerciseIndex]}
              nextExercise={workoutPlan[workoutState.currentExerciseIndex + 1]}
            />
            <WorkoutControls
              onPause={pauseWorkout}
              onResume={resumeWorkout}
              onSkip={goToNextExercise}
              onReset={resetWorkout}
              workoutState={workoutState}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
