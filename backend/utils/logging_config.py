import logging
from typing import Optional


class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors for different components and log levels"""

    # Component colors
    SERVER_COLOR = "\x1b[35;20m"  # Magenta
    ARM_COLOR = "\x1b[36;20m"  # Cyan
    GOAL_CAMERA_COLOR = "\x1b[32;20m"  # Green
    REPLAY_CAMERA_COLOR = "\x1b[34;20m"  # Blue
    CATCHER_COLOR = "\x1b[33;20m"  # Yellow
    DEFAULT_COLOR = "\x1b[37;20m"  # White

    # Log level colors
    DEBUG_COLOR = "\x1b[38;20m"  # Grey
    INFO_COLOR = "\x1b[37;20m"  # White
    WARNING_COLOR = "\x1b[33;20m"  # Yellow
    ERROR_COLOR = "\x1b[31;20m"  # Red
    CRITICAL_COLOR = "\x1b[31;1m"  # Bold Red
    RESET = "\x1b[0m"

    def __init__(self):
        super().__init__()
        self.component_colors = {
            "server": self.SERVER_COLOR,
            "arm": self.ARM_COLOR,
            "goal_camera": self.GOAL_CAMERA_COLOR,
            "replay_camera": self.REPLAY_CAMERA_COLOR,
            "catcher": self.CATCHER_COLOR,
        }

        self.level_colors = {
            logging.DEBUG: self.DEBUG_COLOR,
            logging.INFO: self.INFO_COLOR,
            logging.WARNING: self.WARNING_COLOR,
            logging.ERROR: self.ERROR_COLOR,
            logging.CRITICAL: self.CRITICAL_COLOR,
        }

    def format(self, record):
        # Get component color based on logger name
        component = record.name.split(".")[-1].lower()
        component_color = self.component_colors.get(component, self.DEFAULT_COLOR)

        # Get level color
        level_color = self.level_colors.get(record.levelno, self.RESET)

        # Create format string with colors
        fmt = f"{component_color}[%(name)s]{self.RESET} {level_color}[%(levelname)s]{self.RESET} - %(asctime)s - %(message)s"

        formatter = logging.Formatter(fmt)
        return formatter.format(record)


def setup_logger(name: str, level: int = logging.DEBUG) -> logging.Logger:
    """Setup a logger for a specific component

    Args:
        name: Component name (server, arm, goal_camera, replay_camera, catcher)
        level: Logging level

    Returns:
        logging.Logger: Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Remove existing handlers to avoid duplicates
    logger.handlers = []

    # Create console handler with custom formatter
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(ColoredFormatter())
    logger.addHandler(console_handler)

    return logger


# Create default loggers for each component
server_logger = setup_logger("server")
arm_logger = setup_logger("arm")
goal_camera_logger = setup_logger("goal_camera")
replay_camera_logger = setup_logger("replay_camera")
catcher_logger = setup_logger("catcher")
