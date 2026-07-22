import cv2
import numpy as np
import threading
import logging
from typing import Optional, Tuple, List
from dataclasses import dataclass
from datetime import datetime
import os
import asyncio
from utils.logging_config import replay_camera_logger as logger
import time

REPLAY_CAMERA_INDEX = 1

@dataclass
class ReplayCameraController:
    """Controller for replay camera"""

    # Camera settings
    DEFAULT_WIDTH = 1920
    DEFAULT_HEIGHT = 1080
    DEFAULT_FPS = 240

    # Preview window settings
    DEFAULT_PREVIEW_WIDTH = 854
    DEFAULT_PREVIEW_HEIGHT = 480

    # Recording settings
    RECORD_DIR = "Baseball-Simulation-FEND/public/recordings"
    PLAYBACK_FPS = 30  # Standard playback frame rate for slow motion

    def __init__(self, camera_index: Optional[int] = REPLAY_CAMERA_INDEX):
        """Initialize the replay camera controller.

        Args:
            camera_index: Optional specific camera index to use. If None, will auto-detect.
        """
        # Core components
        self.replay_cap = None
        self.camera_index = camera_index
        self.processing_thread: Optional[threading.Thread] = None

        # State tracking
        self.is_running = False
        self.is_streaming = False
        self.is_recording = False

        # Camera properties
        self.width = self.DEFAULT_WIDTH
        self.height = self.DEFAULT_HEIGHT
        self.fps = self.DEFAULT_FPS

        # Preview window properties
        self.preview_width = self.DEFAULT_PREVIEW_WIDTH
        self.preview_height = self.DEFAULT_PREVIEW_HEIGHT

        # Initialize replay areas
        self.replay_areas = []

        # Ensure recording directory exists
        os.makedirs(self.RECORD_DIR, exist_ok=True)

        # Video writer for recording
        self.video_writer = None
        
        # Frame rate control
        self.frame_interval = 1.0 / self.fps
        self.last_frame_time = 0
        
        # Recording statistics
        self.recording_start_time = 0
        self.recorded_frames = 0
        self.recording_filename = ""

        logger.info("Replay camera controller initialized")

    def start(self) -> bool:
        """Start the replay camera.

        Returns:
            bool: True if started successfully, False otherwise
        """
        try:
            logger.info("Starting replay camera...")

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
            logger.info("Replay camera started successfully")
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
        self.replay_cap = cv2.VideoCapture(index)

        if not self.replay_cap.isOpened():
            logger.error(f"Failed to open camera at index {index}")
            return False

        logger.info("Camera opened successfully, setting properties...")

        # Set camera properties with more specific settings for high frame rate
        self.replay_cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
        self.replay_cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        self.replay_cap.set(cv2.CAP_PROP_FPS, self.fps)
        
        # Additional settings for better performance
        self.replay_cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimize latency
        self.replay_cap.set(cv2.CAP_PROP_AUTOFOCUS, 0)   # Disable autofocus for speed
        self.replay_cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, 0.25)  # Manual exposure

        # Verify settings were applied
        actual_width = self.replay_cap.get(cv2.CAP_PROP_FRAME_WIDTH)
        actual_height = self.replay_cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
        actual_fps = self.replay_cap.get(cv2.CAP_PROP_FPS)

        logger.info(
            f"Camera properties - Width: {actual_width}, Height: {actual_height}, FPS: {actual_fps}"
        )

        if abs(actual_width - self.width) > 100 or abs(actual_height - self.height) > 100:
            logger.warning(
                f"Camera resolution mismatch. Requested: {self.width}x{self.height}, "
                f"Got: {actual_width}x{actual_height}"
            )
        
        if abs(actual_fps - self.fps) > 30:
            logger.warning(
                f"Camera FPS mismatch. Requested: {self.fps}, Got: {actual_fps}"
            )

        # Test frame capture
        ret, frame = self.replay_cap.read()
        if not ret:
            logger.error("Failed to capture test frame")
            return False

        logger.info("Successfully captured test frame")

        # Initialize replay areas
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
                current_time = time.time()
                
                # Frame rate control for recording
                if self.is_recording:
                    # Ensure we maintain the target frame rate for recording
                    if current_time - self.last_frame_time < self.frame_interval:
                        time.sleep(0.001)  # Small sleep to prevent busy waiting
                        continue
                
                # Check if camera is opened
                if not self.replay_cap or not self.replay_cap.isOpened():
                    logger.warning("Camera not opened, retrying in 1 second...")
                    time.sleep(RETRY_DELAY)
                    continue

                ret, frame = self.replay_cap.read()
                if not ret:
                    logger.warning("Failed to read frame, retrying in 1 second...")
                    time.sleep(RETRY_DELAY)
                    continue

                # Record frame if recording is active
                if self.is_recording and self.video_writer:
                    # Use original frame size for recording (not resized for preview)
                    recording_frame = frame.copy()
                    self.video_writer.write(recording_frame)
                    self.recorded_frames += 1
                    
                    # Log recording progress every 100 frames
                    if self.recorded_frames % 100 == 0:
                        elapsed = current_time - self.recording_start_time
                        actual_fps = self.recorded_frames / elapsed if elapsed > 0 else 0
                        logger.info(f"Recording: {self.recorded_frames} frames, {elapsed:.2f}s elapsed, {actual_fps:.1f} FPS")

                # Resize frame for preview if needed
                preview_frame = frame.copy()
                if preview_frame.shape[1] != self.preview_width or preview_frame.shape[0] != self.preview_height:
                    preview_frame = cv2.resize(preview_frame, (self.preview_width, self.preview_height))

                # Display frame
                cv2.imshow("Replay Camera", preview_frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
                
                self.last_frame_time = current_time

            except Exception as e:
                logger.error(f"Error processing frame: {str(e)}")
                time.sleep(RETRY_DELAY)
                continue

    def start_recording(self) -> bool:
        """Start recording video.

        Returns:
            bool: True if recording started successfully
        """
        if not self.replay_cap or not self.replay_cap.isOpened():
            return False

        try:
            # save the file name to send to the frontend
            self.recording_filename = os.path.join(self.RECORD_DIR, "replay_recording_" + datetime.now().strftime("%Y%m%d_%H%M%S") + ".mp4")

            # Use H.264 codec which is widely supported by web browsers
            # Try different H.264 implementations in order of preference
            codecs_to_try = [
                ('avc1', 'avc1'),  # H.264 - most compatible with web browsers
                ('H264', 'H264'),  # Alternative H.264 implementation
                ('mp4v', 'mp4v'),  # Fallback
                ('XVID', 'XVID'),  # Last resort
            ]
            
            video_writer = None
            for codec_name, fourcc_code in codecs_to_try:
                try:
                    logger.info(f"Trying codec: {codec_name}")
                    fourcc = cv2.VideoWriter_fourcc(*fourcc_code)
                    video_writer = cv2.VideoWriter(
                        self.recording_filename,
                        fourcc,
                        self.PLAYBACK_FPS,  # Use playback FPS for slow motion effect
                        (self.width, self.height),  # Use intended recording resolution
                        isColor=True
                    )
                    
                    # Test if the video writer is properly initialized
                    if video_writer.isOpened():
                        logger.info(f"Successfully initialized video writer with codec {codec_name}")
                        break
                    else:
                        video_writer.release()
                        video_writer = None
                        logger.warning(f"Failed to initialize video writer with codec {codec_name}")
                        
                except Exception as e:
                    logger.warning(f"Error with codec {codec_name}: {str(e)}")
                    if video_writer:
                        video_writer.release()
                        video_writer = None
                    continue
            
            if video_writer is None:
                logger.error("Failed to initialize video writer with any codec")
                return False

            self.video_writer = video_writer
            self.is_recording = True
            self.recording_start_time = time.time()
            self.recorded_frames = 0
            logger.info(f"Started recording to {self.recording_filename} at {self.fps} FPS capture, {self.PLAYBACK_FPS} FPS playback (8x slow motion)")
            return True

        except Exception as e:
            logger.error(f"Error starting recording: {str(e)}")
            return False

    def stop_recording(self) -> None:
        """Stop current recording if active."""
        if self.is_recording and self.video_writer:
            try:
                self.video_writer.release()
                self.video_writer = None
                self.is_recording = False
                
                # Log final statistics
                duration = time.time() - self.recording_start_time
                actual_fps = self.recorded_frames / duration if duration > 0 else 0
                slow_motion_multiplier = self.fps / self.PLAYBACK_FPS
                playback_duration = duration * slow_motion_multiplier
                
                logger.info(f"Recording stopped successfully")
                logger.info(f"Final stats: {self.recorded_frames} frames, {duration:.2f}s capture, {playback_duration:.2f}s playback")
                logger.info(f"Capture FPS: {actual_fps:.1f}, Playback FPS: {self.PLAYBACK_FPS} ({slow_motion_multiplier}x slow motion)")
                
                # Verify the video file was created and has content
                if os.path.exists(self.recording_filename):
                    file_size = os.path.getsize(self.recording_filename)
                    logger.info(f"Video file created: {self.recording_filename}, size: {file_size} bytes")
                    
                    if file_size < 1000:  # Less than 1KB indicates a problem
                        logger.warning(f"Video file seems too small ({file_size} bytes), may be corrupted")
                else:
                    logger.error(f"Video file was not created: {self.recording_filename}")
                
            except Exception as e:
                logger.error(f"Error stopping recording: {str(e)}")

    def check_video_file(self) -> dict:
        """Check if the recorded video file is valid and playable.
        
        Returns:
            dict: Video file status and information
        """
        try:
            if not os.path.exists(self.recording_filename):
                return {
                    "exists": False,
                    "error": "File does not exist",
                    "filename": self.recording_filename
                }
            
            file_size = os.path.getsize(self.recording_filename)
            
            if file_size == 0:
                return {
                    "exists": True,
                    "error": "File is empty",
                    "filename": self.recording_filename,
                    "size": file_size
                }
            
            # Try to open the video file with OpenCV to check if it's valid
            cap = cv2.VideoCapture(self.recording_filename)
            if not cap.isOpened():
                return {
                    "exists": True,
                    "error": "Cannot open video file with OpenCV",
                    "filename": self.recording_filename,
                    "size": file_size
                }
            
            # Get video properties
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            # Try to read the first frame
            ret, frame = cap.read()
            cap.release()
            
            if not ret:
                return {
                    "exists": True,
                    "error": "Cannot read frames from video",
                    "filename": self.recording_filename,
                    "size": file_size,
                    "frame_count": frame_count,
                    "fps": fps,
                    "resolution": f"{width}x{height}"
                }
            
            return {
                "exists": True,
                "valid": True,
                "filename": self.recording_filename,
                "size": file_size,
                "frame_count": frame_count,
                "fps": fps,
                "resolution": f"{width}x{height}",
                "duration": frame_count / fps if fps > 0 else 0
            }
            
        except Exception as e:
            return {
                "exists": os.path.exists(self.recording_filename) if 'self.recording_filename' in locals() else False,
                "error": f"Error checking video file: {str(e)}",
                "filename": self.recording_filename if 'self.recording_filename' in locals() else "unknown"
            }

    def get_recording_filename(self) -> str:
        """Get the current recording filename.
        
        Returns:
            str: Current recording filename
        """
        return self.recording_filename
    
    def clear_recording_folder(self) -> None:
        """Clear the recording folder."""
        for file in os.listdir(self.RECORD_DIR):
            os.remove(os.path.join(self.RECORD_DIR, file))
        logger.info("Recording folder cleared")

    def stop(self) -> None:
        """Stop the replay camera."""
        self.is_running = False

        # Stop recording if active
        if self.is_recording:
            self.stop_recording()

        # Release camera
        if self.replay_cap:
            self.replay_cap.release()

        cv2.destroyAllWindows()
        logger.info("Replay camera stopped")

    def is_connected(self) -> bool:
        """Check if the camera is connected and operational.

        Returns:
            bool: True if camera is connected and operational, False otherwise
        """
        try:
            logger.info("Checking camera connection...")
            if self.replay_cap is None:
                logger.error("Camera capture object is None")
                return False

            is_opened = self.replay_cap.isOpened()
            logger.info(f"Camera opened status: {is_opened}")

            if not is_opened:
                logger.error("Camera is not opened")
                return False

            ret, _ = self.replay_cap.read()
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
        }

    async def start_streaming(self) -> bool:
        """Start streaming the camera feed.

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

    def get_recording_stats(self) -> dict:
        """Get current recording statistics.

        Returns:
            dict: Recording statistics including frame count, duration, and FPS
        """
        if not self.is_recording:
            return {"status": "Not recording"}
        
        current_time = time.time()
        duration = current_time - self.recording_start_time
        actual_fps = self.recorded_frames / duration if duration > 0 else 0
        slow_motion_multiplier = self.fps / self.PLAYBACK_FPS
        playback_duration = duration * slow_motion_multiplier
        
        return {
            "status": "Recording",
            "filename": self.recording_filename,
            "capture_fps": self.fps,
            "playback_fps": self.PLAYBACK_FPS,
            "slow_motion_multiplier": f"{slow_motion_multiplier}x",
            "actual_capture_fps": round(actual_fps, 1),
            "frame_count": self.recorded_frames,
            "capture_duration": round(duration, 2),
            "playback_duration": round(playback_duration, 2),
            "resolution": f"{self.width}x{self.height}",
            "file_size": os.path.getsize(self.recording_filename) if os.path.exists(self.recording_filename) else 0
        }

    def set_recording_fps(self, fps: int) -> None:
        """Set the recording frame rate.

        Args:
            fps: Target frame rate for recording
        """
        if fps <= 0:
            logger.error("Invalid FPS value")
            return
            
        self.fps = fps
        self.frame_interval = 1.0 / self.fps
        logger.info(f"Recording FPS set to {fps}")

    def set_recording_resolution(self, width: int, height: int) -> None:
        """Set the recording resolution.

        Args:
            width: Recording width in pixels
            height: Recording height in pixels
        """
        if width <= 0 or height <= 0:
            logger.error("Invalid resolution values")
            return
            
        self.width = width
        self.height = height
        logger.info(f"Recording resolution set to {width}x{height}")

    def set_playback_fps(self, fps: int) -> None:
        """Set the playback frame rate for slow motion effect.

        Args:
            fps: Playback frame rate (e.g., 30 for 8x slow motion, 24 for 10x slow motion)
        """
        if fps <= 0:
            logger.error("Invalid playback FPS value")
            return
            
        self.PLAYBACK_FPS = fps
        slow_motion_multiplier = self.fps / self.PLAYBACK_FPS
        logger.info(f"Playback FPS set to {fps} ({slow_motion_multiplier:.1f}x slow motion)")

    def get_slow_motion_info(self) -> dict:
        """Get information about the slow motion settings.

        Returns:
            dict: Slow motion configuration information
        """
        slow_motion_multiplier = self.fps / self.PLAYBACK_FPS
        return {
            "capture_fps": self.fps,
            "playback_fps": self.PLAYBACK_FPS,
            "slow_motion_multiplier": slow_motion_multiplier,
            "description": f"{slow_motion_multiplier:.1f}x slow motion"
        }


if __name__ == "__main__":
    # Create camera controller instance
    camera = ReplayCameraController()

    try:
        # Start the camera preview
        if camera.start():
            logger.info("Replay Camera started successfully")
    except KeyboardInterrupt:
        logger.info("Stopping preview of replay camera...")
    finally:
        # Clean up
        camera.stop()
