#!/usr/bin/env python3
# arm_controller.py
# Controls the robotic arm for baseball simulation via TCP connection to localhost
# This controller connects to a TCP server running on the same computer (localhost)

import asyncio
import logging
from utils.logging_config import arm_logger as logger


class ArmController:
    """Controller for the robotic arm that communicates with a local TCP server.
    
    This class establishes a TCP connection to a server running on the same computer
    (localhost) to control the robotic arm movements. The server should be running
    on the specified port before attempting to connect.
    """
    
    PRESETS = {
        0: "position 0",
        1: "position 1",
        2: "position 2",
        3: "position 3",
        4: "position 4",
        5: "position 5",
        6: "position 6",
        7: "position 7",
    }

    def __init__(self, host="127.0.0.1", port=12345, lazy_init=False):
        """Initialize the arm controller
        
        Args:
            host (str): Host address of the arm control server (default: localhost/127.0.0.1)
            port (int): Port number of the arm control server (default: 12345)
            lazy_init (bool): If True, don't connect immediately to the TCP server
        """
        logger.info("Initializing arm controller")
        self.host = host
        self.port = port
        self.reader = None
        self.writer = None
        self.is_moving = False
        self.is_connected = False
        if not lazy_init:
            asyncio.create_task(self.connect())

    async def connect(self):
        """Establish TCP connection to the local arm control server"""
        try:
            self.reader, self.writer = await asyncio.open_connection(self.host, self.port)
            self.is_connected = True
            logger.info(f"Connected to local arm control server at {self.host}:{self.port}")
        except Exception as e:
            logger.error(f"Failed to connect to local arm control server: {e}")
            raise

    async def hit_ball(self):
        """Hit the ball"""
        await self._send_command("HIT")

    async def set_auto_mode(self):
        """Set the arm to auto mode"""
        await self._send_command("AUTO")

    async def set_manual_mode(self):
        """Set the arm to manual mode"""
        await self._send_command("JOG")
    
    async def set_rate_100(self):
        """Set the arm to 100% rate"""
        await self._send_command("RATE100")
    
    async def set_rate_up(self):
        """Set the arm to 100% rate"""
        await self._send_command("RATEUP")
    
    async def set_rate_down(self):
        """Set the arm to 100% rate"""
        await self._send_command("RATEDOWN")

    async def send_text_command(self, command):
        """Send text command to the local arm control server"""
        await self._send_command(command)
            
    async def _send_command(self, command):
        """Send command to the local arm control server via TCP and get response"""
        if not self.is_connected:
            await self.connect()
            
        try:
            self.writer.write(f"{command}\n".encode())
            await self.writer.drain()

            response_lines = []
            while True:
                line = await self.reader.readline()
                if not line:
                    logger.error("Connection closed by server")
                    raise ConnectionError("Connection closed by server")
                line = line.decode().strip()
                if line == "<END>":
                    break
                response_lines.append(line)

            return response_lines
        except Exception as e:
            logger.error(f"Error in communication: {e}")
            self.is_connected = False
            raise

    async def _move_to_preset(self, preset_num):
        """Move arm to a preset position"""
        preset_name = self.PRESETS[preset_num]
        logger.info(f"Moving to preset position {preset_num} ({preset_name})")
        self.is_moving = True
        try:
            response = await self._send_command(f"{preset_num}")
            logger.info(f"Arm response: {response}")
        except Exception as e:
            logger.error(f"Failed to move to preset {preset_num}: {e}")
        finally:
            self.is_moving = False

    async def preset0(self):
        """Move arm to preset position 0"""
        await self._move_to_preset(0)

    async def preset1(self):
        """Move arm to preset position 1"""
        await self._move_to_preset(1)

    async def preset2(self):
        """Move arm to preset position 2"""
        await self._move_to_preset(2)

    async def preset3(self):
        """Move arm to preset position 3"""
        await self._move_to_preset(3)

    async def preset4(self):
        """Move arm to preset position 4"""
        await self._move_to_preset(4)

    async def preset5(self):
        """Move arm to preset position 5"""
        await self._move_to_preset(5)

    async def preset6(self):
        """Move arm to preset position 6"""
        await self._move_to_preset(6)

    async def preset7(self):
        """Move arm to preset position 7"""
        await self._move_to_preset(7)

    async def check_connection(self) -> bool:
        """Check if the arm is connected and responsive.
        
        Returns:
            bool: True if arm is connected and responsive, False otherwise
        """            
        try:
            logger.info("Sending ping to arm control server")
            response = await self._send_command("read")
            return len(response) > 0
        except Exception as e:
            logger.error(f"Connection check failed: {e}")
            return False

    async def disconnect(self):
        """Close the connection to the arm control server"""
        if self.writer:
            try:
                self.writer.close()
                await self.writer.wait_closed()
                self.is_connected = False
                logger.info("Connection closed")
            except Exception as e:
                logger.error(f"Error closing connection: {e}")

    def __del__(self):
        """Cleanup when the object is destroyed"""
        if self.writer:
            try:
                asyncio.create_task(self.disconnect())
            except Exception as e:
                logger.error(f"Error in cleanup: {e}")
