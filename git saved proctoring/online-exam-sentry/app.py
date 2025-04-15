
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import pandas as pd
import os
import uuid
import cv2
import numpy as np
from datetime import datetime
import base64
import threading
import time

app = Flask(__name__)
app.secret_key = "exam_proctor_secret_key"  # For session management

# Creating Excel files for database if they don't exist
if not os.path.exists('database'):
    os.makedirs('database')

# Users database
if not os.path.exists('database/users.xlsx'):
    users_df = pd.DataFrame(columns=['username', 'password', 'role'])  # role can be 'student' or 'teacher'
    users_df.loc[len(users_df)] = ['admin', 'admin123', 'teacher']  # Default admin account
    users_df.to_excel('database/users.xlsx', index=False)

# Exams database
if not os.path.exists('database/exams.xlsx'):
    exams_df = pd.DataFrame(columns=['exam_id', 'title', 'description', 'duration', 'created_by', 'questions'])
    exams_df.to_excel('database/exams.xlsx', index=False)

# Exam results database
if not os.path.exists('database/results.xlsx'):
    results_df = pd.DataFrame(columns=['result_id', 'exam_id', 'username', 'score', 'cheating_detected', 'timestamp'])
    results_df.to_excel('database/results.xlsx', index=False)

# Simple ML model for cheating detection
class CheatingDetector:
    def __init__(self):
        # Load pre-trained face detection model
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
        
        # Keeps track of face position changes
        self.prev_face_position = None
        self.face_movement_count = 0
        self.no_face_count = 0
        self.multiple_faces_count = 0
        self.looking_away_count = 0
        
    def detect_cheating(self, frame_data):
        # Decode base64 image
        img_data = base64.b64decode(frame_data.split(',')[1])
        np_arr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        # Convert to grayscale for detection
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)
        
        cheating_indicators = {
            "multiple_faces": len(faces) > 1,
            "no_face": len(faces) == 0,
            "looking_away": False,
            "excessive_movement": False
        }
        
        # Check for no faces
        if len(faces) == 0:
            self.no_face_count += 1
            cheating_indicators["no_face"] = True
            return cheating_indicators
        
        # Check for multiple faces
        if len(faces) > 1:
            self.multiple_faces_count += 1
            cheating_indicators["multiple_faces"] = True
        
        # Track movement for the main face
        main_face = faces[0]  # Use the first detected face
        x, y, w, h = main_face
        face_center = (x + w//2, y + h//2)
        
        # Check for face movement
        if self.prev_face_position:
            prev_x, prev_y = self.prev_face_position
            movement = ((face_center[0] - prev_x)**2 + (face_center[1] - prev_y)**2)**0.5
            if movement > 50:  # Threshold for significant movement
                self.face_movement_count += 1
                if self.face_movement_count > 5:
                    cheating_indicators["excessive_movement"] = True
        
        self.prev_face_position = face_center
        
        # Check for looking away (eye detection)
        face_roi_gray = gray[y:y+h, x:x+w]
        eyes = self.eye_cascade.detectMultiScale(face_roi_gray)
        if len(eyes) < 2:
            self.looking_away_count += 1
            if self.looking_away_count > 10:
                cheating_indicators["looking_away"] = True
        
        return cheating_indicators

cheating_detector = CheatingDetector()

# Routes
@app.route('/')
def index():
    if 'username' in session:
        if session['role'] == 'teacher':
            return redirect(url_for('teacher_dashboard'))
        else:
            return redirect(url_for('student_dashboard'))
    return render_template('login.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        users_df = pd.read_excel('database/users.xlsx')
        user = users_df[(users_df['username'] == username) & (users_df['password'] == password)]
        
        if not user.empty:
            session['username'] = username
            session['role'] = user.iloc[0]['role']
            if user.iloc[0]['role'] == 'teacher':
                return redirect(url_for('teacher_dashboard'))
            else:
                return redirect(url_for('student_dashboard'))
        else:
            return render_template('login.html', error='Invalid username or password')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        role = request.form['role']
        
        users_df = pd.read_excel('database/users.xlsx')
        
        if username in users_df['username'].values:
            return render_template('register.html', error='Username already exists')
        
        users_df.loc[len(users_df)] = [username, password, role]
        users_df.to_excel('database/users.xlsx', index=False)
        
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/student/dashboard')
def student_dashboard():
    if 'username' not in session or session['role'] != 'student':
        return redirect(url_for('login'))
    
    exams_df = pd.read_excel('database/exams.xlsx')
    exams = exams_df.to_dict('records')
    
    return render_template('student_dashboard.html', username=session['username'], exams=exams)

@app.route('/teacher/dashboard')
def teacher_dashboard():
    if 'username' not in session or session['role'] != 'teacher':
        return redirect(url_for('login'))
    
    exams_df = pd.read_excel('database/exams.xlsx')
    exams = exams_df[exams_df['created_by'] == session['username']].to_dict('records')
    
    return render_template('teacher_dashboard.html', username=session['username'], exams=exams)

@app.route('/create-exam', methods=['GET', 'POST'])
def create_exam():
    if 'username' not in session or session['role'] != 'teacher':
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        exam_id = str(uuid.uuid4())
        title = request.form['title']
        description = request.form['description']
        duration = request.form['duration']
        questions = request.form['questions']  # JSON string of questions
        
        exams_df = pd.read_excel('database/exams.xlsx')
        exams_df.loc[len(exams_df)] = [exam_id, title, description, duration, session['username'], questions]
        exams_df.to_excel('database/exams.xlsx', index=False)
        
        return redirect(url_for('teacher_dashboard'))
    
    return render_template('create_exam.html', username=session['username'])

@app.route('/take-exam/<exam_id>')
def take_exam(exam_id):
    if 'username' not in session or session['role'] != 'student':
        return redirect(url_for('login'))
    
    exams_df = pd.read_excel('database/exams.xlsx')
    exam = exams_df[exams_df['exam_id'] == exam_id].to_dict('records')
    
    if not exam:
        return redirect(url_for('student_dashboard'))
    
    return render_template('take_exam.html', username=session['username'], exam=exam[0])

@app.route('/submit-exam', methods=['POST'])
def submit_exam():
    if 'username' not in session:
        return jsonify({'status': 'error', 'message': 'Not logged in'})
    
    data = request.get_json()
    exam_id = data['exam_id']
    answers = data['answers']
    cheating_detected = data['cheating_detected']
    
    # Calculate score (simplified)
    score = 80  # Placeholder for actual score calculation
    
    # Save result
    results_df = pd.read_excel('database/results.xlsx')
    result_id = str(uuid.uuid4())
    results_df.loc[len(results_df)] = [
        result_id, exam_id, session['username'], score, cheating_detected, datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ]
    results_df.to_excel('database/results.xlsx', index=False)
    
    return jsonify({'status': 'success', 'score': score, 'redirect': url_for('student_dashboard')})

@app.route('/detect-cheating', methods=['POST'])
def detect_cheating():
    data = request.get_json()
    frame_data = data['frame']
    
    # Process with ML model
    cheating_indicators = cheating_detector.detect_cheating(frame_data)
    
    return jsonify({
        'cheating_detected': any(cheating_indicators.values()),
        'indicators': cheating_indicators
    })

@app.route('/view-results')
def view_results():
    if 'username' not in session:
        return redirect(url_for('login'))
    
    results_df = pd.read_excel('database/results.xlsx')
    
    if session['role'] == 'teacher':
        # Teachers see all results
        results = results_df.to_dict('records')
    else:
        # Students see only their own results
        results = results_df[results_df['username'] == session['username']].to_dict('records')
    
    return render_template('view_results.html', username=session['username'], results=results, role=session['role'])

if __name__ == '__main__':
    app.run(debug=True)
