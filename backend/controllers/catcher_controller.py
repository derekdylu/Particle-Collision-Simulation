import time
import serial
import asyncio
from typing import Optional
from utils.logging_config import catcher_logger as logger

port = "COM8"

class CatcherController:
    def __init__(self, port: str = port, baud_rate: int = 9600, lazy_init: bool = False):
        """
        Initialize the catcher controller.

        Args:
            port (str): Serial port for Arduino communication
                        - Windows: Use 'COMx' (e.g., 'COM3')
                        - Linux: Use '/dev/ttyUSBx' or '/dev/ttyACMx'
            baud_rate (int): Baud rate for serial communication
            lazy_init (bool): If True, don't connect immediately
        """
        self.port = port
        self.baud_rate = baud_rate
        self.is_connected = False
        self.ball_ready = False
        self.serial = None
        self.reset_pin = 12  # Digital pin for reset signal
        self.ready_pin = 'A0'  # Analog pin for ball readiness
        
        if not lazy_init:
            asyncio.create_task(self.connect())

    async def connect(self) -> bool:
        """
        Connect to the Arduino catcher.

        Returns:
            bool: True if connection successful, False otherwise
        """
        try:
            self.serial = serial.Serial(self.port, self.baud_rate)
            await asyncio.sleep(2)  # Wait for Arduino to reset
            self.is_connected = True
            logger.info(f"Connected to Arduino catcher on port {self.port}")
            return True
        except Exception as e:
            logger.error(f"Connection failed: {e}")
            return False

    def disconnect(self) -> None:
        """Disconnect from the Arduino catcher."""
        if self.is_connected and self.serial:
            self.serial.close()
            self.is_connected = False
            logger.info("Disconnected from Arduino catcher")

    def reset_ball(self) -> bool:
        """
        Reset the ball to its initial position by sending a high voltage signal
        for 1 second to the reset pin.

        Returns:
            bool: True if reset successful, False otherwise
        """
        if not self.is_connected:
            logger.warning("Cannot reset ball: Not connected to Arduino")
            return False

        try:
            # Send command to set pin high
            command = f"ON\n"
            self.serial.write(command.encode())
            time.sleep(1)  # Keep high for 1 second

            # Send command to set pin low
            # command = f"digitalWrite({self.reset_pin}, LOW)\n"
            # self.serial.write(command.encode())

            logger.info("Ball reset command sent successfully")
            return True
        except Exception as e:
            logger.error(f"Reset ball failed: {e}")
            return False

    def is_ball_ready(self) -> bool:
        """
        Check if the ball is ready by sending a BALL command and reading the response.
        Returns True if the ball is ready.

        Returns:
            bool: True if ball is ready, False otherwise
        """
        if not self.is_connected:
            logger.warning("Cannot check ball ready: Not connected to Arduino")
            return False

        try:
            # Send simple BALL command
            self.serial.write(b'BALL\n')
            time.sleep(0.5)  # Give Arduino time to process

            # Read and process response
            response = self.serial.readline().decode().strip()
            if not response:
                logger.warning("No response received when checking ball ready")
                return False

            # Update ball ready state based on response
            self.ball_ready = response.upper() == 'LOW'
            logger.debug(f"Ball ready check - Response: {response}, Ready: {self.ball_ready}")
            return self.ball_ready
        except Exception as e:
            logger.error(f"Check ball ready failed: {e}")
            return False

    async def check_connection(self) -> bool:
        """
        Check if the Arduino is actually connected by attempting to read from the serial port.
        This is an async function to support the server's async operations.

        Returns:
            bool: True if Arduino is connected and responsive, False otherwise
        """
        if not self.is_connected or not self.serial:
            logger.warning("Cannot check connection: Not connected to Arduino")
            return False

        try:
            # Send a simple command to check connection
            self.serial.write(b"PING\n")
            response = await self._wait_for_response_async()
            is_connected = response == "PONG"
            if is_connected:
                logger.debug("Arduino connection check successful")
            else:
                logger.warning("Arduino connection check failed")
            return is_connected
        except Exception as e:
            logger.error(f"Connection check failed: {e}")
            self.is_connected = False
            return False

    async def _wait_for_response_async(self, timeout: float = 1.0) -> Optional[str]:
        """
        Async version of wait for response from Arduino.

        Args:
            timeout (float): Timeout in seconds

        Returns:
            Optional[str]: Response from Arduino or None if timeout
        """
        start_time = time.time()
        while time.time() - start_time < timeout:
            if self.serial.in_waiting:
                response = self.serial.readline().decode().strip()
                logger.debug(f"Received response: {response}")
                return response
            await asyncio.sleep(0.01)
        logger.warning(f"No response received within {timeout} seconds")
        return None

    def _wait_for_response(self, timeout: float = 1.0) -> Optional[str]:
        """
        Synchronous version of wait for response from Arduino.
        Kept for backward compatibility with non-async methods.

        Args:
            timeout (float): Timeout in seconds

        Returns:
            Optional[str]: Response from Arduino or None if timeout
        """
        start_time = time.time()
        while time.time() - start_time < timeout:
            if self.serial.in_waiting:
                response = self.serial.readline().decode().strip()
                logger.debug(f"Received response: {response}")
                return response
            time.sleep(0.01)
        logger.warning(f"No response received within {timeout} seconds")
        return None
