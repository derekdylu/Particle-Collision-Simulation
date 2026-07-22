import cv2
import numpy as np
import threading
import logging
from typing import Optional, Tuple, List
from dataclasses import dataclass
from datetime import datetime
import os
import asyncio
from utils.logging_config import goal_camera_logger as logger
import time

GOAL_CAMERA_INDEX = 0

@dataclass
class GoalBallDetection:
    """Data class for goal ball detection results."""

    position: Tuple[int, int]
    area: int
    timestamp: float
    confidence: float


class GoalCameraController:
    """Controller for goal camera with ball detection capabilities."""

    # Camera settings
    DEFAULT_WIDTH = 1920
    DEFAULT_HEIGHT = 1080
    DEFAULT_FPS = 30

    # Preview window settings
    DEFAULT_PREVIEW_WIDTH = 854
    DEFAULT_PREVIEW_HEIGHT = 480

    # Ball detection settings (HSV color space)
    TARGET_LOWER = np.array([20, 150, 200])
    TARGET_UPPER = np.array([40, 255, 255])
    MIN_BALL_AREA = 10
    MAX_BALL_AREA = 5000  # Maximum area to avoid false positives
    CONFIDENCE_THRESHOLD = 0.6
    MIN_CIRCULARITY = 0.3  # Minimum circularity for ball-like shapes
    TEMPORAL_SMOOTHING_FRAMES = 3  # Number of frames for temporal smoothing

    # Recording settings
    RECORD_DIR = "recordings"

    # Default boundary settings
    DEFAULT_BOUNDARY_X = 500
    DEFAULT_BOUNDARY_Y = 300
    BOUNDARY_ADJUSTMENT_STEP = 10

    def __init__(self, camera_index: Optional[int] = GOAL_CAMERA_INDEX):
        """Initialize the goal camera controller.

        Args:
            camera_index: Optional specific camera index to use. If None, will auto-detect.
        """
        # Core components
        self.goal_cap = None
        self.camera_index = camera_index
        self.processing_thread: Optional[threading.Thread] = None

        # State tracking
        self.is_running = False
        self.is_streaming = False
        self.is_recording = False
        self.last_hit_area = -1
        self.detection_history: List[GoalBallDetection] = []
        
        # Temporal smoothing for ball detection
        self.recent_detections: List[Optional[GoalBallDetection]] = []
        self.last_detection_position: Optional[Tuple[int, int]] = None

        # Camera properties
        self.width = self.DEFAULT_WIDTH
        self.height = self.DEFAULT_HEIGHT
        self.fps = self.DEFAULT_FPS

        # Preview window properties
        self.preview_width = self.DEFAULT_PREVIEW_WIDTH
        self.preview_height = self.DEFAULT_PREVIEW_HEIGHT

        # Initialize goal areas
        self.goal_areas = []

        # Initialize detection boundary with default values
        self.boundary_x = self.DEFAULT_BOUNDARY_X
        self.boundary_y = self.DEFAULT_BOUNDARY_Y
        self.detection_boundary = None

        # Ensure recording directory exists
        os.makedirs(self.RECORD_DIR, exist_ok=True)

        # Video writer for recording
        self.video_writer = None

        logger.info("Goal camera controller initialized")

    def setup_goal_areas(self) -> None:
        """Set up the detection boundary and four goal areas within it as vertical sections."""
        if not self.goal_cap:
            logger.error("Cannot setup goal areas: Camera not initialized")
            return

        frame_width = int(self.goal_cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(self.goal_cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # Use current boundary values
        boundary_width = frame_width - (self.boundary_x * 2)
        boundary_height = frame_height - (self.boundary_y * 2)

        # Store the detection boundary
        self.detection_boundary = (self.boundary_x, self.boundary_y, boundary_width, boundary_height)

        # Divide the boundary into four equal vertical sections
        area_width = boundary_width
        area_height = boundary_height // 4

        self.goal_areas = [
            # Top section (0)
            (self.boundary_x, self.boundary_y, area_width, area_height),
            # Second section (1)
            (self.boundary_x, self.boundary_y + area_height, area_width, area_height),
            # Third section (2)
            (self.boundary_x, self.boundary_y + area_height * 2, area_width, area_height),
            # Bottom section (3)
            (self.boundary_x, self.boundary_y + area_height * 3, area_width, area_height),
        ]
        logger.info(f"Detection boundary and goal areas configured with boundary_x={self.boundary_x}, boundary_y={self.boundary_y}")

    def adjust_boundary_x(self, increase: bool = True) -> None:
        """Adjust the boundary_x value.

        Args:
            increase: True to increase, False to decrease
        """
        if not self.goal_cap:
            logger.error("Cannot adjust boundary: Camera not initialized")
            return

        frame_width = int(self.goal_cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        
        if increase:
            # Ensure boundary doesn't exceed frame limits
            max_boundary_x = frame_width // 2 - 100  # Leave some margin
            if self.boundary_x < max_boundary_x:
                self.boundary_x += self.BOUNDARY_ADJUSTMENT_STEP
                logger.info(f"Increased boundary_x to {self.boundary_x}")
        else:
            # Ensure boundary doesn't go below minimum
            min_boundary_x = 50
            if self.boundary_x > min_boundary_x:
                self.boundary_x -= self.BOUNDARY_ADJUSTMENT_STEP
                logger.info(f"Decreased boundary_x to {self.boundary_x}")

        # Recalculate goal areas with new boundary
        self.setup_goal_areas()

    def adjust_boundary_y(self, increase: bool = True) -> None:
        """Adjust the boundary_y value.

        Args:
            increase: True to increase, False to decrease
        """
        if not self.goal_cap:
            logger.error("Cannot adjust boundary: Camera not initialized")
            return

        frame_height = int(self.goal_cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        if increase:
            # Ensure boundary doesn't exceed frame limits
            max_boundary_y = frame_height // 2 - 100  # Leave some margin
            if self.boundary_y < max_boundary_y:
                self.boundary_y += self.BOUNDARY_ADJUSTMENT_STEP
                logger.info(f"Increased boundary_y to {self.boundary_y}")
        else:
            # Ensure boundary doesn't go below minimum
            min_boundary_y = 50
            if self.boundary_y > min_boundary_y:
                self.boundary_y -= self.BOUNDARY_ADJUSTMENT_STEP
                logger.info(f"Decreased boundary_y to {self.boundary_y}")

        # Recalculate goal areas with new boundary
        self.setup_goal_areas()

    def reset_boundary_to_default(self) -> None:
        """Reset boundary values to default."""
        self.boundary_x = self.DEFAULT_BOUNDARY_X
        self.boundary_y = self.DEFAULT_BOUNDARY_Y
        self.setup_goal_areas()
        logger.info(f"Reset boundary to default: boundary_x={self.boundary_x}, boundary_y={self.boundary_y}")

    def get_boundary_values(self) -> Tuple[int, int]:
        """Get current boundary values.

        Returns:
            Tuple[int, int]: Current (boundary_x, boundary_y) values
        """
        return (self.boundary_x, self.boundary_y)

    def detect_target_ball(self, frame) -> Optional[GoalBallDetection]:
        """Detect the target ball in the frame using a simple HSV mask and area/circularity filtering."""
        try:
            # Convert to HSV color space
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            # Create mask for the single HSV range
            mask = cv2.inRange(hsv, self.TARGET_LOWER, self.TARGET_UPPER)
            # Apply morphological operations to reduce noise
            kernel = np.ones((3, 3), np.uint8)
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
            # Find contours
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if contours:
                # Sort contours by area (largest first)
                contours = sorted(contours, key=cv2.contourArea, reverse=True)
                for contour in contours:
                    area = cv2.contourArea(contour)
                    if area < self.MIN_BALL_AREA or area > self.MAX_BALL_AREA:
                        continue
                    M = cv2.moments(contour)
                    if M["m00"] == 0:
                        continue
                    cx = int(M["m10"] / M["m00"])
                    cy = int(M["m01"] / M["m00"])
                    perimeter = cv2.arcLength(contour, True)
                    if perimeter == 0:
                        continue
                    circularity = 4 * np.pi * area / (perimeter * perimeter)
                    if circularity < self.MIN_CIRCULARITY:
                        continue
                    # Simple confidence: based on area (normalized, capped at 1.0)
                    confidence = min(1.0, area / 100)
                    if confidence > self.CONFIDENCE_THRESHOLD:
                        return GoalBallDetection(
                            position=(cx, cy),
                            area=self.get_goal_area((cx, cy)),
                            timestamp=datetime.now().timestamp(),
                            confidence=confidence,
                        )
            return None
        except Exception as e:
            logger.error(f"Error in ball detection: {str(e)}")
            return None

    def get_goal_area(self, ball_position: Tuple[int, int]) -> int:
        """Determine which goal area the ball is in.

        Args:
            ball_position: (x, y) coordinates of the ball

        Returns:
            int: Goal area index (0-3) or -1 if not in any goal area
        """
        x, y = ball_position
        
        # First check if ball is within detection boundary
        if self.detection_boundary:
            boundary_x, boundary_y, boundary_w, boundary_h = self.detection_boundary
            if not (boundary_x <= x <= boundary_x + boundary_w and boundary_y <= y <= boundary_y + boundary_h):
                return -1  # Ball is outside detection boundary
        
        # Check which goal area the ball is in
        for i, (x1, y1, w, h) in enumerate(self.goal_areas):
            if x1 <= x <= x1 + w and y1 <= y <= y1 + h:
                return i
        return -1

    def start(self) -> bool:
        """Start the goal camera and ball detection.

        Returns:
            bool: True if started successfully, False otherwise
        """
        try:
            logger.info("Starting goal camera...")

            if self.camera_index is not None:
                # Try specific camera index
                logger.info(f"Trying specified camera index: {self.camera_index}")
                success = self._try_camera(self.camera_index)
                if not success:
                    logger.error(f"Failed to open camera at index {self.camera_index}")
                    return False
            else:
                # Try different camera indices
                logger.info("No camera index specified, trying multiple indices...")
                for i in range(10):  # Try more indices
                    logger.info(f"Attempting camera index {i}")
                    if self._try_camera(i):
                        logger.info(f"Successfully connected to camera at index {i}")
                        break
                else:
                    logger.error("No suitable camera found after trying all indices")
                    return False

            # Start processing thread
            logger.info("Starting processing thread...")
            self._start_processing()
            logger.info("Goal camera started successfully")
            return True

        except Exception as e:
            logger.error(f"Error starting camera: {str(e)}")
            return False

    def _try_camera(self, index: int) -> bool:
        """Try to initialize camera at specified index.

        Args:
            index: Camera index to try

        Returns:
            bool: True if camera initialized successfully
        """
        logger.info(f"Attempting to initialize camera at index {index}")
        self.goal_cap = cv2.VideoCapture(index)

        if not self.goal_cap.isOpened():
            logger.error(f"Failed to open camera at index {index}")
            return False

        logger.info("Camera opened successfully, setting properties...")

        # Set camera properties
        self.goal_cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
        self.goal_cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        self.goal_cap.set(cv2.CAP_PROP_FPS, self.fps)

        # Verify settings were applied
        actual_width = self.goal_cap.get(cv2.CAP_PROP_FRAME_WIDTH)
        actual_height = self.goal_cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
        actual_fps = self.goal_cap.get(cv2.CAP_PROP_FPS)

        logger.info(
            f"Camera properties - Width: {actual_width}, Height: {actual_height}, FPS: {actual_fps}"
        )

        if abs(actual_width - self.width) > 100 or abs(actual_height - self.height) > 100:
            logger.warning(
                f"Camera resolution mismatch. Requested: {self.width}x{self.height}, "
                f"Got: {actual_width}x{actual_height}"
            )

        # Test frame capture
        ret, frame = self.goal_cap.read()
        if not ret:
            logger.error("Failed to capture test frame")
            return False

        logger.info("Successfully captured test frame")

        # Initialize goal areas
        self.setup_goal_areas()
        self.is_running = True
        logger.info("Camera initialization completed successfully")
        return True

    def _start_processing(self) -> None:
        """Start processing frames in a separate thread."""
        self.processing_thread = threading.Thread(target=self._process_frames)
        self.processing_thread.daemon = True
        self.processing_thread.start()

    def _process_frames(self) -> None:
        """Process frames continuously to detect the ball and hit areas."""
        RETRY_DELAY = 1.0  # seconds

        while self.is_running:
            try:
                # Check if camera is opened
                if not self.goal_cap or not self.goal_cap.isOpened():
                    logger.warning("Camera not opened, retrying in 1 second...")
                    time.sleep(RETRY_DELAY)
                    continue

                ret, frame = self.goal_cap.read()
                if not ret:
                    logger.warning("Failed to read frame, retrying in 1 second...")
                    time.sleep(RETRY_DELAY)
                    continue

                # Detect ball
                detection = self.detect_target_ball(frame)
                if detection:
                    # Update detection history
                    self.detection_history.append(detection)
                    # Keep only last 100 detections
                    if len(self.detection_history) > 100:
                        self.detection_history.pop(0)

                    # Update hit area if confidence is high enough
                    if detection.area != -1:
                        # update the last hit area if the hit are is higher than the current last hit area
                        # if the latest detection is lower than the current, don't update since it's consider the gravity center
                        if self.last_hit_area == -1:
                            self.last_hit_area = detection.area
                        elif detection.area < self.last_hit_area:
                            self.last_hit_area = detection.area

                    # Draw visualization
                    self._draw_visualization(frame, detection)

                # Record frame if recording is active
                if self.is_recording and self.video_writer:
                    self.video_writer.write(frame)

                # Resize frame for preview if needed
                if frame.shape[1] != self.preview_width or frame.shape[0] != self.preview_height:
                    frame = cv2.resize(frame, (self.preview_width, self.preview_height))

                # Display frame
                cv2.imshow("Goal Camera", frame)
                
                # Handle keyboard input for boundary adjustments
                key = cv2.waitKey(1) & 0xFF
                if key == ord("a"):  # Decrease boundary_x
                    self.adjust_boundary_x(increase=False)
                elif key == ord("d"):  # Increase boundary_x
                    self.adjust_boundary_x(increase=True)
                elif key == ord("w"):  # Decrease boundary_y
                    self.adjust_boundary_y(increase=False)
                elif key == ord("s"):  # Increase boundary_y
                    self.adjust_boundary_y(increase=True)
                elif key == ord("r"):  # Reset to default
                    self.reset_boundary_to_default()

            except Exception as e:
                logger.error(f"Error processing frame: {str(e)}")
                time.sleep(RETRY_DELAY)
                continue

    def _draw_visualization(self, frame, detection: GoalBallDetection) -> None:
        """Draw detection boundary, goal areas and ball position on the frame.

        Args:
            frame: The frame to draw on
            detection: Ball detection results
        """
        # Draw detection boundary rectangle
        if self.detection_boundary:
            boundary_x, boundary_y, boundary_w, boundary_h = self.detection_boundary
            cv2.rectangle(frame, (boundary_x, boundary_y), (boundary_x + boundary_w, boundary_y + boundary_h), (255, 255, 255), 3)
            
            # Add boundary label
            cv2.putText(
                frame,
                "Detection Boundary",
                (boundary_x + 10, boundary_y - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 255),
                2,
            )

        # Draw goal areas
        for i, (x, y, w, h) in enumerate(self.goal_areas):
            # Yellow for last hit, green for current detection, red for others
            if i == self.last_hit_area:
                color = (0, 255, 255)  # Yellow
            elif i == detection.area:
                color = (0, 255, 0)  # Green
            else:
                color = (0, 0, 255)  # Red
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)

            # Add area labels
            cv2.putText(
                frame,
                f"Area {i}",
                (x + 10, y + 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                color,
                2,
            )

        # Draw ball position with confidence
        if detection:
            cv2.circle(frame, detection.position, 10, (0, 255, 255), -1)
            cv2.putText(
                frame,
                f"Conf: {detection.confidence:.2f}",
                (detection.position[0] - 20, detection.position[1] - 20),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 255, 255),
                2,
            )

        # Draw control instructions and current values
        self._draw_controls_info(frame)

    def _draw_controls_info(self, frame) -> None:
        """Draw control instructions and current boundary values on the frame.

        Args:
            frame: The frame to draw on
        """
        # Get frame dimensions
        height, width = frame.shape[:2]
        
        # Control instructions
        instructions = [
            "Controls:",
            "A/D - Adjust boundary X",
            "W/S - Adjust boundary Y", 
            "R - Reset to default",
        ]
        
        # Current boundary values
        current_values = [
            f"Boundary X: {self.boundary_x}",
            f"Boundary Y: {self.boundary_y}"
        ]
        
        # Draw instructions on the left side
        y_offset = 30
        for i, instruction in enumerate(instructions):
            color = (255, 255, 255) if i == 0 else (200, 200, 200)  # White for header, gray for others
            cv2.putText(
                frame,
                instruction,
                (10, y_offset + i * 25),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                color,
                2,
            )
        
        # Draw current values on the right side
        y_offset = 30
        for i, value in enumerate(current_values):
            cv2.putText(
                frame,
                value,
                (width - 200, y_offset + i * 25),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 255),  # Yellow
                2,
            )

    def reset_last_hit_area(self) -> None:
        """Reset the last hit area."""
        self.last_hit_area = -1

    def start_recording(self) -> bool:
        """Start recording video with detections.

        Returns:
            bool: True if recording started successfully
        """
        if not self.goal_cap or not self.goal_cap.isOpened():
            return False

        try:
            filename = os.path.join(
                self.RECORD_DIR,
                f"goal_detection_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4",
            )

            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            self.video_writer = cv2.VideoWriter(
                filename,
                fourcc,
                self.fps,
                (
                    int(self.goal_cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
                    int(self.goal_cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
                ),
            )

            self.is_recording = True
            logger.info(f"Started recording to {filename}")
            return True

        except Exception as e:
            logger.error(f"Error starting recording: {str(e)}")
            return False

    def stop_recording(self) -> None:
        """Stop current recording if active."""
        if self.is_recording and self.video_writer:
            self.video_writer.release()
            self.video_writer = None
            self.is_recording = False
            logger.info("Recording stopped")

    def stop(self) -> None:
        """Stop the goal camera and ball detection."""
        self.is_running = False

        # Stop recording if active
        if self.is_recording:
            self.stop_recording()

        # Release camera
        if self.goal_cap:
            self.goal_cap.release()

        cv2.destroyAllWindows()
        logger.info("Goal camera stopped")

    def get_hit_area(self) -> int:
        """Get the last detected hit area.

        Returns:
            int: Index of the hit area (0-3) or -1 if no hit detected
            Area mapping:
            0 - Top Left
            1 - Top Right
            2 - Bottom Left
            3 - Bottom Right
            -1 - No hit detected
        """
        return self.last_hit_area

    def get_detection_history(self) -> List[GoalBallDetection]:
        """Get the history of ball detections.

        Returns:
            List[GoalBallDetection]: List of recent ball detections
        """
        return self.detection_history.copy()

    def is_connected(self) -> bool:
        """Check if the camera is connected and operational.

        Returns:
            bool: True if camera is connected and operational, False otherwise
        """
        try:
            logger.info("Checking camera connection...")
            if self.goal_cap is None:
                logger.error("Camera capture object is None")
                return False

            is_opened = self.goal_cap.isOpened()
            logger.info(f"Camera opened status: {is_opened}")

            if not is_opened:
                logger.error("Camera is not opened")
                return False

            ret, _ = self.goal_cap.read()
            logger.info(f"Camera read status: {ret}")

            if not ret:
                logger.error("Failed to read frame from camera")
                return False

            logger.info("Camera is successfully connected and operational")
            return True

        except Exception as e:
            logger.error(f"Error checking camera connection: {str(e)}")
            return False

    async def check_connection(self) -> bool:
        """Asynchronously check camera connection status and start preview if connected.

        Returns:
            bool: True if camera is connected and operational
        """
        try:
            is_connected = await asyncio.to_thread(self.is_connected)
            if is_connected:
                # Start camera and preview if not already running
                if not self.is_running:
                    success = self.start()
                    if not success:
                        logger.error("Failed to start camera preview")
                        return False
                # Start streaming if not already streaming
                if not self.is_streaming:
                    await self.start_streaming()
            return is_connected
        except Exception as e:
            logger.error(f"Error in async connection check: {str(e)}")
            return False

    def get_camera_info(self) -> dict:
        """Get current camera settings and status.

        Returns:
            dict: Camera information and settings
        """
        connection_status = self.is_connected()

        if not connection_status:
            return {"status": "Not connected", "is_connected": False}

        return {
            "status": "Connected" if connection_status else "Disconnected",
            "is_connected": connection_status,
            "resolution": f"{self.width}x{self.height}",
            "fps": self.fps,
            "is_running": self.is_running,
            "is_streaming": self.is_streaming,
            "is_recording": self.is_recording,
            "last_hit_area": self.last_hit_area,
            "detection_count": len(self.detection_history),
            "detection_boundary": self.detection_boundary,
            "boundary_x": self.boundary_x,
            "boundary_y": self.boundary_y,
            "default_boundary_x": self.DEFAULT_BOUNDARY_X,
            "default_boundary_y": self.DEFAULT_BOUNDARY_Y,
        }

    async def start_streaming(self) -> bool:
        """Start streaming the camera feed with ball detection.

        Returns:
            bool: True if streaming started successfully
        """
        if not self.is_connected():
            logger.error("Cannot start streaming: Camera not connected")
            return False

        if self.is_streaming:
            logger.warning("Streaming is already active")
            return True

        # Start camera if not already running
        if not self.is_running:
            success = self.start()
            if not success:
                return False

        self.is_streaming = True
        logger.info("Camera streaming started")
        return True

    async def stop_streaming(self) -> None:
        """Stop streaming the camera feed."""
        self.is_streaming = False
        logger.info("Camera streaming stopped")

    def get_streaming_status(self) -> bool:
        """Get current streaming status.

        Returns:
            bool: True if streaming is active
        """
        return self.is_streaming and self.is_connected()

    def set_preview_size(self, width: int, height: int) -> None:
        """Set the preview window size.

        Args:
            width: Preview window width in pixels
            height: Preview window height in pixels
        """
        self.preview_width = width
        self.preview_height = height
        logger.info(f"Preview window size set to {width}x{height}")

    def get_detection_boundary(self) -> Optional[Tuple[int, int, int, int]]:
        """Get the detection boundary rectangle.

        Returns:
            Tuple[int, int, int, int]: (x, y, width, height) of detection boundary or None if not set
        """
        return self.detection_boundary


if __name__ == "__main__":
    # Create camera controller instance
    camera = GoalCameraController()

    try:
        # Start the camera preview
        if camera.start():
            logger.info("Goal Camera started successfully")
    except KeyboardInterrupt:
        logger.info("Stopping preview of goal camera...")
    finally:
        # Clean up
        camera.stop()
