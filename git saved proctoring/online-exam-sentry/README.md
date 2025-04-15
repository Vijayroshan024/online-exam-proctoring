# Exam Sentry - Online Exam Proctoring System

An AI-powered online exam proctoring system that uses machine learning to detect cheating during exams.

## Features

- User authentication (student/teacher roles)
- Exam creation for teachers
- Secure exam taking interface for students
- Real-time AI proctoring with webcam monitoring
- Multiple cheating detection mechanisms:
  - Face presence verification
  - Multiple person detection
  - Looking away detection
  - Excessive movement detection
- Detailed exam results tracking
- Simple Excel-based database (no complex setup required)

## Technologies Used

- **Backend**: Python with Flask
- **Frontend**: HTML, CSS, JavaScript
- **Database**: Excel (using pandas)
- **ML**: OpenCV for face and eye detection
- **Real-time Analysis**: Client-server communication for proctoring

## Installation

1. Clone the repository:

```
git clone https://github.com/yourusername/exam-sentry.git
cd exam-sentry
```

2. Install the required packages:

```
pip install -r requirements.txt
```

3. Run the application:

```
python app.py
```

4. Open your browser and navigate to:

```
http://127.0.0.1:5000
```

## Default Accounts

- Teacher:
  - Username: admin
  - Password: admin123

## Project Structure

- `app.py`: Main Flask application
- `templates/`: HTML templates
- `static/`: Static files (CSS, JavaScript, etc.)
- `database/`: Excel database files (created on first run)

## ML Proctoring Details

The system uses OpenCV with Haar Cascades for:

- Face detection
- Eye detection
- Movement analysis
- Multiple face detection

Cheating is detected through pattern recognition of suspicious behaviors like:

- Face disappearance
- Multiple people in frame
- Looking away from screen
- Excessive head movements
