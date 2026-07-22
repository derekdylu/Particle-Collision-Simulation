#!/usr/bin/env python3
"""
Camera diagnostic script to test different OpenCV backends and camera indices.
This script helps identify which camera configuration works best on your system.
"""

import cv2
import time
import sys

def test_camera_backends():
    """Test different OpenCV backends and camera indices."""
    
    # OpenCV backends to test
    backends = [
        (cv2.CAP_DSHOW, "DirectShow"),
        (cv2.CAP_MSMF, "MSMF"),
        (cv2.CAP_ANY, "Auto-detect")
    ]
    
    print("=== Camera Diagnostic Tool ===")
    print("Testing different OpenCV backends and camera indices...")
    print()
    
    working_configs = []
    
    for backend, backend_name in backends:
        print(f"Testing backend: {backend_name}")
        print("-" * 40)
        
        for camera_index in range(5):  # Test first 5 camera indices
            print(f"  Testing camera index {camera_index}...")
            
            try:
                # Try to open camera
                cap = cv2.VideoCapture(camera_index, backend)
                
                if not cap.isOpened():
                    print(f"    ❌ Failed to open camera {camera_index}")
                    continue
                
                # Try to read a frame
                ret, frame = cap.read()
                
                if ret and frame is not None and frame.size > 0:
                    # Get camera properties
                    width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
                    height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
                    fps = cap.get(cv2.CAP_PROP_FPS)
                    
                    print(f"    ✅ Camera {camera_index} working!")
                    print(f"       Resolution: {width:.0f}x{height:.0f}")
                    print(f"       FPS: {fps:.1f}")
                    
                    working_configs.append({
                        'backend': backend_name,
                        'index': camera_index,
                        'width': width,
                        'height': height,
                        'fps': fps
                    })
                    
                    # Test frame capture for a few seconds
                    print(f"       Testing frame capture for 3 seconds...")
                    start_time = time.time()
                    frame_count = 0
                    
                    while time.time() - start_time < 3:
                        ret, frame = cap.read()
                        if ret:
                            frame_count += 1
                        time.sleep(0.1)
                    
                    actual_fps = frame_count / 3
                    print(f"       Actual FPS: {actual_fps:.1f}")
                    
                else:
                    print(f"    ❌ Camera {camera_index} opened but can't read frames")
                
                cap.release()
                
            except Exception as e:
                print(f"    ❌ Error with camera {camera_index}: {str(e)}")
            
            time.sleep(0.5)  # Wait between tests
        
        print()
    
    # Summary
    print("=== SUMMARY ===")
    if working_configs:
        print(f"Found {len(working_configs)} working camera configurations:")
        for i, config in enumerate(working_configs, 1):
            print(f"{i}. Backend: {config['backend']}, Index: {config['index']}")
            print(f"   Resolution: {config['width']:.0f}x{config['height']:.0f}, FPS: {config['fps']:.1f}")
        
        # Recommend the best configuration
        best_config = max(working_configs, key=lambda x: x['width'] * x['height'])
        print(f"\nRecommended configuration:")
        print(f"Backend: {best_config['backend']}")
        print(f"Camera Index: {best_config['index']}")
        print(f"Resolution: {best_config['width']:.0f}x{best_config['height']:.0f}")
        
    else:
        print("❌ No working camera configurations found!")
        print("\nTroubleshooting tips:")
        print("1. Make sure your camera is connected and not being used by another application")
        print("2. Try updating your camera drivers")
        print("3. Check if your camera works in other applications (like Camera app)")
        print("4. Try running this script as administrator")
        print("5. If using a USB camera, try a different USB port")

def test_specific_config(backend, camera_index):
    """Test a specific camera configuration."""
    print(f"Testing camera index {camera_index} with backend {backend}...")
    
    try:
        cap = cv2.VideoCapture(camera_index, backend)
        
        if not cap.isOpened():
            print("❌ Failed to open camera")
            return False
        
        # Try to read frames for 5 seconds
        start_time = time.time()
        frame_count = 0
        errors = 0
        
        while time.time() - start_time < 5:
            try:
                ret, frame = cap.read()
                if ret and frame is not None and frame.size > 0:
                    frame_count += 1
                else:
                    errors += 1
                time.sleep(0.1)
            except Exception as e:
                errors += 1
                print(f"Error reading frame: {str(e)}")
        
        cap.release()
        
        total_time = time.time() - start_time
        actual_fps = frame_count / total_time
        error_rate = errors / (frame_count + errors) * 100
        
        print(f"✅ Test completed!")
        print(f"   Frames captured: {frame_count}")
        print(f"   Errors: {errors}")
        print(f"   Actual FPS: {actual_fps:.1f}")
        print(f"   Error rate: {error_rate:.1f}%")
        
        return error_rate < 10  # Consider successful if error rate < 10%
        
    except Exception as e:
        print(f"❌ Error during test: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 2:
        # Test specific configuration
        backend_name = sys.argv[1]
        camera_index = int(sys.argv[2])
        
        backend_map = {
            'dshow': cv2.CAP_DSHOW,
            'msmf': cv2.CAP_MSMF,
            'any': cv2.CAP_ANY
        }
        
        if backend_name in backend_map:
            test_specific_config(backend_map[backend_name], camera_index)
        else:
            print(f"Unknown backend: {backend_name}")
            print("Available backends: dshow, msmf, any")
    else:
        # Run full diagnostic
        test_camera_backends() 