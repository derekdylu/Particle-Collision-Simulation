const BASE_URL = 'http://localhost:8000';

interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
}

interface ArmStatus {
  status: string;
  message: string;
}

interface CatcherStatus {
  is_connected: boolean;
  ball_ready: boolean;
}

interface CameraStatus {
  camera_info: {
    status: string;
    is_connected: boolean;
    is_running: boolean;
    is_streaming: boolean;
    is_recording: boolean;
    resolution: string;
    fps: number;
    last_hit_area: number;
    detection_count: number;
  };
}

interface CameraResult {
  result: number;
  status: string;
  message: string;
}

interface ReplayCameraRecordingFilename {
  filename: string;
}

export interface ServerStatus {
  server: boolean;
  arm: boolean;
  catcher: boolean;
  goal_camera: boolean;
  replay_camera: boolean;
}

export const api = {
  testBackend: async (): Promise<ApiResponse<ServerStatus>> => {
    try {
      const response = await fetch(`${BASE_URL}/test`);
      const data = await response.json();
      return {
        status: 'success',
        message: data.message,
        data: {
          server: true,
          arm: data.connections.arm,
          catcher: data.connections.catcher,
          goal_camera: data.connections.goal_camera,
          replay_camera: data.connections.replay_camera
        }
      };
    } catch {
      return {
        status: 'error',
        message: 'Failed to connect to server',
        data: {
          server: false,
          arm: false,
          catcher: false,
          goal_camera: false,
          replay_camera: false
        }
      };
    }
  },

  // Arm Control
  postArmHit: async (): Promise<ApiResponse<ArmStatus>> => {
    const response = await fetch(`${BASE_URL}/arm/hit-ball`, {
      method: 'POST',
    });
    return response.json();
  },

  setArmPreset: async (presetNumber: number): Promise<ApiResponse<{ preset: number }>> => {
    const response = await fetch(`${BASE_URL}/arm/preset/${presetNumber}`, {
      method: 'POST',
    });
    return response.json();
  },

  setArmMode: async (auto: boolean): Promise<ApiResponse<ArmStatus>> => {
    const command = auto ? 'set-auto-mode' : 'set-manual-mode';

    const response = await fetch(`${BASE_URL}/arm/${command}`, {
      method: 'POST',
    });
    return response.json();
  },

  setArmRate100: async (): Promise<ApiResponse<ArmStatus>> => {
    const response = await fetch(`${BASE_URL}/arm/set-rate-100`, {
      method: 'POST',
    });
    return response.json();
  },

  setArmRateUp: async (): Promise<ApiResponse<ArmStatus>> => {
    const response = await fetch(`${BASE_URL}/arm/set-rate-up`, {
      method: 'POST',
    });
    return response.json();
  },

  setArmRateDown: async (): Promise<ApiResponse<ArmStatus>> => {
    const response = await fetch(`${BASE_URL}/arm/set-rate-down`, {
      method: 'POST',
    });
    return response.json();
  },

  sendArmCommand: async (command: string): Promise<ApiResponse<ArmStatus>> => {
    const response = await fetch(`${BASE_URL}/arm/send-text-command/${command}`, {
      method: 'POST',
    });
    return response.json();
  },

  // Catcher Control
  resetBall: async (): Promise<ApiResponse<{ ball_ready: boolean }>> => {
    const response = await fetch(`${BASE_URL}/catcher/reset`, {
      method: 'POST',
    });
    return response.json();
  },

  getCatcherStatus: async (): Promise<ApiResponse<CatcherStatus>> => {
    const response = await fetch(`${BASE_URL}/catcher/status`);
    return response.json();
  },

  postResetLastHitArea: async (): Promise<ApiResponse<{ last_hit_area: number }>> => {
    const response = await fetch(`${BASE_URL}/goal-camera/reset-last-hit-area`, {
      method: 'POST',
    });
    return response.json();
  },

  // Camera Control
  getGoalCameraStatus: async (): Promise<ApiResponse<CameraStatus>> => {
    const response = await fetch(`${BASE_URL}/goal-camera/status`);
    return response.json();
  },

  getReplayCameraStatus: async (): Promise<ApiResponse<CameraStatus>> => {
    const response = await fetch(`${BASE_URL}/replay-camera/status`);
    return response.json();
  },

  getGoalCameraResult: async (): Promise<ApiResponse<CameraResult>> => {
    const response = await fetch(`${BASE_URL}/goal-camera/result`);
    return response.json();
  },

  getGoalCameraResults: async (): Promise<ApiResponse<CameraResult[]>> => {
    const response = await fetch(`${BASE_URL}/goal-camera/results`);
    return response.json();
  },

  startReplayCameraRecording: async (): Promise<ApiResponse<{ is_recording: boolean }>> => {
    const response = await fetch(`${BASE_URL}/replay-camera/start-recording`, {
      method: 'POST',
    });
    return response.json();
  },

  stopReplayCameraRecording: async (): Promise<ApiResponse<{ is_recording: boolean }>> => {
    const response = await fetch(`${BASE_URL}/replay-camera/stop-recording`, {
      method: 'POST',
    });
    return response.json();
  },

  startReplayCameraAutoRecording: async (): Promise<ApiResponse<{ is_recording: boolean }>> => {
    const response = await fetch(`${BASE_URL}/replay-camera/start-auto-recording`, {
      method: 'POST',
    });
    return response.json();
  },

  getReplayCameraRecordingFilename: async (): Promise<ApiResponse<ReplayCameraRecordingFilename>> => {
    const response = await fetch(`${BASE_URL}/replay-camera/recording-filename`);
    return response.json();
  },
}; 