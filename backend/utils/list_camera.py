import cv2

def list_available_cameras(max_index=10):
    for i in range(max_index):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            print(f"Camera index {i} is available")
            cap.release()

list_available_cameras()
