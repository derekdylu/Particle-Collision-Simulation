#!/usr/bin/env python3
"""
GoPro connection test script to troubleshoot camera connection issues.
This script helps identify the best configuration for connecting to GoPro Hero 13.
"""

import cv2
import time
import sys
import platform
from typing import List, Tuple

def test_gopro_connection():
    """Test different methods to connect to GoPro."""
    
    print("=== GoPro Connection Test ===")
    print(f"Platform: {platform.system()}")
    print()
    
    # Test 1: Try goprocam library
    print("1. Testing goprocam library...")
    try:
        from goprocam import GoProCamera
        print("   ✅ goprocam library available")
        
        try:
            gopro = GoProCamera.GoPro()
            info = gopro.info()
            print(f"   ✅ GoPro connected via goprocam: {info}")
            
            # Test live stream
            print("   Testing live stream...")
            gopro.livestream("start")
            time.sleep(2)
            gopro.livestream("stop")
            print("   ✅ Live stream test successful")
            
        except Exception as e:
            print(f"   ❌ GoPro connection failed: {str(e)}")
            
    except ImportError:
        print("   ❌ goprocam library not available")
    
    print()
    
    # Test 2: Try OpenCV with different backends
    print("2. Testing OpenCV backends...")
    
    backends = []
    if platform.system() == "Darwin":  # macOS
        backends = [
            (cv2.CAP_AVFOUNDATION, "AVFoundation"),
            (cv2.CAP_ANY, "Auto-detect")
        ]
    elif platform.system() == "Windows":
        backends = [
            (cv2.CAP_DSHOW, "DirectShow"),
            (cv2.CAP_MSMF, "MSMF"),
            (cv2.CAP_ANY, "Auto-detect")
        ]
    else:  # Linux
        backends = [
            (cv2.CAP_V4L2, "V4L2"),
            (cv2.CAP_ANY, "Auto-detect")
        ]
    
    working_configs = []
    
    for backend, backend_name in backends:
        print(f"   Testing backend: {backend_name}")
        for camera_index in range(5):
            print(f"     Camera index {camera_index}...")
            
            try:
                cap = cv2.VideoCapture(camera_index, backend)
                
                if not cap.isOpened():
                    print(f"       ❌ Failed to open")
                    continue
                
                # Try to read a frame
                ret, frame = cap.read()
                
                if ret and frame is not None and frame.size > 0:
                    width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
                    height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
                    fps = cap.get(cv2.CAP_PROP_FPS)
                    
                    print(f"       ✅ Working! {width:.0f}x{height:.0f} @ {fps:.1f}fps")
                    
                    # Test continuous frame capture
                    print(f"       Testing continuous capture...")
                    frame_count = 0
                    errors = 0
                    start_time = time.time()
                    
                    while time.time() - start_time < 3:  # Test for 3 seconds
                        try:
                            ret, frame = cap.read()
                            if ret and frame is not None and frame.size > 0:
                                frame_count += 1
                            else:
                                errors += 1
                            time.sleep(0.1)
                        except Exception as e:
                            errors += 1
                            print(f"         Error: {str(e)}")
                    
                    actual_fps = frame_count / 3
                    error_rate = errors / (frame_count + errors) * 100
                    
                    print(f"       Frames: {frame_count}, Errors: {errors}, FPS: {actual_fps:.1f}, Error rate: {error_rate:.1f}%")
                    
                    if error_rate < 10:  # Less than 10% error rate
                        working_configs.append({
                            'backend': backend_name,
                            'index': camera_index,
                            'width': width,
                            'height': height,
                            'fps': fps,
                            'actual_fps': actual_fps,
                            'error_rate': error_rate
                        })
                    
                cap.release()
                
            except Exception as e:
                print(f"       ❌ Error: {str(e)}")
                continue
    
    print()
    
    # Summary
    print("3. Summary:")
    if working_configs:
        print("   ✅ Working configurations found:")
        for i, config in enumerate(working_configs, 1):
            print(f"   {i}. Backend: {config['backend']}, Index: {config['index']}")
            print(f"      Resolution: {config['width']:.0f}x{config['height']:.0f}")
            print(f"      FPS: {config['fps']:.1f} (actual: {config['actual_fps']:.1f})")
            print(f"      Error rate: {config['error_rate']:.1f}%")
            print()
    else:
        print("   ❌ No working configurations found")
        print("   Recommendations:")
        print("   - Make sure GoPro is connected and in USB mode")
        print("   - Try different USB cables")
        print("   - Check if GoPro appears in system camera list")
        print("   - Try restarting the GoPro")
        print("   - On macOS, check Privacy settings for camera access")

def test_specific_config(backend_name: str, camera_index: int):
    """Test a specific camera configuration."""
    print(f"Testing {backend_name} backend with camera index {camera_index}...")
    
    # Map backend names to OpenCV constants
    backend_map = {
        "AVFoundation": cv2.CAP_AVFOUNDATION,
        "DirectShow": cv2.CAP_DSHOW,
        "MSMF": cv2.CAP_MSMF,
        "V4L2": cv2.CAP_V4L2,
        "Auto-detect": cv2.CAP_ANY
    }
    
    backend = backend_map.get(backend_name, cv2.CAP_ANY)
    
    try:
        cap = cv2.VideoCapture(camera_index, backend)
        
        if not cap.isOpened():
            print("❌ Failed to open camera")
            return False
        
        # Test for 10 seconds
        start_time = time.time()
        frame_count = 0
        errors = 0
        
        while time.time() - start_time < 10:
            try:
                ret, frame = cap.read()
                if ret and frame is not None and frame.size > 0:
                    frame_count += 1
                else:
                    errors += 1
                time.sleep(0.1)
            except Exception as e:
                errors += 1
                print(f"Error: {str(e)}")
        
        cap.release()
        
        total_time = time.time() - start_time
        actual_fps = frame_count / total_time
        error_rate = errors / (frame_count + errors) * 100
        
        print(f"✅ Test completed!")
        print(f"   Frames captured: {frame_count}")
        print(f"   Errors: {errors}")
        print(f"   Actual FPS: {actual_fps:.1f}")
        print(f"   Error rate: {error_rate:.1f}%")
        
        return error_rate < 10
        
    except Exception as e:
        print(f"❌ Error during test: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 2:
        # Test specific configuration
        backend_name = sys.argv[1]
        camera_index = int(sys.argv[2])
        test_specific_config(backend_name, camera_index)
    else:
        # Run full test
        test_gopro_connection() 