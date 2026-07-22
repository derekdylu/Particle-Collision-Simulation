# Particle Collision Simulation backend

This FastAPI service coordinates the original lab's CNC arm bridge, Arduino catcher, goal camera, and replay camera.

> Warning: this is an unchanged local hardware-control snapshot. Importing and starting the app initializes devices, clears the replay recording folder, and sends startup commands to the arm. Run it only with the original equipment, emergency-stop procedure, and isolated lab network.

## Requirements

- Python 3.10 or newer
- The cameras and serial devices expected by the source configuration
- The local C# arm bridge when arm control is used

## Installation

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

On the configured lab machine:

```bash
uvicorn server:app --reload
```

Uvicorn defaults to loopback for this command. Running `python server.py` uses the original all-interface binding and must not be used on an untrusted network.

## API summary

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/test` | Backend and device connection status |
| `POST` | `/arm/preset/{preset_number}` | Move the arm to preset 1-7 |
| `POST` | `/arm/set-auto-mode` | Select automatic mode |
| `POST` | `/arm/set-manual-mode` | Select manual mode |
| `POST` | `/arm/set-rate-100` | Set the arm rate |
| `POST` | `/arm/set-rate-up` | Increase the arm rate |
| `POST` | `/arm/set-rate-down` | Decrease the arm rate |
| `POST` | `/arm/send-text-command/{command}` | Send a raw arm command |
| `POST` | `/arm/hit-ball` | Trigger the batting action |
| `POST` | `/catcher/reset` | Reset the catcher |
| `GET` | `/catcher/status` | Read catcher state |
| `GET` | `/goal-camera/status` | Read goal-camera state |
| `GET` | `/goal-camera/result` | Read the latest detected target |
| `GET` | `/goal-camera/results` | Read detection history |
| `POST` | `/goal-camera/reset-last-hit-area` | Reset the latest detection |
| `GET` | `/replay-camera/status` | Read replay-camera state |
| `GET` | `/replay-camera/recording-filename` | Read the current recording name |
| `POST` | `/replay-camera/start-recording` | Start recording |
| `POST` | `/replay-camera/stop-recording` | Stop recording |
| `POST` | `/replay-camera/start-auto-recording` | Capture a timed replay |

## Security boundary

The API has no authentication and includes raw physical-control operations. It is for the original isolated local environment only, not public deployment. Camera recordings under `backend/recordings/` are ignored by Git.

## Static checks

This syntax check does not contact hardware:

```bash
python -m compileall .
```

The unchanged legacy source is not currently Black- or Flake8-clean; the publication snapshot intentionally preserves its formatting.
