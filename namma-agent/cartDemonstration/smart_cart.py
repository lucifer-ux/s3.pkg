#!/usr/bin/env python3
"""
Smart Cart Webcam Demonstration
================================
A zero-shot object detection cart system using YOLO-World.
No training data required - works out of the box!

Requirements:
    pip install opencv-python ultralytics

How it works:
    1. Detects 4 predefined items using YOLO-World zero-shot model
    2. Tracks items as they move across the screen
    3. TOP-TO-BOTTOM movement: Adds item to cart (+1)
    4. BOTTOM-TO-TOP movement: Removes item from cart (-1)
    5. Visual overlay shows current cart status

Controls:
    'q' - Quit the application

Author: AI Assistant
"""

import cv2
from ultralytics import YOLO
from collections import defaultdict, deque
import os

# ============================================================================
# CONFIGURATION - EDIT THESE VALUES AS NEEDED
# ============================================================================

# The 4 items you want to detect (easily editable)
# These are everyday items that YOLO-World can detect without training
ITEMS_TO_DETECT = [
    "bottle",      # Item 1: Water bottle, soda bottle, etc.
    "laptop",      # Item 2: Laptop computer
]

# Prices for each item (in your currency)
ITEM_PRICES = {
    "bottle": 2.50,    # $2.50 per bottle
    "laptop": 999.00   # $999.00 per laptop
}

# Detection confidence threshold (0.0 to 1.0)
# Higher = more strict (fewer false positives)
# Lower = more permissive (catches more objects)
CONFIDENCE_THRESHOLD = 0.3

# Zone-based detection settings
TOP_ZONE_PERCENT = 30      # Top 30% of screen = "UP" zone
BOTTOM_ZONE_PERCENT = 70   # Bottom 30% of screen = "DOWN" zone
# Middle 40% is the neutral zone (no actions triggered)

# Minimum frames an object must be in a zone before state change
ZONE_CONFIRM_FRAMES = 3

# Webcam settings
WEBCAM_INDEX = 0  # 0 = default Mac webcam
FRAME_WIDTH = 1280  # pixels
FRAME_HEIGHT = 720  # pixels

# Display settings
FONT = cv2.FONT_HERSHEY_SIMPLEX
FONT_SCALE = 0.7
FONT_COLOR = (255, 255, 255)  # White
HIGHLIGHT_COLOR = (0, 255, 0)  # Green (for add)
REMOVE_COLOR = (0, 0, 255)     # Red (for remove)
CART_BG_COLOR = (50, 50, 50)   # Dark gray background for cart panel

# ============================================================================
# SMART CART CLASS
# ============================================================================

class SmartCart:
    def __init__(self, frame_height):
        # Cart state: tracks quantity of each item
        self.cart = {item: 0 for item in ITEMS_TO_DETECT}

        # Item prices
        self.prices = ITEM_PRICES

        # Frame height for zone calculations
        self.frame_height = frame_height

        # Zone boundaries (calculated from percentages)
        self.top_zone_max = int(frame_height * TOP_ZONE_PERCENT / 100)
        self.bottom_zone_min = int(frame_height * BOTTOM_ZONE_PERCENT / 100)

        # Track state machine for each object
        # Format: {track_id: {
        #     'class_name': str,
        #     'state': 'UP' | 'DOWN' | 'NEUTRAL',
        #     'zone_frames': int,  # frames in current zone
        #     'last_action_frame': int
        # }}
        self.track_states = {}

        # Count of items added/removed (for statistics)
        self.added_count = 0
        self.removed_count = 0
        self.frame_count = 0

    def get_total_value(self):
        """Calculate total cart value."""
        total = 0.0
        for item, quantity in self.cart.items():
            total += quantity * self.prices.get(item, 0)
        return total

    def get_zone(self, y_center):
        """
        Determine which zone an object is in based on Y position.
        Y=0 is top, Y=frame_height is bottom.
        """
        if y_center < self.top_zone_max:
            return 'UP'      # Top zone
        elif y_center > self.bottom_zone_min:
            return 'DOWN'    # Bottom zone
        else:
            return 'NEUTRAL' # Middle zone (no action)

    def update_position(self, track_id, class_name, y_center, confidence):
        """
        Update position using zone-based state machine.
        Returns: action ('ADD', 'REMOVE', or None)
        """
        self.frame_count += 1

        # Skip low confidence detections
        if confidence < CONFIDENCE_THRESHOLD:
            return None

        # Initialize track state if new
        if track_id not in self.track_states:
            current_zone = self.get_zone(y_center)
            self.track_states[track_id] = {
                'class_name': class_name,
                'state': current_zone,
                'zone_frames': 1,
                'last_action_frame': 0
            }
            return None

        track = self.track_states[track_id]
        current_zone = self.get_zone(y_center)

        # Check for state transition
        action = None

        if current_zone == track['state']:
            # Still in same zone, increment counter
            track['zone_frames'] += 1
        else:
            # Zone changed - check if confirmed
            if track['zone_frames'] >= ZONE_CONFIRM_FRAMES:
                # Valid transition detected
                old_state = track['state']

                # TOP -> BOTTOM: ADD to cart
                if old_state == 'UP' and current_zone == 'DOWN':
                    # Must pass through NEUTRAL to be valid
                    action = None  # Wait for proper transition

                # BOTTOM -> TOP: REMOVE from cart
                elif old_state == 'DOWN' and current_zone == 'UP':
                    # Must pass through NEUTRAL to be valid
                    action = None  # Wait for proper transition

                # UP -> NEUTRAL: ready for DOWN
                elif old_state == 'UP' and current_zone == 'NEUTRAL':
                    pass  # Normal intermediate state

                # DOWN -> NEUTRAL: ready for UP
                elif old_state == 'DOWN' and current_zone == 'NEUTRAL':
                    pass  # Normal intermediate state

                # NEUTRAL -> DOWN: ADD action!
                elif old_state == 'NEUTRAL' and current_zone == 'DOWN':
                    # Check cooldown to prevent double-counting
                    frames_since_last = self.frame_count - track['last_action_frame']
                    if frames_since_last > 30:  # ~1 second cooldown at 30fps
                        action = 'ADD'
                        track['last_action_frame'] = self.frame_count
                        print(f"  [Transition: NEUTRAL -> DOWN (via UP)]")

                # NEUTRAL -> UP: REMOVE action!
                elif old_state == 'NEUTRAL' and current_zone == 'UP':
                    frames_since_last = self.frame_count - track['last_action_frame']
                    if frames_since_last > 30:
                        action = 'REMOVE'
                        track['last_action_frame'] = self.frame_count
                        print(f"  [Transition: NEUTRAL -> UP (via DOWN)]")

            # Reset zone frame counter for new zone
            track['zone_frames'] = 1
            track['state'] = current_zone

        # Update class name (in case it changed due to reclassification)
        track['class_name'] = class_name

        return action

    def cleanup_inactive_tracks(self, active_track_ids):
        """
        Remove state for tracks that are no longer visible.
        """
        inactive_ids = set(self.track_states.keys()) - active_track_ids
        for track_id in inactive_ids:
            del self.track_states[track_id]

    def get_track_info(self, track_id):
        """Get current state info for a track."""
        if track_id in self.track_states:
            return self.track_states[track_id]
        return None

    def add_item(self, item_name):
        """Add an item to the cart."""
        if item_name in self.cart:
            self.cart[item_name] += 1
            self.added_count += 1
            price = self.prices.get(item_name, 0)
            item_total = self.cart[item_name] * price
            print(f"✓✓✓ ADDED: {item_name} @ ${price:.2f} = ${item_total:.2f} ✓✓✓")
            return True
        return False

    def remove_item(self, item_name):
        """Remove an item from the cart (minimum 0)."""
        if item_name in self.cart:
            if self.cart[item_name] > 0:
                self.cart[item_name] -= 1
                self.removed_count += 1
                price = self.prices.get(item_name, 0)
                item_total = self.cart[item_name] * price
                print(f"✗✗✗ REMOVED: {item_name} @ ${price:.2f} = ${item_total:.2f} ✗✗✗")
                return True
            else:
                print(f"⚠ Cannot remove {item_name}: cart is already empty")
        return False


# ============================================================================
# MAIN APPLICATION
# ============================================================================

def draw_cart_overlay(frame, cart, prices, total_value, added_count, removed_count):
    """
    Draw the cart status overlay on the left side of the frame.
    """
    # Cart panel dimensions - wider to accommodate prices
    panel_width = 320
    panel_height = 240
    panel_x = 10
    panel_y = 10

    # Draw semi-transparent background
    overlay = frame.copy()
    cv2.rectangle(overlay,
                  (panel_x, panel_y),
                  (panel_x + panel_width, panel_y + panel_height),
                  CART_BG_COLOR, -1)
    cv2.addWeighted(overlay, 0.8, frame, 0.2, 0, frame)

    # Draw border
    cv2.rectangle(frame,
                  (panel_x, panel_y),
                  (panel_x + panel_width, panel_y + panel_height),
                  (200, 200, 200), 2)

    # Title
    cv2.putText(frame, "VIRTUAL CART",
                (panel_x + 10, panel_y + 30),
                FONT, 0.9, (0, 255, 255), 2)

    # Header row
    cv2.putText(frame, "Item",
                (panel_x + 15, panel_y + 55),
                FONT, 0.5, (180, 180, 180), 1)
    cv2.putText(frame, "Price",
                (panel_x + 120, panel_y + 55),
                FONT, 0.5, (180, 180, 180), 1)
    cv2.putText(frame, "Qty",
                (panel_x + 200, panel_y + 55),
                FONT, 0.5, (180, 180, 180), 1)
    cv2.putText(frame, "Total",
                (panel_x + 250, panel_y + 55),
                FONT, 0.5, (180, 180, 180), 1)

    # Draw each item in cart
    line_height = 28
    y_offset = panel_y + 80

    for item_name, quantity in cart.items():
        price = prices.get(item_name, 0)
        item_total = quantity * price

        # Item name (capitalized)
        display_name = item_name.capitalize()
        cv2.putText(frame, f"{display_name}",
                    (panel_x + 15, y_offset),
                    FONT, FONT_SCALE, FONT_COLOR, 1)

        # Price
        cv2.putText(frame, f"${price:.2f}",
                    (panel_x + 115, y_offset),
                    FONT, 0.6, (200, 200, 200), 1)

        # Quantity with color coding
        qty_color = HIGHLIGHT_COLOR if quantity > 0 else (150, 150, 150)
        cv2.putText(frame, str(quantity),
                    (panel_x + 205, y_offset),
                    FONT, FONT_SCALE, qty_color, 2)

        # Item total
        if quantity > 0:
            cv2.putText(frame, f"${item_total:.2f}",
                        (panel_x + 245, y_offset),
                        FONT, 0.6, (0, 255, 100), 1)

        y_offset += line_height

    # Draw separator line
    cv2.line(frame,
             (panel_x + 10, y_offset - 5),
             (panel_x + panel_width - 10, y_offset - 5),
             (150, 150, 150), 1)

    # Grand Total (highlighted)
    total_y = y_offset + 25
    cv2.putText(frame, "GRAND TOTAL:",
                (panel_x + 15, total_y),
                FONT, 0.7, (255, 255, 255), 2)
    cv2.putText(frame, f"${total_value:.2f}",
                (panel_x + 200, total_y),
                FONT, 0.8, (0, 255, 0), 2)

    # Statistics at bottom
    cv2.putText(frame, f"Added: {added_count} | Removed: {removed_count}",
                (panel_x + 15, total_y + 25),
                FONT, 0.5, (150, 150, 150), 1)

    return frame


def draw_zone_overlay(frame, top_zone_max, bottom_zone_min):
    """
    Draw zone lines and labels on the frame.
    """
    h, w = frame.shape[:2]

    # Top zone (UP) - semi-transparent red
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, top_zone_max), (0, 0, 255), -1)
    cv2.addWeighted(overlay, 0.15, frame, 0.85, 0, frame)
    cv2.line(frame, (0, top_zone_max), (w, top_zone_max), (0, 0, 200), 2)
    cv2.putText(frame, "UP ZONE (Remove)", (10, top_zone_max - 10),
                FONT, 0.6, (200, 200, 255), 2)

    # Bottom zone (DOWN) - semi-transparent green
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, bottom_zone_min), (w, h), (0, 255, 0), -1)
    cv2.addWeighted(overlay, 0.15, frame, 0.85, 0, frame)
    cv2.line(frame, (0, bottom_zone_min), (w, bottom_zone_min), (0, 200, 0), 2)
    cv2.putText(frame, "DOWN ZONE (Add)", (10, bottom_zone_min - 10),
                FONT, 0.6, (200, 255, 200), 2)

    # Middle zone label
    mid_y = (top_zone_max + bottom_zone_min) // 2
    cv2.putText(frame, "NEUTRAL ZONE",
                (w // 2 - 100, mid_y),
                FONT, 0.5, (150, 150, 150), 1)

    return frame


def draw_instructions(frame, frame_height):
    """
    Draw instructions at the bottom of the screen.
    """
    instructions = [
        "Step 1: Start in UP zone",
        "Step 2: Move through NEUTRAL",
        "Step 3: Enter DOWN zone to ADD",
        "Press 'q' to quit"
    ]

    y_pos = frame_height - 100
    for instruction in instructions:
        cv2.putText(frame, instruction,
                    (10, y_pos),
                    FONT, 0.5, (200, 200, 200), 1)
        y_pos += 22

    return frame


def main():
    """Main application entry point."""
    print("=" * 60)
    print("🛒 SMART CART - YOLO-World Zero-Shot Detection")
    print("=" * 60)
    print(f"\nItems to detect: {', '.join(ITEMS_TO_DETECT)}")
    print(f"Confidence threshold: {CONFIDENCE_THRESHOLD}")
    print(f"Zone confirmation frames: {ZONE_CONFIRM_FRAMES}")
    print("\nInitializing...\n")

    # --------------------------------------------------------------------
    # Step 1: Load YOLO-World Model
    # --------------------------------------------------------------------
    # The model will auto-download on first run (~30MB)
    print("Loading YOLO-World model (this may take a moment)...")

    try:
        # Load the YOLO-World small model (yolov8s-world.pt)
        # This is a zero-shot model - no training needed!
        model = YOLO("yolov8s-world.pt")

        # Set the classes we want to detect
        # YOLO-World will detect these without any custom training
        model.set_classes(ITEMS_TO_DETECT)
        print("✓ Model loaded successfully!")

    except Exception as e:
        print(f"✗ Error loading model: {e}")
        print("\nPlease ensure you have internet connection for first-time download.")
        return

    # --------------------------------------------------------------------
    # Step 2: Initialize Webcam
    # --------------------------------------------------------------------
    print("\nInitializing webcam...")

    # Try different backends for macOS compatibility
    # CAP_AVFOUNDATION is preferred for macOS
    cap = cv2.VideoCapture(WEBCAM_INDEX, cv2.CAP_AVFOUNDATION)

    # Fallback to default if AVFoundation fails
    if not cap.isOpened():
        cap = cv2.VideoCapture(WEBCAM_INDEX)

    if not cap.isOpened():
        print("✗ Error: Could not open webcam!")
        print("\nTroubleshooting:")
        print("  - Ensure no other app is using the camera")
        print("  - Check System Preferences > Security & Privacy > Camera")
        print("  - Try changing WEBCAM_INDEX to 1 if you have multiple cameras")
        return

    # Set webcam resolution
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)

    # Get actual resolution (may differ from requested)
    actual_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    actual_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"✓ Webcam initialized: {actual_width}x{actual_height}")

    # --------------------------------------------------------------------
    # Step 3: Initialize Smart Cart
    # --------------------------------------------------------------------
    cart = SmartCart(actual_height)

    print("\n" + "=" * 60)
    print("SMART CART IS RUNNING!")
    print("=" * 60)
    print("\nZone-based detection:")
    print(f"  UP zone (0-{cart.top_zone_max}px): Start here")
    print(f"  NEUTRAL zone ({cart.top_zone_max}-{cart.bottom_zone_min}px): Pass through")
    print(f"  DOWN zone ({cart.bottom_zone_min}-{actual_height}px): Triggers ADD")
    print("\nFlow: UP -> NEUTRAL -> DOWN = ADD")
    print("      DOWN -> NEUTRAL -> UP = REMOVE")
    print("  Press 'q' to quit\n")

    # --------------------------------------------------------------------
    # Step 4: Main Processing Loop
    # --------------------------------------------------------------------
    frame_count = 0

    while True:
        # Read frame from webcam
        ret, frame = cap.read()
        if not ret:
            print("✗ Error: Failed to read frame from webcam")
            break

        frame_count += 1

        # Flip frame horizontally (mirror effect - more natural)
        frame = cv2.flip(frame, 1)

        # --------------------------------------------------------------------
        # Run YOLO-World detection and tracking
        # --------------------------------------------------------------------
        # persist=True maintains track IDs across frames
        # verbose=False suppresses console output
        results = model.track(frame, persist=True, verbose=False)

        # Get annotated frame (with bounding boxes from Ultralytics)
        annotated_frame = results[0].plot() if results else frame

        # Track which track IDs are currently visible
        active_track_ids = set()

        # --------------------------------------------------------------------
        # Process detections
        # --------------------------------------------------------------------
        if results and len(results) > 0:
            result = results[0]

            # Check if we have boxes and track IDs
            if result.boxes is not None and result.boxes.id is not None:
                boxes = result.boxes
                track_ids = boxes.id.int().cpu().tolist()
                class_ids = boxes.cls.int().cpu().tolist()
                confidences = boxes.conf.cpu().tolist()

                # Process each detected object
                for track_id, class_id, conf in zip(track_ids, class_ids, confidences):
                    # Get class name
                    class_name = result.names[class_id]

                    # Only process our target items
                    if class_name not in ITEMS_TO_DETECT:
                        continue

                    # Mark this track as active
                    active_track_ids.add(track_id)

                    # Get bounding box center Y coordinate
                    box = boxes[track_ids.index(track_id)].xyxy[0].cpu().tolist()
                    x1, y1, x2, y2 = box
                    y_center = (y1 + y2) / 2

                    # Update cart logic based on zone-based state machine
                    action = cart.update_position(track_id, class_name, y_center, conf)

                    if action == "ADD":
                        cart.add_item(class_name)
                    elif action == "REMOVE":
                        cart.remove_item(class_name)

        # --------------------------------------------------------------------
        # Cleanup inactive tracks (memory management)
        # --------------------------------------------------------------------
        cart.cleanup_inactive_tracks(active_track_ids)

        # --------------------------------------------------------------------
        # Draw overlays
        # --------------------------------------------------------------------
        # Draw zone overlay
        annotated_frame = draw_zone_overlay(
            annotated_frame,
            cart.top_zone_max,
            cart.bottom_zone_min
        )

        # Draw cart panel
        annotated_frame = draw_cart_overlay(
            annotated_frame,
            cart.cart,
            cart.prices,
            cart.get_total_value(),
            cart.added_count,
            cart.removed_count
        )

        # Draw instructions
        annotated_frame = draw_instructions(annotated_frame, actual_height)

        # Draw frame counter (for debugging)
        cv2.putText(annotated_frame, f"Frame: {frame_count}",
                    (actual_width - 150, 30),
                    FONT, 0.5, (150, 150, 150), 1)

        # --------------------------------------------------------------------
        # Display the result
        # --------------------------------------------------------------------
        cv2.imshow("Smart Cart - YOLO-World Demo", annotated_frame)

        # Check for quit key
        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("\n✓ Quit requested by user")
            break

    # --------------------------------------------------------------------
    # Step 5: Cleanup
    # --------------------------------------------------------------------
    print("\nCleaning up...")
    cap.release()
    cv2.destroyAllWindows()

    # Print final cart summary
    print("\n" + "=" * 60)
    print("FINAL CART SUMMARY")
    print("=" * 60)
    print(f"{'Item':<15} {'Price':>10} {'Qty':>6} {'Total':>10}")
    print("-" * 45)
    for item, qty in cart.cart.items():
        price = cart.prices.get(item, 0)
        item_total = qty * price
        print(f"{item.capitalize():<15} ${price:>9.2f} {qty:>6} ${item_total:>9.2f}")
    print("-" * 45)
    print(f"{'GRAND TOTAL:':<32} ${cart.get_total_value():>9.2f}")
    print(f"\nOperations: {cart.added_count} added, {cart.removed_count} removed")
    print("\nThanks for using Smart Cart!")


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    main()
