"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import WorkoutControls from '@/components/WorkoutControls';
import FeedbackPanel from '@/components/FeedbackPanel';
import CameraFeed from '@/components/CameraFeed';
import ExerciseSelection from '@/components/ExerciseSelection';
// Temporarily disabled pose detection for testing
// import * as tf from '@tensorflow/tfjs';
// import '@tensorflow/tfjs-backend-webgl';
// import * as posenet from '@tensorflow-models/posenet';

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

type NormalizedKeypoint = {
  name: string;
  x: number;
  y: number;
  score: number;
};

type KeypointDictionary = Record<string, any>;

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

const CONNECTED_KEYPOINTS: Array<[string, string]> = [
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftElbow'],
  ['rightShoulder', 'rightElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightElbow', 'rightWrist'],
  ['leftShoulder', 'leftHip'],
  ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],
  ['leftHip', 'leftKnee'],
  ['rightHip', 'rightKnee'],
  ['leftKnee', 'leftAnkle'],
  ['rightKnee', 'rightAnkle']
];

const KEYPOINT_SCORE_THRESHOLD = 0.35;
const MIN_CONFIDENT_KEYPOINTS = 8;
const POSE_CONFIDENCE_THRESHOLD = 0.45; // expressed 0-1 scale
const LOW_CONFIDENCE_FRAME_THRESHOLD = 5;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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

  const availableExercises: Exercise[] = [
    { name: "Squats", type: 'reps', target: 12, imageUrl: "https://images.pexels.com/photos/2261477/pexels-photo-2261477.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1", orientation: 'portrait' },
    { name: "Push-ups", type: 'reps', target: 10, imageUrl: "https://images.pexels.com/photos/4162484/pexels-photo-4162484.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1", orientation: 'landscape' },
    { name: "Bicep Curls", type: 'reps', target: 12, imageUrl: "https://images.pexels.com/photos/1431282/pexels-photo-1431282.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1", orientation: 'portrait' },
    { name: "Jumping Jacks", type: 'reps', target: 20, imageUrl: "https://images.pexels.com/photos/7031706/pexels-photo-7031706.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1", orientation: 'portrait' },
    { name: "Lunges", type: 'reps', target: 12, imageUrl: "https://images.pexels.com/photos/3112004/pexels-photo-3112004.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1", orientation: 'portrait' },
    { name: "Plank", type: 'time', target: 30, imageUrl: "https://images.pexels.com/photos/3076516/pexels-photo-3076516.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1", orientation: 'landscape' },
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

  const speak = useCallback((text: string) => {
    if (isMuted.current || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.2;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  const calculateAngle = (p1: any, p2: any, p3: any) => {
    const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
    const angle = Math.abs(radians * 180.0 / Math.PI);
    return angle > 180.0 ? 360 - angle : angle;
  };

  const convertKeypointsToDictionary = (keypoints: any[]): KeypointDictionary => {
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

  const normalizeKeypoints = (keypoints: any[], video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
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

  const drawKeypoints = (keypoints: any[], ctx: CanvasRenderingContext2D) => {
    keypoints.forEach(keypoint => {
      if (keypoint.score > 0.3) {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#06b6d4'; // cyan-500
        ctx.fill();
      }
    });
  };

  const drawSkeleton = (keypoints: any[], ctx: CanvasRenderingContext2D) => {
    const keypointMap: { [key: string]: number } = {
      'nose': 0, 'left_eye': 1, 'right_eye': 2, 'left_ear': 3, 'right_ear': 4,
      'left_shoulder': 5, 'right_shoulder': 6, 'left_elbow': 7, 'right_elbow': 8,
      'left_wrist': 9, 'right_wrist': 10, 'left_hip': 11, 'right_hip': 12,
      'left_knee': 13, 'right_knee': 14, 'left_ankle': 15, 'right_ankle': 16
    };

    const adjacentKeyPoints = [
      ['left_shoulder', 'right_shoulder'], ['left_shoulder', 'left_elbow'],
      ['right_shoulder', 'right_elbow'], ['left_elbow', 'left_wrist'],
      ['right_elbow', 'right_wrist'], ['left_shoulder', 'left_hip'],
      ['right_shoulder', 'right_hip'], ['left_hip', 'right_hip'],
      ['left_hip', 'left_knee'], ['right_hip', 'right_knee'],
      ['left_knee', 'left_ankle'], ['right_knee', 'right_ankle']
    ];

    adjacentKeyPoints.forEach(pair => {
      const kp1 = keypoints[keypointMap[pair[0]]];
      const kp2 = keypoints[keypointMap[pair[1]]];
      if (kp1 && kp2 && kp1.score > 0.3 && kp2.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(kp1.x, kp1.y);
        ctx.lineTo(kp2.x, kp2.y);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)'; // cyan-500 with alpha
        ctx.stroke();
      }
    });
  };

  const goToNextExercise = useCallback(() => {
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
  }, [completedExercises, speak]);

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

    let poses: any[] = [];
    // Temporarily disabled pose detection for testing
    // try {
    //   const pose = await detector.current.estimateSinglePose(video, {
    //     flipHorizontal: true
    //   });
    //   if (pose && pose.keypoints) {
    //     poses = [pose];
    //   }
    // } catch (error) {
    //   console.error('Error estimating poses:', error);
    // }

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

    const keypoints = poses[0].keypoints;
    
    // PoseNet already provides keypoints in image coordinates, just scale to canvas
    const scaleX = canvasRef.current!.width / video.videoWidth;
    const scaleY = canvasRef.current!.height / video.videoHeight;
    
    const normalizedKeypoints = keypoints.map((kp: any) => ({
      ...kp,
      x: kp.position.x * scaleX,
      y: kp.position.y * scaleY,
      score: kp.score
    }));
    
    // Draw pose visualization
    drawKeypoints(normalizedKeypoints, ctx);
    drawSkeleton(normalizedKeypoints, ctx);
    
    // Calculate simple confidence
    const validKeypoints = normalizedKeypoints.filter((kp: any) => kp.score > 0.3);
    const poseConfidence = validKeypoints.length > 8 ? 
      Math.round(validKeypoints.reduce((sum: number, kp: any) => sum + kp.score, 0) / validKeypoints.length * 100) : 0;
    
    lowConfidenceFrameCount.current = 0;

    // Simple exercise processing like the reference
    const keypointMap: { [key: string]: number } = {
      'nose': 0, 'left_eye': 1, 'right_eye': 2, 'left_ear': 3, 'right_ear': 4,
      'left_shoulder': 5, 'right_shoulder': 6, 'left_elbow': 7, 'right_elbow': 8,
      'left_wrist': 9, 'right_wrist': 10, 'left_hip': 11, 'right_hip': 12,
      'left_knee': 13, 'right_knee': 14, 'left_ankle': 15, 'right_ankle': 16
    };

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

      // Simple exercise processing
      let repCount = prevState.repCount;
      let stage = prevState.stage;
      let feedback = prevState.feedback;
      let feedbackType = prevState.feedbackType;
      let formScore = 80; // Default form score

      if (personDetected && currentExercise.name === 'Bicep Curls') {
        const leftElbow = normalizedKeypoints[keypointMap['left_elbow']];
        const leftShoulder = normalizedKeypoints[keypointMap['left_shoulder']];
        const leftWrist = normalizedKeypoints[keypointMap['left_wrist']];
        
        if (leftElbow && leftShoulder && leftWrist && 
            leftElbow.score > 0.3 && leftShoulder.score > 0.3 && leftWrist.score > 0.3) {
          const angle = calculateAngle(leftShoulder, leftElbow, leftWrist);
          
          if (angle > 160 && stage !== 'down') {
            stage = 'down';
          }
          if (angle < 30 && stage === 'down') {
            repCount++;
            stage = 'up';
            feedback = 'Great curl!';
            feedbackType = 'good';
          }
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

      // Check if exercise is complete
      if (personDetected && currentExercise.type === 'reps' && repCount >= currentExercise.target) {
        setTimeout(() => goToNextExercise(), 100);
      }

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
      "Challenge yourself with jump squats or diamond push-ups for extra intensity.",
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
  }, [completedExercises, resetPoseState]);

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

  const handleStartWorkout = useCallback(async () => {
    console.log("handleStartWorkout: Starting workout.");
    if (selectedExercises.length === 0) {
      console.log("handleStartWorkout: No exercises selected.");
      return;
    }

    setShowLoadingSpinner(true);
    setLoadingText('Setting up camera...');
    setStartScreenError(null);

    resetPoseState();

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
  }, [selectedExercises, setupCamera, speak, resetPoseState]);

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
      console.log("initModel: Skipping model initialization for testing.");
      // Temporarily disabled pose detection
      // if (typeof tf === 'undefined') {
      //   console.error("initModel: TensorFlow is not loaded");
      //   return;
      // }
      try {
        // detector.current = await posenet.load({
        //   architecture: 'MobileNetV1',
        //   outputStride: 16,
        //   inputResolution: { width: 640, height: 480 },
        //   multiplier: 0.75
        // });
        console.log("initModel: Model initialization skipped for testing.");
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
              poseConfidence={poseMetrics.poseConfidence}
              formScore={poseMetrics.formScore}
              lowConfidenceNotice={poseMetrics.lowConfidenceNotice}
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
