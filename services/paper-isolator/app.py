from flask import Flask, request, jsonify
import base64
import cv2
import numpy as np
import traceback
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

def order_points(pts):
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def four_point_transform(image, pts):
    rect = order_points(pts)
    (tl, tr, br, bl) = rect
    
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))
    
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))
    
    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]
    ], dtype="float32")
    
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
    return warped

def detect_document(image, debug=False):
    """
    Improved document detection with multiple strategies
    
    Args:
        image: Input BGR image
        debug: If True, return debug images
    
    Returns:
        (result_image, detected) or (result_image, detected, debug_info) if debug=True
    """
    
    # Store original for fallback
    original = image.copy()
    height, width = image.shape[:2]
    min_area = (width * height) * 0.1  # Document must be at least 10% of image
    max_area = (width * height) * 0.95  # But not more than 95%
    
    debug_images = {} if debug else None
    
    # Strategy 1: Enhanced edge detection with adaptive thresholding
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    if debug:
        debug_images['01_grayscale'] = gray.copy()
    
    # Enhance contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    if debug:
        debug_images['02_enhanced'] = enhanced.copy()
    
    # Multiple blur and edge detection attempts
    blurred1 = cv2.GaussianBlur(enhanced, (5, 5), 0)
    blurred2 = cv2.bilateralFilter(enhanced, 9, 75, 75)
    
    # Try multiple edge detection thresholds
    edges_list = [
        cv2.Canny(blurred1, 50, 150),
        cv2.Canny(blurred1, 75, 200),
        cv2.Canny(blurred2, 30, 100),
    ]
    
    if debug:
        for i, edges in enumerate(edges_list):
            debug_images[f'03_edges_{i}'] = edges.copy()
    
    # Dilate edges to connect gaps
    kernel = np.ones((3, 3), np.uint8)
    for i, edges in enumerate(edges_list):
        edges_list[i] = cv2.dilate(edges, kernel, iterations=1)
    
    if debug:
        debug_images['04_dilated'] = edges_list[0].copy()
    
    best_contour = None
    best_score = 0
    
    # Try each edge detection result
    for edges in edges_list:
        contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        
        for contour in contours:
            area = cv2.contourArea(contour)
            
            # Filter by area
            if area < min_area or area > max_area:
                continue
            
            # Approximate contour
            peri = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
            
            # Look for quadrilaterals (4 corners)
            if len(approx) == 4:
                # Calculate score based on area and aspect ratio
                x, y, w, h = cv2.boundingRect(approx)
                aspect_ratio = float(w) / h if h > 0 else 0
                
                # Prefer rectangles with reasonable aspect ratios (0.3 to 3.0)
                if 0.3 <= aspect_ratio <= 3.0:
                    score = area
                    
                    if score > best_score:
                        best_score = score
                        best_contour = approx
    
    # Strategy 2: If no 4-sided contour found, try approximating largest contour
    if best_contour is None:
        # Use the first edge detection result
        contours, _ = cv2.findContours(edges_list[0], cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:10]
        
        for contour in contours:
            area = cv2.contourArea(contour)
            
            if area < min_area or area > max_area:
                continue
            
            # Try different approximation accuracies
            peri = cv2.arcLength(contour, True)
            
            for epsilon_factor in [0.02, 0.03, 0.04, 0.05]:
                approx = cv2.approxPolyDP(contour, epsilon_factor * peri, True)
                
                if len(approx) == 4:
                    best_contour = approx
                    break
            
            if best_contour is not None:
                break
    
    # Strategy 3: White region detection (for white paper on dark background)
    if best_contour is None:
        # Threshold to find bright regions
        _, thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        if debug:
            debug_images['05_threshold'] = thresh.copy()
        
        # Morphological operations to clean up
        kernel = np.ones((5, 5), np.uint8)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
        
        if debug:
            debug_images['06_morphology'] = thresh.copy()
        
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]
        
        for contour in contours:
            area = cv2.contourArea(contour)
            
            if area < min_area or area > max_area:
                continue
            
            peri = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
            
            if len(approx) == 4:
                best_contour = approx
                break
    
    # Strategy 4: Convex hull of largest contour
    if best_contour is None:
        contours, _ = cv2.findContours(edges_list[0], cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            area = cv2.contourArea(largest_contour)
            
            if min_area <= area <= max_area:
                hull = cv2.convexHull(largest_contour)
                peri = cv2.arcLength(hull, True)
                approx = cv2.approxPolyDP(hull, 0.02 * peri, True)
                
                if len(approx) >= 4:
                    # If we have more than 4 points, find the 4 corner points
                    if len(approx) > 4:
                        # Get bounding rectangle corners
                        rect = cv2.minAreaRect(largest_contour)
                        box = cv2.boxPoints(rect)
                        best_contour = np.int0(box).reshape(-1, 1, 2)
                    else:
                        best_contour = approx
    
    # If we found a contour, apply perspective transform
    if best_contour is not None and len(best_contour) == 4:
        if debug:
            # Draw the detected contour
            debug_img = image.copy()
            cv2.drawContours(debug_img, [best_contour], -1, (0, 255, 0), 3)
            debug_images['07_detected_contour'] = debug_img
        
        pts = best_contour.reshape(4, 2)
        rect = order_points(pts)
        
        # Validate the detected rectangle
        if is_valid_document_shape(rect, width, height):
            warped = four_point_transform(image, rect)
            
            if debug:
                return warped, True, debug_images
            return warped, True
    
    # No valid document found
    if debug:
        return None, False, debug_images
    return None, False


def is_valid_document_shape(rect, img_width, img_height):
    """
    Validate that the detected rectangle is a reasonable document shape
    
    Args:
        rect: Ordered points of rectangle
        img_width: Original image width
        img_height: Original image height
    
    Returns:
        bool: True if valid document shape
    """
    (tl, tr, br, bl) = rect
    
    # Calculate width and height
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    
    maxWidth = max(int(widthA), int(widthB))
    maxHeight = max(int(heightA), int(heightB))
    
    # Check if dimensions are reasonable
    if maxWidth < 50 or maxHeight < 50:
        return False
    
    # Check aspect ratio (typical document ratios: A4 is ~1.414, Letter is ~1.294)
    aspect_ratio = maxWidth / maxHeight if maxHeight > 0 else 0
    
    # Allow aspect ratios between 1:3 and 3:1
    if aspect_ratio < 0.33 or aspect_ratio > 3.0:
        return False
    
    # Check that it's not too close to image boundaries (likely the image itself)
    min_margin = 10
    if (tl[0] < min_margin and tr[0] > img_width - min_margin and
        tl[1] < min_margin and bl[1] > img_height - min_margin):
        return False
    
    return True


def order_points(pts):
    """Order points in top-left, top-right, bottom-right, bottom-left order"""
    rect = np.zeros((4, 2), dtype="float32")
    
    # Sum and diff to find corners
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)
    
    rect[0] = pts[np.argmin(s)]      # top-left (smallest sum)
    rect[2] = pts[np.argmax(s)]      # bottom-right (largest sum)
    rect[1] = pts[np.argmin(diff)]   # top-right (smallest difference)
    rect[3] = pts[np.argmax(diff)]   # bottom-left (largest difference)
    
    return rect


def four_point_transform(image, pts):
    """Apply perspective transform to get bird's eye view"""
    rect = order_points(pts)
    (tl, tr, br, bl) = rect
    
    # Calculate width
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))
    
    # Calculate height
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))
    
    # Ensure minimum dimensions
    maxWidth = max(maxWidth, 100)
    maxHeight = max(maxHeight, 100)
    
    # Destination points
    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]
    ], dtype="float32")
    
    # Perspective transform
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
    
    return warped


def save_debug_images(debug_images, prefix="debug"):
    """Save debug images to disk for inspection"""
    import os
    os.makedirs("debug_output", exist_ok=True)
    
    for name, img in debug_images.items():
        cv2.imwrite(f"debug_output/{prefix}_{name}.jpg", img)
    
    print(f"Saved {len(debug_images)} debug images to debug_output/")


# Example usage with debugging
if __name__ == "__main__":
    # Test the function
    image = cv2.imread("test_document.jpg")
    
    if image is not None:
        # Run with debug mode
        result, detected, debug_info = detect_document(image, debug=True)
        
        if detected:
            print("✅ Document detected!")
            cv2.imwrite("detected_document.jpg", result)
            print(f"Saved to detected_document.jpg")
        else:
            print("❌ No document detected")
        
        # Save debug images
        save_debug_images(debug_info, "test")
        print("Check debug_output/ folder for intermediate steps")
    else:
        print("Could not load image")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200

@app.route('/paper-isolate', methods=['POST'])
def paper_isolate():
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({
                'error': 'Missing "image" field',
                'document_detected': False
            }), 400
        
        app.logger.info("Processing image request")
        
        # Decode image
        image_data = base64.b64decode(data['image'])
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({
                'error': 'Invalid image data',
                'document_detected': False
            }), 400
        
        app.logger.info(f"Image decoded: {image.shape}")
        
        # Detect document
        result_image, detected = detect_document(image)
        
        if detected and result_image is not None:
            _, buffer = cv2.imencode('.jpg', result_image)
            result_base64 = base64.b64encode(buffer).decode('utf-8')
            
            app.logger.info("Document detected successfully")
            
            return jsonify({
                'message': 'Document detected successfully',
                'document_detected': True,
                'image': result_base64,
                'width': int(result_image.shape[1]),
                'height': int(result_image.shape[0])
            }), 200
        else:
            app.logger.info("No document detected")
            return jsonify({
                'message': 'No document detected',
                'document_detected': False
            }), 404
            
    except Exception as e:
        app.logger.error(f"Error: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({
            'error': str(e),
            'document_detected': False
        }), 500

if __name__ == '__main__':
    # Use gunicorn in production
    app.run(host='0.0.0.0', port=8080)
