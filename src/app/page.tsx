"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import WorkoutControls from '@/components/WorkoutControls';
import FeedbackPanel from '@/components/FeedbackPanel';
import CameraFeed from '@/components/CameraFeed';
import ExerciseSelection from '@/components/ExerciseSelection';
import ExerciseMenu from '@/components/ExerciseMenu';
// Using TensorFlow.js and pose-detection from CDN (loaded in layout.tsx)
// This avoids all npm dependency conflicts

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

interface WorkoutState {
  isStarted: boolean;
  isPaused: boolean;
  currentExerciseIndex: number;
  repCount: number;
  startTime: number | null;
  timeElapsed: number;
  holdTime: number;
  holdStartTime: number | null;
  stage: 'up' | 'down' | 'neutral';
  feedback: string;
  feedbackType: 'info' | 'good' | 'warning';
  personDetected: boolean;
  poseConfidence: number;
  formScore: number;
  lowConfidenceNotice: boolean;
}

type KeypointDictionary = Record<string, {
  name: string;
  x: number;
  y: number;
  score: number;
}>;

const KEYPOINT_INDEX_NAMES = [
  'nose',
  'leftEye',
  'rightEye',
  'leftEar',
  'rightEar',
  'leftShoulder',
  'rightShoulder',
  'leftElbow',
  'rightElbow',
  'leftWrist',
  'rightWrist',
  'leftHip',
  'rightHip',
  'leftKnee',
  'rightKnee',
  'leftAnkle',
  'rightAnkle'
];

const KEYPOINT_NAME_NORMALIZATION: Record<string, string> = {
  nose: 'nose',
  left_eye: 'leftEye',
  leftEye: 'leftEye',
  right_eye: 'rightEye',
  rightEye: 'rightEye',
  left_ear: 'leftEar',
  leftEar: 'leftEar',
  right_ear: 'rightEar',
  rightEar: 'rightEar',
  left_shoulder: 'leftShoulder',
  leftShoulder: 'leftShoulder',
  right_shoulder: 'rightShoulder',
  rightShoulder: 'rightShoulder',
  left_elbow: 'leftElbow',
  leftElbow: 'leftElbow',
  right_elbow: 'rightElbow',
  rightElbow: 'rightElbow',
  left_wrist: 'leftWrist',
  leftWrist: 'leftWrist',
  right_wrist: 'rightWrist',
  rightWrist: 'rightWrist',
  left_hip: 'leftHip',
  leftHip: 'leftHip',
  right_hip: 'rightHip',
  rightHip: 'rightHip',
  left_knee: 'leftKnee',
  leftKnee: 'leftKnee',
  right_knee: 'rightKnee',
  rightKnee: 'rightKnee',
  left_ankle: 'leftAnkle',
  leftAnkle: 'leftAnkle',
  right_ankle: 'rightAnkle',
  rightAnkle: 'rightAnkle'
};

// Removed unused constants to fix linting warnings
const LOW_CONFIDENCE_FRAME_THRESHOLD = 5;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// Removed unused average function to fix linting warnings

// Enhanced drawing functions for beautiful pose visualization
const drawKeypoints = (keypoints: Array<{x: number; y: number; score: number}>, ctx: CanvasRenderingContext2D) => {
  // Mobile detection for larger keypoints
  const isMobile = typeof window !== 'undefined' && 
    (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
     window.innerWidth <= 768);
  
  keypoints.forEach((keypoint, index) => {
    if (keypoint.score > 0.3) {
      // Larger circles on mobile for better visibility
      const baseSize = isMobile ? 20 : 15;
      const size = clamp(keypoint.score * baseSize, isMobile ? 6 : 4, isMobile ? 16 : 12);
      const alpha = clamp(keypoint.score, 0.4, 1);
      
      // Create radial gradient for each keypoint
      const gradient = ctx.createRadialGradient(
        keypoint.x, keypoint.y, 0,
        keypoint.x, keypoint.y, size
      );
      
      // Beautiful gradient colors based on keypoint type
      if (index <= 4) { // Head keypoints (nose, eyes, ears)
        gradient.addColorStop(0, `rgba(255, 215, 0, ${alpha})`); // Gold center
        gradient.addColorStop(0.6, `rgba(56, 189, 248, ${alpha})`); // Cyan middle
        gradient.addColorStop(1, `rgba(14, 165, 233, ${alpha * 0.3})`); // Blue edge
      } else if (index >= 5 && index <= 10) { // Arms
        gradient.addColorStop(0, `rgba(34, 197, 94, ${alpha})`); // Green center
        gradient.addColorStop(0.6, `rgba(56, 189, 248, ${alpha})`); // Cyan middle
        gradient.addColorStop(1, `rgba(14, 165, 233, ${alpha * 0.3})`); // Blue edge
      } else { // Body and legs
        gradient.addColorStop(0, `rgba(168, 85, 247, ${alpha})`); // Purple center
        gradient.addColorStop(0.6, `rgba(56, 189, 248, ${alpha})`); // Cyan middle
        gradient.addColorStop(1, `rgba(14, 165, 233, ${alpha * 0.3})`); // Blue edge
      }
      
      // Draw outer glow (larger on mobile)
      ctx.beginPath();
      ctx.arc(keypoint.x, keypoint.y, size + (isMobile ? 4 : 2), 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(56, 189, 248, ${alpha * 0.2})`;
      ctx.fill();
      
      // Draw main keypoint with gradient
      ctx.beginPath();
      ctx.arc(keypoint.x, keypoint.y, size, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Add bright inner highlight
      ctx.beginPath();
      ctx.arc(keypoint.x, keypoint.y, size * 0.3, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
      ctx.fill();
      
      // Add white border for better visibility (like reference image)
      ctx.beginPath();
      ctx.arc(keypoint.x, keypoint.y, size, 0, 2 * Math.PI);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
      ctx.lineWidth = isMobile ? 2 : 1;
      ctx.stroke();
    }
  });
};

const drawSkeleton = (keypoints: Array<{x: number; y: number; score: number}>, ctx: CanvasRenderingContext2D) => {
  // Mobile detection for thicker lines
  const isMobile = typeof window !== 'undefined' && 
    (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
     window.innerWidth <= 768);
  
  const adjacentKeypoints = [
    { indices: [0, 1], type: 'head' }, { indices: [0, 2], type: 'head' }, 
    { indices: [1, 3], type: 'head' }, { indices: [2, 4], type: 'head' }, // head
    { indices: [5, 6], type: 'torso' }, // shoulders
    { indices: [5, 7], type: 'arm' }, { indices: [7, 9], type: 'arm' }, // left arm
    { indices: [6, 8], type: 'arm' }, { indices: [8, 10], type: 'arm' }, // right arm
    { indices: [5, 11], type: 'torso' }, { indices: [6, 12], type: 'torso' }, 
    { indices: [11, 12], type: 'torso' }, // torso
    { indices: [11, 13], type: 'leg' }, { indices: [13, 15], type: 'leg' }, // left leg
    { indices: [12, 14], type: 'leg' }, { indices: [14, 16], type: 'leg' } // right leg
  ];

  adjacentKeypoints.forEach(({ indices: [i, j], type }) => {
    const kp1 = keypoints[i];
    const kp2 = keypoints[j];
    if (kp1 && kp2 && kp1.score > 0.3 && kp2.score > 0.3) {
      const alpha = clamp((kp1.score + kp2.score) / 2, 0.4, 1);
      // Increase line thickness on mobile
      const baseWidth = isMobile ? 18 : 12; // 50% thicker on mobile
      const lineWidth = clamp(alpha * baseWidth, isMobile ? 9 : 6, baseWidth);
      
      // Create linear gradient for the line
      const gradient = ctx.createLinearGradient(kp1.x, kp1.y, kp2.x, kp2.y);
      
      // Different colors for different body parts
      switch (type) {
        case 'head':
          gradient.addColorStop(0, `rgba(255, 215, 0, ${alpha})`); // Gold
          gradient.addColorStop(1, `rgba(56, 189, 248, ${alpha})`); // Cyan
          break;
        case 'arm':
          gradient.addColorStop(0, `rgba(34, 197, 94, ${alpha})`); // Green
          gradient.addColorStop(0.5, `rgba(56, 189, 248, ${alpha})`); // Cyan
          gradient.addColorStop(1, `rgba(34, 197, 94, ${alpha})`); // Green
          break;
        case 'torso':
          gradient.addColorStop(0, `rgba(56, 189, 248, ${alpha})`); // Cyan
          gradient.addColorStop(1, `rgba(14, 165, 233, ${alpha})`); // Blue
          break;
        case 'leg':
          gradient.addColorStop(0, `rgba(168, 85, 247, ${alpha})`); // Purple
          gradient.addColorStop(0.5, `rgba(56, 189, 248, ${alpha})`); // Cyan
          gradient.addColorStop(1, `rgba(168, 85, 247, ${alpha})`); // Purple
          break;
      }
      
      // Draw shadow/glow effect
      ctx.beginPath();
      ctx.moveTo(kp1.x, kp1.y);
      ctx.lineTo(kp2.x, kp2.y);
      ctx.lineWidth = lineWidth + (isMobile ? 9 : 6); // Thicker glow on mobile
      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.3})`;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      // Draw main gradient line
      ctx.beginPath();
      ctx.moveTo(kp1.x, kp1.y);
      ctx.lineTo(kp2.x, kp2.y);
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = gradient;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      // Add bright inner line
      ctx.beginPath();
      ctx.moveTo(kp1.x, kp1.y);
      ctx.lineTo(kp2.x, kp2.y);
      ctx.lineWidth = Math.max(2, lineWidth * 0.4);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  });
};

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detector = useRef<any>(null);
  const rafId = useRef<number | null>(null);
  const isMuted = useRef<boolean>(false);

  const [workoutState, setWorkoutState] = useState<WorkoutState>({
    isStarted: false,
    isPaused: false,
    currentExerciseIndex: 0,
    repCount: 0,
    startTime: null,
    timeElapsed: 0,
    holdTime: 0,
    holdStartTime: null,
    stage: 'neutral',
    feedback: "Select your exercises to begin!",
    feedbackType: 'info',
    personDetected: true,
    poseConfidence: 0,
    formScore: 0,
    lowConfidenceNotice: false,
  });

  const [workoutPlan, setWorkoutPlan] = useState<Exercise[]>([]);
  const [completedExercises, setCompletedExercises] = useState<CompletedExercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [startScreenError, setStartScreenError] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState("Initializing AI Coach...");
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(true);
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [workoutSummary, setWorkoutSummary] = useState<{ summary: string; suggestion: string } | null>(null);
  const [poseMetrics, setPoseMetrics] = useState({ poseConfidence: 0, formScore: 0, lowConfidenceNotice: false });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentOrientation, setCurrentOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user'); // 'user' = front, 'environment' = back
  const [showExerciseMenu, setShowExerciseMenu] = useState(false);

  const availableExercises: Exercise[] = [
    { name: "Squats", type: 'reps', target: 12, imageUrl: "/squats.jpg", orientation: 'portrait' },
    { name: "Push-ups", type: 'reps', target: 10, imageUrl: "/push-ups.jpg", orientation: 'portrait' },
    { name: "Bicep Curls", type: 'reps', target: 12, imageUrl: "/bicep-curls.jpg", orientation: 'portrait' },
    { name: "Jumping Jacks", type: 'reps', target: 20, imageUrl: "/jumping-jacks.jpg", orientation: 'portrait' },
    { name: "Lunges", type: 'reps', target: 12, imageUrl: "/lunges.jpg", orientation: 'portrait' },
    { name: "Plank", type: 'time', target: 30, imageUrl: "/Plank.jpg", orientation: 'landscape' },
    // Additional bodyweight exercises
    { name: "Mountain Climbers", type: 'reps', target: 20, imageUrl: "/mountain-climbers.jpg", orientation: 'portrait' },
    { name: "Burpees", type: 'reps', target: 8, imageUrl: "/burpees.jpg", orientation: 'portrait' },
    { name: "High Knees", type: 'reps', target: 30, imageUrl: "/high-knees.jpg", orientation: 'portrait' },
  ];

  const poseConfidenceDeque = useRef<number[]>([]);
  const lowConfidenceFrameCount = useRef(0);
  const lastPoseTimestamp = useRef<number | null>(null);
  const workoutStateRef = useRef(workoutState);
  const workoutPlanRef = useRef(workoutPlan);

  useEffect(() => {
    workoutStateRef.current = workoutState;
  }, [workoutState]);

  useEffect(() => {
    workoutPlanRef.current = workoutPlan;
  }, [workoutPlan]);

  const resetPoseState = useCallback(() => {
    poseConfidenceDeque.current = [];
    lowConfidenceFrameCount.current = 0;
    lastPoseTimestamp.current = null;
    setPoseMetrics({ poseConfidence: 0, formScore: 0, lowConfidenceNotice: false });
  }, []);

  // Mobile device detection
  const isMobileDevice = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.innerWidth <= 768;
  }, []);

  const speak = useCallback((text: string) => {
    if (isMuted.current || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0; // Slower, more natural pace
    utterance.pitch = 1.2; // Slightly higher pitch for female voice
    
    // Try to get a female voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(voice => 
      voice.name.toLowerCase().includes('female') || 
      voice.name.toLowerCase().includes('woman') ||
      voice.name.toLowerCase().includes('zira') ||
      voice.name.toLowerCase().includes('hazel') ||
      voice.name.toLowerCase().includes('samantha')
    );
    
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  // Mobile fullscreen and orientation control
  const enterFullscreen = useCallback(async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (error) {
      console.log('Fullscreen not supported or failed:', error);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen && document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.log('Exit fullscreen failed:', error);
    }
  }, []);

  const setScreenOrientation = useCallback(async (orientation: 'portrait' | 'landscape') => {
    try {
      if ('screen' in window && 'orientation' in window.screen && 'lock' in window.screen.orientation) {
        if (orientation === 'landscape') {
          await (window.screen.orientation as any).lock('landscape-primary');
        } else {
          await (window.screen.orientation as any).lock('portrait-primary');
        }
        setCurrentOrientation(orientation);
        console.log(`Screen orientation set to: ${orientation}`);
      }
    } catch (error) {
      console.log('Screen orientation lock not supported or failed:', error);
      setCurrentOrientation(orientation);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const calculateAngle = (p1: {x: number; y: number}, p2: {x: number; y: number}, p3: {x: number; y: number}) => {
    const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
    const angle = Math.abs(radians * 180.0 / Math.PI);
    return angle > 180.0 ? 360 - angle : angle;
  };

  const convertKeypointsToDictionary = (keypoints: Array<{name?: string; x: number; y: number; score: number}>): KeypointDictionary => {
    const dictionary: KeypointDictionary = {};
    keypoints.forEach((keypoint, index) => {
      const key = KEYPOINT_NAME_NORMALIZATION[keypoint.name ?? KEYPOINT_INDEX_NAMES[index]];
      if (!key) return;
      dictionary[key] = {
        name: key,
        x: keypoint.x ?? 0,
        y: keypoint.y ?? 0,
        score: keypoint.score ?? 0,
      };
    });
    return dictionary;
  };

  const normalizeKeypoints = (keypoints: Array<{x: number; y: number; score: number}>, video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    const { videoWidth, videoHeight } = video;
    const { width, height } = canvas;
    const scaleX = width / videoWidth;
    const scaleY = height / videoHeight;
    return keypoints.map(keypoint => ({
      ...keypoint,
      x: (keypoint.x ?? 0) * scaleX,
      y: (keypoint.y ?? 0) * scaleY,
      position: {
        x: (keypoint.x ?? 0) * scaleX,
        y: (keypoint.y ?? 0) * scaleY,
      }
    }));
  };

  // Using the beautiful drawKeypoints function defined above

  // Using the beautiful drawSkeleton function defined above

  const goToNextExercise = useCallback(async () => {
    setWorkoutState(prevState => {
      const currentExercise = workoutPlanRef.current[prevState.currentExerciseIndex];
      const newCompletedExercises = [
        ...completedExercises,
        {
          name: currentExercise.name,
          type: currentExercise.type,
          completed: currentExercise.type === 'reps' ? prevState.repCount : prevState.holdTime
        }
      ];
      setCompletedExercises(newCompletedExercises);
      speak(`Great job on the ${currentExercise.name}.`);

      const nextIndex = prevState.currentExerciseIndex + 1;
      if (nextIndex >= workoutPlanRef.current.length) {
        return { ...prevState, isStarted: false, feedback: "Workout Complete!", feedbackType: 'info' };
      }

      const newExercise = workoutPlanRef.current[nextIndex];
      
      // Change orientation if needed for the new exercise
      if (newExercise.orientation !== currentExercise.orientation) {
        setScreenOrientation(newExercise.orientation);
        console.log(`Switching orientation to ${newExercise.orientation} for ${newExercise.name}`);
      }
      
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
        feedbackType: 'info'
      };
    });
  }, [completedExercises, speak, setScreenOrientation]);

  const exerciseProcessors = useRef<
    Record<string, (keypoints: KeypointDictionary, prevState: WorkoutState) => Partial<WorkoutState> | null>
  >({
    "Bicep Curls": (keypoints, prevState) => {
      const shoulder = keypoints.leftShoulder;
      const elbow = keypoints.leftElbow;
      const wrist = keypoints.leftWrist;
      if (!shoulder || !elbow || !wrist) return null;

      const curlAngle = calculateAngle(shoulder, elbow, wrist);
      let stage = prevState.stage;
      let repCount = prevState.repCount;
      if (curlAngle < 60 && stage !== 'up') {
        stage = 'up';
      }
      if (curlAngle > 150 && stage === 'up') {
        stage = 'down';
        repCount += 1;
      }
      const formScore = clamp(100 - Math.abs(110 - curlAngle), 0, 100);
      return {
        stage,
        repCount,
        formScore,
        feedback: formScore > 80 ? "Great curl!" : "Control the motion",
        feedbackType: formScore > 80 ? 'good' : 'warning'
      };
    },
    "Squats": (keypoints, prevState) => {
      const hip = keypoints.leftHip;
      const knee = keypoints.leftKnee;
      const ankle = keypoints.leftAnkle;
      if (!hip || !knee || !ankle) return null;
      const squatAngle = calculateAngle(hip, knee, ankle);
      let stage = prevState.stage;
      let repCount = prevState.repCount;
      if (squatAngle < 90 && stage !== 'down') {
        stage = 'down';
      }
      if (squatAngle > 165 && stage === 'down') {
        stage = 'up';
        repCount += 1;
      }
      const formScore = clamp(100 - Math.abs(100 - squatAngle), 0, 100);
      return {
        stage,
        repCount,
        formScore,
        feedback: formScore > 80 ? "Nice squat depth!" : "Lower a bit more",
        feedbackType: formScore > 80 ? 'good' : 'warning'
      };
    },
    "Push-ups": (keypoints) => {
      const shoulder = keypoints.leftShoulder;
      const hip = keypoints.leftHip;
      const ankle = keypoints.leftAnkle;
      if (!shoulder || !hip || !ankle) return null;
      const bodyLine = calculateAngle(shoulder, hip, ankle);
      const formScore = clamp(100 - Math.abs(170 - bodyLine), 0, 100);
      return {
        formScore,
        feedback: formScore > 80 ? "Strong plank line!" : "Keep your core tight",
        feedbackType: formScore > 80 ? 'good' : 'warning'
      };
    },
    "Jumping Jacks": (keypoints, prevState) => {
      const wrist = keypoints.leftWrist;
      const ankle = keypoints.leftAnkle;
      if (!wrist || !ankle) return null;
      const distance = Math.abs(wrist.y - ankle.y);
      let stage = prevState.stage;
      let repCount = prevState.repCount;
      if (distance < 140 && stage !== 'up') {
        stage = 'up';
      }
      if (distance > 220 && stage === 'up') {
        stage = 'down';
        repCount += 1;
      }
      const formScore = clamp((distance / 240) * 100, 0, 100);
      return {
        stage,
        repCount,
        formScore,
        feedback: formScore > 70 ? "Explosive!" : "Reach higher",
        feedbackType: formScore > 70 ? 'good' : 'warning'
      };
    },
    "Lunges": (keypoints, prevState) => {
      const hip = keypoints.leftHip;
      const knee = keypoints.leftKnee;
      const ankle = keypoints.leftAnkle;
      if (!hip || !knee || !ankle) return null;
      const kneeAngle = calculateAngle(hip, knee, ankle);
      let stage = prevState.stage;
      let repCount = prevState.repCount;
      if (kneeAngle < 110 && stage !== 'down') {
        stage = 'down';
      }
      if (kneeAngle > 165 && stage === 'down') {
        stage = 'up';
        repCount += 1;
      }
      const formScore = clamp(100 - Math.abs(100 - kneeAngle), 0, 100);
      return {
        stage,
        repCount,
        formScore,
        feedback: formScore > 80 ? "Great lunge!" : "Lower front knee",
        feedbackType: formScore > 80 ? 'good' : 'warning'
      };
    },
    "Plank": (keypoints, prevState) => {
      const shoulder = keypoints.leftShoulder;
      const hip = keypoints.leftHip;
      const ankle = keypoints.leftAnkle;
      if (!shoulder || !hip || !ankle) return null;
      const bodyAngle = calculateAngle(shoulder, hip, ankle);
      const formScore = clamp(100 - Math.abs(180 - bodyAngle), 0, 100);
          const now = Date.now();
      let holdStartTime = prevState.holdStartTime;
      let nextHoldTime = prevState.holdTime;
      if (formScore > 80) {
        if (holdStartTime !== null) {
          nextHoldTime += (now - holdStartTime) / 1000;
        }
        holdStartTime = now;
        return {
          holdStartTime,
          holdTime: nextHoldTime,
          formScore,
          feedback: "Hold it steady!",
          feedbackType: 'good'
        };
      }
      return {
        holdStartTime: null,
        formScore,
        feedback: "Keep your back flat",
        feedbackType: 'warning'
      };
    }
  });

  const poseDetectionFrame = useCallback(async () => {
    if (!detector.current || !videoRef.current || !canvasRef.current) {
      rafId.current = requestAnimationFrame(poseDetectionFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      rafId.current = requestAnimationFrame(poseDetectionFrame);
      return;
    }

    const stateSnapshot = workoutStateRef.current;
    if (!stateSnapshot.isStarted || stateSnapshot.isPaused) {
      rafId.current = requestAnimationFrame(poseDetectionFrame);
      return;
    }

    const planSnapshot = workoutPlanRef.current;
    const currentExercise = planSnapshot[stateSnapshot.currentExerciseIndex];
    if (!currentExercise) {
      rafId.current = requestAnimationFrame(poseDetectionFrame);
      return;
    }

    // Real pose detection using CDN-loaded libraries
    let poses: Array<{keypoints: Array<{x: number; y: number; score: number}>}> = [];
    try {
      if (detector.current) {
        poses = await detector.current.estimatePoses(video);
      }
    } catch (error) {
      console.error('Error estimating poses:', error);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const personWasDetected = workoutStateRef.current.personDetected;
    const personDetected = poses && poses.length > 0;

    if (!personDetected) {
      lowConfidenceFrameCount.current += 1;
      if (lowConfidenceFrameCount.current >= LOW_CONFIDENCE_FRAME_THRESHOLD) {
        setWorkoutState(prev => ({
          ...prev,
          personDetected: false,
          poseConfidence: 0,
          lowConfidenceNotice: true,
          feedback: 'Step into frame so I can see you.',
          feedbackType: 'warning'
        }));
      }
      rafId.current = requestAnimationFrame(poseDetectionFrame);
      return;
    }

    // Process real pose data
    const pose = poses[0];
    const keypoints = pose.keypoints || [];
    
    // Calculate pose confidence from keypoints
    const validKeypoints = keypoints.filter((kp) => kp.score > 0.3);
    const poseConfidence = validKeypoints.length > 8 ? 
      Math.round(validKeypoints.reduce((sum: number, kp) => sum + kp.score, 0) / validKeypoints.length * 100) : 0;
    
    // Draw pose visualization
        drawKeypoints(keypoints, ctx);
        drawSkeleton(keypoints, ctx);

    lowConfidenceFrameCount.current = 0;

    setWorkoutState(prevState => {
      const timeNow = Date.now();
      let startTime = prevState.startTime;
      let timeElapsed = prevState.timeElapsed;

      if (personDetected) {
        if (!personWasDetected) {
          startTime = timeNow;
        } else if (prevState.startTime) {
          timeElapsed += timeNow - prevState.startTime;
          startTime = timeNow;
        }
      } else {
        if (personWasDetected && prevState.startTime) {
          timeElapsed += timeNow - prevState.startTime;
        }
        startTime = null;
      }

      // Real exercise processing using pose keypoints
      let repCount = prevState.repCount;
      let stage = prevState.stage;
      let feedback = prevState.feedback;
      let feedbackType = prevState.feedbackType;
      let formScore = 75; // Default form score

      // Process exercises based on keypoints
      if (personDetected && keypoints.length >= 17) {
        if (currentExercise.name === 'Bicep Curls') {
          const leftElbow = keypoints[7]; // Left elbow
          const leftShoulder = keypoints[5]; // Left shoulder  
          const leftWrist = keypoints[9]; // Left wrist
          
          if (leftElbow && leftShoulder && leftWrist && 
              leftElbow.score > 0.3 && leftShoulder.score > 0.3 && leftWrist.score > 0.3) {
            
            const angle = calculateAngle(leftShoulder, leftElbow, leftWrist);
            
            // Form score based on angle quality
            if (angle > 140 && angle < 180) {
              formScore = 95; // Excellent extension
            } else if (angle > 120) {
              formScore = 85; // Good extension
            } else if (angle < 40) {
              formScore = 90; // Good curl
            } else {
              formScore = 70; // Moderate form
            }
            
            // Rep counting logic
            if (angle > 160 && stage !== 'down') {
              stage = 'down';
              feedback = 'Good extension!';
              feedbackType = 'info';
            }
            if (angle < 40 && stage === 'down') {
              repCount++;
              stage = 'up';
              feedback = `Great curl! Rep ${repCount}`;
              feedbackType = 'good';
            }
          }
        } else if (currentExercise.name === 'Push-ups') {
          // Improved push-up detection using shoulder-to-wrist angle
          const leftShoulder = keypoints[5];
          const rightShoulder = keypoints[6];
          const leftElbow = keypoints[7];
          const rightElbow = keypoints[8];
          const leftWrist = keypoints[9];
          const rightWrist = keypoints[10];
          
          if (leftShoulder && leftElbow && leftWrist &&
              leftShoulder.score > 0.3 && leftElbow.score > 0.3 && leftWrist.score > 0.3) {
            
            // Calculate elbow angle for better push-up detection
            const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
            
            // Form score based on elbow angle
            if (leftElbowAngle > 160) {
              formScore = 95; // Fully extended
            } else if (leftElbowAngle > 140) {
              formScore = 85; // Good extension
            } else if (leftElbowAngle < 90) {
              formScore = 90; // Good descent
            } else {
              formScore = 75; // Moderate form
            }
            
            // Rep counting logic based on elbow angle
            if (leftElbowAngle > 160 && stage !== 'up') {
              stage = 'up';
              feedback = 'Arms extended!';
              feedbackType = 'info';
            }
            if (leftElbowAngle < 90 && stage === 'up') {
              repCount++;
              stage = 'down';
              feedback = `Perfect push-up! Rep ${repCount}`;
              feedbackType = 'good';
            }
          }
        } else if (currentExercise.name === 'Jumping Jacks') {
          // Jumping Jacks detection using arm and leg positions
          const leftWrist = keypoints[9];
          const rightWrist = keypoints[10];
          const leftAnkle = keypoints[15];
          const rightAnkle = keypoints[16];
          const nose = keypoints[0];
          
          if (leftWrist && rightWrist && leftAnkle && rightAnkle && nose &&
              leftWrist.score > 0.3 && rightWrist.score > 0.3 && 
              leftAnkle.score > 0.3 && rightAnkle.score > 0.3 && nose.score > 0.3) {
            
            // Calculate arm spread (wrists distance from center)
            const armSpread = Math.abs(leftWrist.x - rightWrist.x);
            // Calculate leg spread (ankles distance from center)
            const legSpread = Math.abs(leftAnkle.x - rightAnkle.x);
            // Calculate arm height (average wrist height relative to nose)
            const avgWristY = (leftWrist.y + rightWrist.y) / 2;
            const armHeight = nose.y - avgWristY; // Positive when arms are up
            
            // Form score based on coordination
            const spreadScore = Math.min(armSpread / 200, 1) * 50 + Math.min(legSpread / 150, 1) * 50;
            formScore = Math.round(Math.max(spreadScore, 60));
            
            // Rep counting: arms up + legs apart = "up" position
            const isJumpingPosition = armHeight > 50 && armSpread > 100 && legSpread > 80;
            const isRestPosition = armHeight < 20 && armSpread < 60 && legSpread < 40;
            
            if (isJumpingPosition && stage !== 'up') {
              stage = 'up';
              feedback = 'Jump up!';
              feedbackType = 'info';
            }
            if (isRestPosition && stage === 'up') {
              repCount++;
              stage = 'down';
              feedback = `Great jump! Rep ${repCount}`;
              feedbackType = 'good';
            }
          }
        } else if (currentExercise.name === 'Squats') {
          // Squats detection using hip and knee angles
          const leftHip = keypoints[11];
          const leftKnee = keypoints[13];
          const leftAnkle = keypoints[15];
          const leftShoulder = keypoints[5];
          
          if (leftHip && leftKnee && leftAnkle && leftShoulder &&
              leftHip.score > 0.3 && leftKnee.score > 0.3 && 
              leftAnkle.score > 0.3 && leftShoulder.score > 0.3) {
            
            // Calculate knee angle for squat depth
            const kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
            // Calculate hip height for movement detection
            const hipHeight = leftShoulder.y - leftHip.y;
            
            // Form score based on squat depth and posture
            if (kneeAngle < 90) {
              formScore = 95; // Deep squat
            } else if (kneeAngle < 120) {
              formScore = 85; // Good depth
            } else if (kneeAngle < 150) {
              formScore = 75; // Moderate depth
            } else {
              formScore = 65; // Shallow squat
            }
            
            // Rep counting based on knee angle and hip movement
            if (kneeAngle > 160 && stage !== 'up') {
              stage = 'up';
              feedback = 'Standing tall!';
              feedbackType = 'info';
            }
            if (kneeAngle < 120 && stage === 'up') {
              repCount++;
              stage = 'down';
              feedback = `Excellent squat! Rep ${repCount}`;
              feedbackType = 'good';
            }
          }
        } else {
          // For other exercises, use time-based or basic progression
          formScore = 80;
          feedback = `Keep going with ${currentExercise.name}!`;
          feedbackType = 'info';
        }
      }

      const nextState: WorkoutState = {
        ...prevState,
        personDetected,
        poseConfidence,
        formScore,
        lowConfidenceNotice: false,
        startTime,
        timeElapsed,
        repCount,
        stage,
        feedback,
        feedbackType,
      };

      // Let user control workout progression - no auto-advance
      // User can manually skip when they want to move to next exercise

      setPoseMetrics({
        poseConfidence,
        formScore,
        lowConfidenceNotice: false
      });

      return nextState;
    });

    rafId.current = requestAnimationFrame(poseDetectionFrame);
  }, [goToNextExercise]);

  const setupCamera = useCallback(async (orientation: 'portrait' | 'landscape') => {
    const video = videoRef.current;
    if (!video) return null;

    const constraints = {
      video: {
        width: { ideal: 4096 },
        height: { ideal: 2160 },
        aspectRatio: orientation === 'landscape' ? 16 / 9 : 9 / 16,
        facingMode: cameraFacing
      },
      audio: false
    };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      
      // Apply horizontal flip for front camera on mobile to show correct orientation
      if (isMobileDevice() && cameraFacing === 'user') {
        video.style.transform = 'scaleX(-1)';
        if (canvasRef.current) {
          canvasRef.current.style.transform = 'scaleX(-1)';
        }
      } else {
        video.style.transform = 'none';
        if (canvasRef.current) {
          canvasRef.current.style.transform = 'none';
        }
      }
      
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
  }, [cameraFacing]);

  const endWorkout = useCallback(async () => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.style.display = 'none';
    }

    // Exit fullscreen mode only if we're on mobile
    if (isMobileDevice()) {
      await exitFullscreen();
    }

    resetPoseState();
    setShowLoadingSpinner(true);
    setLoadingText('✨ Great workout! Preparing your summary...');

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
      "Challenge yourself with jump squets or diamond push-ups for extra intensity.",
      "Add a 30-second rest between exercises to maintain perfect form throughout.",
      "Try slowing down your movements to focus on muscle engagement and control."
    ];

    setTimeout(() => {
    setShowLoadingSpinner(false);
    setShowStartScreen(true);
    setWorkoutState(prevState => ({ ...prevState, isStarted: false }));
      setWorkoutSummary({
        summary: summaries[Math.floor(Math.random() * summaries.length)],
        suggestion: suggestions[Math.floor(Math.random() * suggestions.length)]
      });
    setSelectedExercises([]);
    setWorkoutPlan([]);
    setCompletedExercises([]);
    }, 1500);
  }, [completedExercises, resetPoseState, exitFullscreen]);

  const resetWorkout = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.style.display = 'none';
    }
    resetPoseState();
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
      poseConfidence: 0,
      formScore: 0,
      lowConfidenceNotice: false,
    });
    setWorkoutPlan([]);
    setCompletedExercises([]);
    setSelectedExercises([]);
    setStartScreenError(null);
    setWorkoutSummary(null);
    setShowStartScreen(true);
    setShowLoadingSpinner(false);
    setLoadingText("Initializing AI Coach...");
  }, [resetPoseState]);

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
    const now = Date.now();
    setWorkoutState(prevState => ({
      ...prevState,
      isPaused: false,
      startTime: prevState.personDetected ? now : prevState.startTime
    }));
    speak("Resuming.");
  }, [speak]);

  const toggleMute = useCallback(() => {
    isMuted.current = !isMuted.current;
    if (!isMuted.current) speak("Audio on.");
  }, [speak]);


  const toggleCamera = useCallback(async () => {
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(newFacing);
    
    // If workout is active, restart the camera with new facing mode
    if (workoutState.isStarted && videoRef.current) {
      // Stop current stream
      if (videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
      
      // Setup camera with new facing mode
      const currentExercise = workoutPlan[workoutState.currentExerciseIndex];
      if (currentExercise) {
        await setupCamera(currentExercise.orientation);
      }
    } else {
      // Apply transform immediately if not in workout
      if (videoRef.current && canvasRef.current) {
        if (isMobileDevice() && newFacing === 'user') {
          videoRef.current.style.transform = 'scaleX(-1)';
          canvasRef.current.style.transform = 'scaleX(-1)';
        } else {
          videoRef.current.style.transform = 'none';
          canvasRef.current.style.transform = 'none';
        }
      }
    }
  }, [cameraFacing, workoutState.isStarted, workoutState.currentExerciseIndex, workoutPlan, setupCamera, isMobileDevice]);

  const handleStartWorkout = useCallback(async () => {
    console.log("handleStartWorkout: Starting workout.");
    if (selectedExercises.length === 0) {
      console.log("handleStartWorkout: No exercises selected.");
      return;
    }

    setShowLoadingSpinner(true);
    const isMobile = isMobileDevice();
    
    if (isMobile) {
      setLoadingText('Entering fullscreen mode...');
      setStartScreenError(null);
      // Enter fullscreen mode only on mobile
      await enterFullscreen();
    } else {
    setLoadingText('Setting up camera...');
    setStartScreenError(null);
    }

    setLoadingText('Setting up camera and orientation...');
    resetPoseState();

    const firstExerciseOrientation = selectedExercises[0].orientation;
    console.log("handleStartWorkout: Setting up camera with orientation:", firstExerciseOrientation);
    
    // Set screen orientation based on exercise
    await setScreenOrientation(firstExerciseOrientation);
    
    const camera = await setupCamera(firstExerciseOrientation);

    if (!camera) {
      console.error("handleStartWorkout: Camera setup failed.");
      setShowLoadingSpinner(false);
      await exitFullscreen(); // Exit fullscreen if camera fails
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
  }, [selectedExercises, setupCamera, speak, resetPoseState, enterFullscreen, exitFullscreen, setScreenOrientation]);

  const toggleExerciseSelection = useCallback((exercise: Exercise) => {
    const isMobile = isMobileDevice();
    
    if (isMobile) {
      // On mobile, selecting a card starts the workout immediately
      setSelectedExercises([exercise]);
      // Start workout immediately
      setTimeout(() => {
        handleStartWorkout();
      }, 100); // Small delay to allow state update
    } else {
      // On desktop, use the old toggle behavior
    setSelectedExercises(prevSelected => {
      const index = prevSelected.findIndex(ex => ex.name === exercise.name);
      if (index > -1) {
        return prevSelected.filter(ex => ex.name !== exercise.name);
      } else {
        return [...prevSelected, exercise];
      }
    });
    }
  }, [isMobileDevice, handleStartWorkout]);

  const handleMenuClick = useCallback(() => {
    setShowExerciseMenu(true);
  }, []);

  const handleMenuClose = useCallback(() => {
    setShowExerciseMenu(false);
  }, []);

  const handleMenuExerciseSelect = useCallback((exercise: Exercise) => {
    setSelectedExercises([exercise]);
    setShowExerciseMenu(false);
    // Start workout immediately after selection
    setTimeout(() => {
      handleStartWorkout();
    }, 100);
  }, [handleStartWorkout]);

  useEffect(() => {
    const initModel = async () => {
      console.log("initModel: Starting pose detection model initialization.");
      
      // Enhanced script loading with better error handling
      let attempts = 0;
      const maxAttempts = 100; // Increased attempts
      
      while (attempts < maxAttempts) {
        if (typeof window !== 'undefined') {
          // Check if scripts are loaded and ready
          const tfReady = (window as any).tf && typeof (window as any).tf.ready === 'function';
          const poseDetectionReady = (window as any).poseDetection && (window as any).poseDetection.SupportedModels;
          
          if (tfReady && poseDetectionReady) {
            try {
              // Wait for TensorFlow to be fully ready
              await (window as any).tf.ready();
              console.log("initModel: TensorFlow.js is ready");
              break;
            } catch (error) {
              console.warn("initModel: TensorFlow ready failed, retrying...", error);
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 200)); // Longer wait between checks
        attempts++;
        
        // Update loading text with progress
        if (attempts % 10 === 0) {
          setLoadingText(`Loading AI model... (${Math.round(attempts/maxAttempts*100)}%)`);
        }
      }
      
      if (!(window as any).tf || !(window as any).poseDetection) {
        console.error("initModel: TensorFlow.js or pose-detection not loaded from CDN after", maxAttempts, "attempts");
        setLoadingText("Failed to load AI model. Please refresh the page.");
        return;
      }
      
      try {
        setLoadingText("Creating pose detector...");
        
        const detectorConfig = {
          modelType: (window as any).poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true
        };
        
        detector.current = await (window as any).poseDetection.createDetector(
          (window as any).poseDetection.SupportedModels.MoveNet, 
          detectorConfig
        );
        
        console.log("initModel: MoveNet model loaded successfully from CDN.");
        setLoadingText("AI Coach ready!");
        
        // Small delay to show success message
        setTimeout(() => {
        setShowLoadingSpinner(false);
        console.log("initModel: Loading spinner hidden.");
        }, 500);
        
      } catch (error) {
        console.error("initModel: Error creating detector:", error);
        setLoadingText("Failed to initialize AI model. Please refresh.");
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

  const isMobile = isMobileDevice();

  return (
    <div className={`bg-background text-foreground ${
      isFullscreen && workoutState.isStarted && isMobile
        ? 'fixed inset-0 z-50 overflow-hidden' 
        : 'h-screen flex flex-col overflow-hidden'
    }`}>
      <div className={`w-full ${
        isFullscreen && workoutState.isStarted && isMobile
          ? 'h-full flex flex-col' 
          : 'max-w-screen-2xl mx-auto flex flex-col flex-1 p-2 sm:p-4 md:p-6 gap-4'
      }`}>
        {/* Header - hidden in fullscreen workout mode on mobile only */}
        <div className={`${
          isFullscreen && workoutState.isStarted && isMobile
            ? 'hidden sm:block absolute top-2 left-2 right-2 z-10' 
            : ''
        }`}>
        <Header 
          onToggleMute={toggleMute} 
          isMuted={isMuted.current}
          onToggleCamera={toggleCamera}
          showCameraToggle={isMobile && workoutState.isStarted}
          onMenuClick={handleMenuClick}
        />
        </div>

        <main className={`${
          isFullscreen && workoutState.isStarted && isMobile
            ? 'flex-1 flex flex-col relative' 
            : isMobile && !workoutState.isStarted
            ? 'flex-1 flex flex-col overflow-hidden' // Full width on mobile when showing exercise cards
            : 'flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden'
        }`}>
          {/* Camera Feed and Exercise Selection */}
          <div className={`relative ${
            isFullscreen && workoutState.isStarted && isMobile
              ? 'flex-1 w-full h-full' 
              : 'flex-1 min-h-0'
          }`}>
            <CameraFeed
              videoRef={videoRef}
              canvasRef={canvasRef}
              loadingText={loadingText}
              showLoadingSpinner={showLoadingSpinner}
              showPauseOverlay={workoutState.isPaused}
              showDetectionOverlay={!workoutState.personDetected && workoutState.isStarted}
              poseConfidence={poseMetrics.poseConfidence}
              formScore={poseMetrics.formScore}
              lowConfidenceNotice={poseMetrics.lowConfidenceNotice}
              timeElapsed={workoutState.timeElapsed}
              repCount={workoutState.repCount}
              exerciseName={workoutPlan[workoutState.currentExerciseIndex]?.name}
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

          {/* Mobile Controls Section - Below Camera on Mobile (No Stats) */}
          {isMobile && workoutState.isStarted && isFullscreen && (
            <div className="bg-background/95 backdrop-blur-sm border-t border-border p-4">
              {/* Exercise Info */}
              <div className="text-center mb-4">
                <div className="text-lg font-semibold text-foreground">
                  {workoutPlan[workoutState.currentExerciseIndex]?.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {workoutState.currentExerciseIndex + 1} of {workoutPlan.length}
                </div>
              </div>
              
              {/* Mobile Controls */}
              <div className="flex justify-center gap-3">
                <button
                  onClick={workoutState.isPaused ? resumeWorkout : pauseWorkout}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full font-medium"
                >
                  {workoutState.isPaused ? '▶️' : '⏸️'}
                  <span>{workoutState.isPaused ? 'Resume' : 'Pause'}</span>
                </button>
                <button
                  onClick={goToNextExercise}
                  className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-full font-medium"
                >
                  ⏭️ <span>Skip</span>
                </button>
                <button
                  onClick={resetWorkout}
                  className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-full font-medium"
                >
                  🔄 <span>Reset</span>
                </button>
              </div>
            </div>
          )}

          {/* Feedback Panel and Controls */}
          <div className={`${
            isFullscreen && workoutState.isStarted && isMobile
              ? 'hidden' 
              : isMobile && !workoutState.isStarted
              ? 'hidden' // Hide on mobile when not in workout to show full exercise cards
              : 'flex lg:w-80 flex-shrink-0 flex-col gap-4 min-h-0'
          }`}>

            {/* Desktop feedback panel and controls */}
            <div className={`${
              isFullscreen && isMobile ? 'hidden' : 'flex flex-col gap-4'
            }`}>
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
          </div>
        </main>
      </div>

      {/* Exercise Menu */}
      <ExerciseMenu
        isOpen={showExerciseMenu}
        onClose={handleMenuClose}
        exercises={availableExercises}
        onExerciseSelect={handleMenuExerciseSelect}
      />
    </div>
  );
}
