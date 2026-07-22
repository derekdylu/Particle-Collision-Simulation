from fastapi import FastAPI, WebSocket, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Tuple, Any
import asyncio
from controllers.arm_controller import ArmController
from controllers.catcher_controller import CatcherController
from controllers.goal_camera_controller import GoalCameraController
from controllers.replay_camera_controller import ReplayCameraController
from contextlib import asynccontextmanager
from utils.logging_config import server_logger as logger

AUTO_RECORDING_DURATION = 2

# Initialize controllers with lazy connection
arm_controller = None
catcher_controller = None
goal_camera_controller = None
replay_camera_controller = None


async def initialize_controllers():
    global arm_controller, catcher_controller, goal_camera_controller, replay_camera_controller

    try:
        arm_controller = ArmController(lazy_init=True)
        await arm_controller.connect()
    except Exception as e:
        logger.error(f"Failed to initialize arm controller: {str(e)}")
        arm_controller = None

    try:
        catcher_controller = CatcherController(lazy_init=True)
        await catcher_controller.connect()
    except Exception as e:
        logger.error(f"Failed to initialize catcher controller: {str(e)}")
        catcher_controller = None

    try:
        goal_camera_controller = GoalCameraController()
        goal_camera_controller.start()
    except Exception as e:
        logger.error(f"Failed to initialize goal camera controller: {str(e)}")
        goal_camera_controller = None

    try:
        replay_camera_controller = ReplayCameraController()
        replay_camera_controller.start()
    except Exception as e:
        logger.error(f"Failed to initialize replay camera controller: {str(e)}")
        replay_camera_controller = None


async def send_initial_arm_commands():
    """Send initial arm commands after server startup with delays to prevent crashes."""
    if arm_controller is None:
        logger.warning("Arm controller not available, skipping initial commands")
        return
    
    try:
        # Wait a bit for the server to fully start
        await asyncio.sleep(1)
        
        # Send first command: set auto mode
        logger.info("Sending initial arm command: set auto mode")
        await arm_controller.set_auto_mode()
        
        # Wait 2 seconds before sending the next command
        await asyncio.sleep(1)
        
        # Send second command: set rate 100
        logger.info("Sending initial arm command: set rate 100")
        await arm_controller.set_rate_100()
        
        logger.info("Initial arm commands completed successfully")
        
    except Exception as e:
        logger.error(f"Failed to send initial arm commands: {str(e)}")


async def check_device_connection(device_name: str, check_func, timeout: float = 2.0):
    """Check device connection with timeout."""
    if check_func is None:
        return False
    try:
        # If check_func is a coroutine function, await it directly
        if asyncio.iscoroutinefunction(check_func):
            return await asyncio.wait_for(check_func(), timeout=timeout)
        # If it's a regular function, run it in a thread pool
        return await asyncio.wait_for(asyncio.to_thread(check_func), timeout=timeout)
    except (asyncio.TimeoutError, ConnectionRefusedError, Exception) as e:
        logger.error(f"Failed to connect to {device_name}: {str(e)}")
        return False


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # Initialize controllers
        await initialize_controllers()

        # Startup - Initialize all connection states as False
        app.state.replay_camera_connected = False
        app.state.goal_camera_connected = False
        app.state.catcher_connected = False
        app.state.arm_connected = False

        if catcher_controller:
            app.state.catcher_connected = await check_device_connection(
                "Catcher", lambda: catcher_controller.check_connection
            )

        if arm_controller:
            app.state.arm_connected = await check_device_connection(
                "Arm", arm_controller.check_connection
            )

        if goal_camera_controller:
            app.state.goal_camera_connected = await check_device_connection(
                "Goal Camera", goal_camera_controller.check_connection
            )

        if replay_camera_controller:
            app.state.replay_camera_connected = await check_device_connection(
                "Replay Camera", replay_camera_controller.check_connection
            )

        # Clear recording folder
        if replay_camera_controller:
            replay_camera_controller.clear_recording_folder()
            logger.info("Recording folder cleared")

        # Send initial arm commands after startup
        await send_initial_arm_commands()

        yield
    finally:
        # Shutdown - Handle each device separately
        if catcher_controller:
            try:
                await catcher_controller.disconnect()
            except Exception as e:
                logger.error(f"Error disconnecting catcher: {str(e)}")

        if arm_controller:
            try:
                await arm_controller.disconnect()
            except Exception as e:
                logger.error(f"Error disconnecting arm: {str(e)}")

        if goal_camera_controller:
            try:
                goal_camera_controller.stop()
            except Exception as e:
                logger.error(f"Error stopping goal camera: {str(e)}")

        if replay_camera_controller:
            try:
                replay_camera_controller.stop()
            except Exception as e:
                logger.error(f"Error stopping replay camera: {str(e)}")


app = FastAPI(title="Baseball Simulation Server", lifespan=lifespan)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# WebSocket connections
active_connections: List[WebSocket] = []


# Models
class PresetPosition(BaseModel):
    preset: int


class RecordingRequest(BaseModel):
    duration: Optional[int] = Field(
        default=10, ge=1, le=300, description="Recording duration in seconds"
    )


class ApiResponse(BaseModel):
    status: str
    message: str
    data: Optional[Dict[str, Any]] = None


# Test frontend
@app.get("/test")
async def test():
    return {
        "message": "Server is running",
        "connections": {
            "goal_camera": getattr(app.state, "goal_camera_connected", False),
            "replay_camera": getattr(app.state, "replay_camera_connected", False),
            "catcher": getattr(app.state, "catcher_connected", False),
            "arm": getattr(app.state, "arm_connected", False),
        },
    }


# Arm endpoints
@app.post("/arm/preset/{preset_number}", response_model=ApiResponse)
async def move_arm_to_preset(preset_number: int) -> ApiResponse:
    if not 1 <= preset_number <= 7:
        raise HTTPException(status_code=400, detail="Preset number must be between 1 and 7")

    try:
        preset_method = getattr(arm_controller, f"preset{preset_number}")
        await preset_method()
        return ApiResponse(
            status="success",
            message=f"Arm moved to preset {preset_number}",
            data={"preset": preset_number},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/arm/set-auto-mode", response_model=ApiResponse)
async def set_arm_auto_mode() -> ApiResponse:
    try:
        await arm_controller.set_auto_mode()
        return ApiResponse(status="success", message="Arm set to auto mode")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/arm/set-manual-mode", response_model=ApiResponse)
async def set_arm_manual_mode() -> ApiResponse:
    try:
        await arm_controller.set_manual_mode()
        return ApiResponse(status="success", message="Arm set to manual mode")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/arm/set-rate-100", response_model=ApiResponse)
async def set_arm_rate_100() -> ApiResponse:
    try:
        await arm_controller.set_rate_100()
        return ApiResponse(status="success", message="Arm set to 100% rate")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/arm/set-rate-up", response_model=ApiResponse)
async def set_arm_rate_up() -> ApiResponse:
    try:
        await arm_controller.set_rate_up()
        return ApiResponse(status="success", message="Arm rate increased 10% (max: 100%)")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/arm/set-rate-down", response_model=ApiResponse)
async def set_arm_rate_down() -> ApiResponse:
    try:
        await arm_controller.set_rate_down()
        return ApiResponse(status="success", message="Arm rate decreased 10% (min: 0%)")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/arm/send-text-command/{command}", response_model=ApiResponse)
async def send_arm_text_command(command: str) -> ApiResponse:
    try:
        await arm_controller.send_text_command(command)
        return ApiResponse(status="success", message=f"Arm sent text command: {command}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/arm/hit-ball", response_model=ApiResponse)
async def hit_ball() -> ApiResponse:
    try:
        await arm_controller.hit_ball()
        return ApiResponse(status="success", message="Arm hit ball")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Catcher endpoints
@app.post("/catcher/reset", response_model=ApiResponse)
async def reset_ball() -> ApiResponse:
    success = catcher_controller.reset_ball()
    if success:
        return ApiResponse(
            status="success",
            message="Ball reset successfully",
            data={"ball_ready": True},
        )
    raise HTTPException(status_code=500, detail="Failed to reset ball")


@app.get("/catcher/status", response_model=ApiResponse)
async def get_catcher_status() -> ApiResponse:
    response = catcher_controller.is_ball_ready()
    if response != None:
        return ApiResponse(
            status="success",
            message="Catcher status retrieved",
            data={
                "is_connected": True,
                "ball_ready": response,
            },
        )
    raise HTTPException(status_code=500, detail="Failed to get catcher status")

# Goal camera endpoints
@app.get("/goal-camera/status", response_model=ApiResponse)
async def get_camera_status() -> ApiResponse:
    if not goal_camera_controller:
        raise HTTPException(status_code=500, detail="Goal camera controller not initialized")

    camera_info = goal_camera_controller.get_camera_info()
    return ApiResponse(
        status="success",
        message="Camera status retrieved",
        data={"camera_info": camera_info},
    )


@app.get("/goal-camera/result", response_model=ApiResponse)
async def get_goal_camera_result() -> ApiResponse:
    if not goal_camera_controller:
        raise HTTPException(status_code=500, detail="Goal camera controller not initialized")

    result = goal_camera_controller.get_hit_area()
    return ApiResponse(
        status="success",
        message="Goal camera result retrieved",
        data={"result": result},
    )


@app.get("/goal-camera/results", response_model=ApiResponse)
async def get_goal_camera_results() -> ApiResponse:
    if not goal_camera_controller:
        raise HTTPException(status_code=500, detail="Goal camera controller not initialized")

    results = goal_camera_controller.get_detection_history()
    return ApiResponse(
        status="success",
        message="Goal camera results retrieved",
        data={"results": results},
    )

@app.post("/goal-camera/reset-last-hit-area", response_model=ApiResponse)
async def reset_last_hit_area() -> ApiResponse:
    if not goal_camera_controller:
        raise HTTPException(status_code=500, detail="Goal camera controller not initialized")

    goal_camera_controller.reset_last_hit_area()
    return ApiResponse(status="success", message="Last hit area reset") 

# Replay camera endpoints
@app.get("/replay-camera/status", response_model=ApiResponse)
async def get_replay_camera_status() -> ApiResponse:
    if not replay_camera_controller:
        raise HTTPException(status_code=500, detail="Replay camera controller not initialized")

    return ApiResponse(
        status="success",
        message="Replay camera status retrieved",
        data={
            "is_connected": app.state.replay_camera_connected,
            "is_streaming": replay_camera_controller.get_streaming_status(),
            "is_recording": replay_camera_controller.is_recording,
            "camera_info": replay_camera_controller.get_camera_info(),
        },
    )

@app.get("/replay-camera/recording-filename", response_model=ApiResponse)
async def get_replay_camera_recording_filename() -> ApiResponse:
    if not replay_camera_controller:
        raise HTTPException(status_code=500, detail="Replay camera controller not initialized")

    return ApiResponse(status="success", message="Replay camera recording filename retrieved", data={"filename": replay_camera_controller.get_recording_filename()})


@app.post("/replay-camera/start-recording", response_model=ApiResponse)
async def start_replay_camera_recording() -> ApiResponse:
    if not replay_camera_controller:
        raise HTTPException(status_code=500, detail="Replay camera controller not initialized")

    replay_camera_controller.start_recording()
    return ApiResponse(status="success", message="Replay camera recording started")


@app.post("/replay-camera/stop-recording", response_model=ApiResponse)
async def stop_replay_camera_recording() -> ApiResponse:
    if not replay_camera_controller:
        raise HTTPException(status_code=500, detail="Replay camera controller not initialized")

    replay_camera_controller.stop_recording()
    return ApiResponse(status="success", message="Replay camera recording stopped")


@app.post("/replay-camera/start-auto-recording", response_model=ApiResponse)
async def start_auto_replay_camera_recording() -> ApiResponse:
    if not replay_camera_controller:
        raise HTTPException(status_code=500, detail="Replay camera controller not initialized")

    replay_camera_controller.start_recording()
    logger.info("Replay camera recording started")
    # wait for AUTO_RECORDING_DURATION seconds
    await asyncio.sleep(AUTO_RECORDING_DURATION)
    logger.info("Replay camera recording stopped")
    replay_camera_controller.stop_recording()
    # return the video file
    return ApiResponse(status="success", message="Replay camera auto recording completed")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
