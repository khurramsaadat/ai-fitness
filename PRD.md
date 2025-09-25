# AI Fitness Coach - Product Requirements Document

**Version:** 1.0
**Date:** September 25, 2025

## 1. Introduction & Vision

The AI Fitness Coach is a client-side web application designed to provide users with an interactive and personalized fitness training experience directly through their web browser. Leveraging real-time pose detection via the device's camera and advanced machine learning models (TensorFlow.js MoveNet), the application guides users through exercises, automatically counts repetitions or tracks hold times, and offers instant feedback on form. The vision is to democratize access to effective fitness coaching, making it affordable, convenient, and engaging for individuals worldwide, all without requiring external servers for core processing or data storage.

## 2. Target Audience

*   **Home Fitness Enthusiasts:** Individuals who prefer working out at home and seek structured guidance and motivation.
*   **Beginners:** Newcomers to fitness who require assistance with proper exercise form to prevent injuries and maximize workout effectiveness.
*   **Budget-Conscious Individuals:** Users looking for the benefits of a personal trainer without the associated high costs.
*   **Tech-Savvy Users:** Individuals interested in utilizing cutting-edge technology to enhance their health and fitness routines.

## 3. Core Features (Functional Requirements)

### 3.1. Real-Time Pose Detection & Visualization

*   **FR-3.1.1: Camera Access:** Upon user initiation, the application requests access to the device's webcam feed.
*   **FR-3.1.2: Pose Estimation:** Utilizes TensorFlow.js with the MoveNet model (`SINGLEPOSE_LIGHTNING`) to detect human body keypoints in real-time from the video stream.
*   **FR-3.1.3: Skeletal Overlay:** Draws a visual representation of the detected skeleton onto the video feed, overlaying the user's body to confirm tracking.
*   **FR-3.1.4: Dynamic Camera Orientation:** Intelligently suggests or configures the camera feed orientation (portrait/landscape) based on the requirements of the first exercise selected for the workout.

### 3.2. Workout Customization & Execution

*   **FR-3.2.1: Exercise Selection:** Users can select multiple exercises from a predefined list (Squats, Push-ups, Bicep Curls, Jumping Jacks, Lunges, Plank) to create a custom workout plan.
*   **FR-3.2.2: Sequential Guidance:** The application guides the user through the selected exercises in the order they are chosen.
*   **FR-3.2.3: Clear Exercise Display:** Displays the name of the current exercise and previews the next exercise in the sequence.
*   **FR-3.2.4: Exercise Type Support:** Supports both repetition-based (e.g., Squats, Push-ups) and time-based (e.g., Plank) exercises.

### 3.3. Automated Progress Tracking & Form Feedback

*   **FR-3.3.1: Repetition Counting:** Automatically counts valid repetitions for rep-based exercises by analyzing the user's full range of motion and key joint movements.
*   **FR-3.3.2: Time-Based Tracking:** Tracks cumulative hold time for time-based exercises while the user maintains correct form.
*   **FR-3.3.3: Real-time Metrics Display:** Prominently displays the current rep count or remaining hold time for the active exercise.
*   **FR-3.3.4: Real-time Feedback:** Provides immediate verbal (text-to-speech) and visual feedback on form (e.g., "Good rep!", "Straighten your back!"). Feedback is categorized as 'good', 'warning', or 'info'.
*   **FR-3.3.5: No Person Detection Handling:** If no person is detected, an unobtrusive overlay appears on the video feed, and the feedback panel displays an image of the correct exercise form, along with a relevant message.

### 3.4. Gemini AI-Powered Intelligence

*   **FR-3.4.1: Exercise Form Tips:** Users can request detailed tips on performing the current exercise. This triggers a call to the Gemini API to fetch and display concise advice.
*   **FR-3.4.2: Personalized Workout Summary:** Upon workout completion, the Gemini API generates a personalized, encouraging summary of the user's performance.
*   **FR-3.4.3: Suggested Variations:** The post-workout summary includes a suggestion for a challenging variation or a new exercise to try in future sessions.

### 3.5. Workout Controls & Session Management

*   **FR-3.5.1: Pause/Resume:** Users can pause the workout, preserving elapsed time, and resume it later.
*   **FR-3.5.2: Skip Exercise:** Allows users to skip the current exercise and move to the next one in the queue.
*   **FR-3.5.3: Mute/Unmute Audio:** A toggle button to enable or disable verbal feedback and prompts.
*   **FR-3.5.4: Reset Workout:** Immediately ends the current session, releases the camera, and returns the user to the exercise selection screen.

### 3.6. Workout History

*   **FR-3.6.1: Local Storage Persistence:** Completed workout sessions (including date, duration, and exercises performed) are saved locally in the browser's `localStorage`.
*   **FR-3.6.2: History Modal:** An accessible "Workout History" modal allows users to review their past sessions.

### 3.7. Advanced Form Analysis & Feedback

*   **FR-3.7.1: Nuanced Form Correction:** Provide more detailed feedback beyond basic rep counting, analyzing movement patterns, joint angles, and common form errors for specific exercises.
*   **FR-3.7.2: Real-time Form Scoring:** Implement a scoring system that rates the quality of each repetition or hold, offering immediate actionable advice for improvement.

### 3.8. Adaptive Workout Difficulty

*   **FR-3.8.1: Performance-Based Adjustments:** Automatically adjust exercise targets (reps, hold times) based on the user's performance history and consistency.
*   **FR-3.8.2: Progressive Overload Suggestions:** Recommend increasing difficulty or suggest more challenging exercise variations when the user consistently meets targets.

### 3.9. Personalized AI Coaching & Recommendations

*   **FR-3.9.1: Goal-Oriented Workout Plans:** Allow users to set fitness goals (e.g., strength, endurance, flexibility) and receive AI-generated workout plans tailored to those goals.
*   **FR-3.9.2: Proactive AI Insights:** Utilize AI to analyze workout data and provide personalized insights, motivational messages, and form tips proactively, not just on demand.

### 3.10. Detailed Performance Analytics

*   **FR-3.10.1: Progress Tracking Over Time:** Log and visualize key performance metrics (e.g., total reps, total time, consistency, range of motion trends) over days, weeks, and months.
*   **FR-3.10.2: Performance Summaries:** Generate comprehensive post-workout reports detailing achievements, areas for improvement, and progress towards goals.

## 4. Technical Stack

*   **Frontend Framework/Libraries:** TypeScript, HTML5, CSS3 (Tailwind CSS), JavaScript (ES6 Modules)
*   **Machine Learning:** TensorFlow.js (`@tensorflow/tfjs`, `@tensorflow-models/pose-detection` with MoveNet model)
*   **AI/LLM Integration:** Google Gemini API (requires API key configuration)
*   **Icons:** Lucide Icons (via unpkg CDN)
*   **Styling:** Tailwind CSS (via CDN)
*   **Client-Side Storage:** Browser `localStorage`

## 4.1 Additional Technologies Used

*   **UI Library:** Shadcn/ui
*   **Form Validation:** N/A
*   **State Management:** React useState, useRef, useCallback
*   **Linting:** ESLint
*   **Code Formatting:** N/A
*   **Package Manager:** npm

## 5. Non-Functional Requirements

*   **NFR-5.1 (Performance):** Real-time pose detection and UI updates are optimized for minimal latency. Initial application load is fast due to client-side processing and deferred camera initialization.
*   **NFR-5.2 (Usability):** Intuitive and clean user interface designed for ease of navigation. Features like dynamic camera orientation and clear feedback enhance user experience.
*   **NFR-5.3 (Responsiveness):** The application layout adapts seamlessly to various screen sizes (desktop, tablet, mobile) using responsive design principles and a mobile-friendly menu.
*   **NFR-5.4 (Privacy):** All video processing and pose detection occur entirely client-side. No video data or sensitive pose information is transmitted to any external server.
*   **NFR-5.5 (Compatibility):** Designed to function correctly on modern, evergreen web browsers (e.g., Chrome, Firefox, Safari).

## 6. Future Enhancements

*   **Expanded Exercise Library:** Incorporate a wider variety of exercises targeting different muscle groups and fitness levels.
*   **Difficulty Levels:** Allow users to select workout difficulty (Beginner, Intermediate, Advanced) which could adjust exercise targets or form strictness.
*   **User Profiles:** Implement user accounts to sync workout history and preferences across devices.
*   **Gamification:** Introduce elements like streaks, badges, leaderboards, and achievements to boost user motivation and engagement.
*   **Custom Workout Routines:** Enable users to create, save, and manage their own personalized multi-exercise routines.
*   **Gemini API Key Management:** Implement a secure way to manage and input the Gemini API key.
<task_progress>
- [x] Read fitness.html
- [x] Read PRD.docx
- [x] Analyze codebase
- [ ] Create PRD.md file
</task_progress>
</write_to_file>
