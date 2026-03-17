# Smart Cart - YOLO-World Demo

A zero-shot object detection cart system for macOS using your MacBook's webcam. No training data required!

## How It Works

- **Detection**: Uses YOLO-World (yolov8s-world.pt) to detect 4 everyday items without any training
- **Tracking**: Tracks items as they move across the camera view
- **TOP → BOTTOM movement**: Adds item to cart (+1)
- **BOTTOM → TOP movement**: Removes item from cart (-1)

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

Or directly:
```bash
pip install opencv-python ultralytics
```

### 2. Run the Demo

```bash
python smart_cart.py
```

### 3. Controls

- **Move item down** (top to bottom): Add to cart
- **Move item up** (bottom to top): Remove from cart
- Press **'q'** to quit

## Customization

Edit the top of `smart_cart.py` to change:

```python
# Change these to detect different items
ITEMS_TO_DETECT = [
    "bottle",
    "laptop",
    "book",
    "cup"
]

# Adjust sensitivity (higher = less sensitive)
MOVEMENT_THRESHOLD = 80  # pixels

# Adjust tracking smoothness
HISTORY_SIZE = 15  # frames
```

### Available Items

YOLO-World can detect thousands of everyday objects. Some examples:
- `bottle`, `cup`, `book`, `laptop`, `phone`, `wallet`
- `keys`, `mouse`, `keyboard`, `headphones`, `glasses`
- `banana`, `apple`, `orange`, `sandwich`, `chair`

Just replace the items in `ITEMS_TO_DETECT` list!

## Troubleshooting

**Webcam not opening?**
- Check System Preferences → Security & Privacy → Camera
- Ensure no other app is using the camera
- Try changing `WEBCAM_INDEX = 0` to `1` in the script

**Model download issues?**
- The yolov8s-world.pt model (~30MB) auto-downloads on first run
- Ensure you have an internet connection for the first launch

**Detection not working well?**
- Ensure good lighting
- Hold items clearly in front of the camera
- Try adjusting `MOVEMENT_THRESHOLD` if it's too sensitive or not sensitive enough

## System Requirements

- macOS with webcam
- Python 3.8+
- ~500MB disk space (for model and dependencies)
