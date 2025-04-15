
document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let currentQuestion = 0;
    let userAnswers = [];
    let webcamStream = null;
    let cheatingDetected = false;
    let cheatingWarningCount = 0;
    let timer = null;
    let cheatingChecks = {
        noFaceDetected: 0,
        multipleFacesDetected: 0,
        lookingAway: 0,
        excessiveMovement: 0
    };
    
    // Elements
    const questionsContainer = document.getElementById('questionsContainer');
    const questionIndicators = document.getElementById('questionIndicators');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitExam');
    const timerElement = document.getElementById('examTimer').querySelector('.timer-value');
    const proctoringStatus = document.getElementById('proctoringStatus');
    const proctoringOverlay = document.getElementById('proctoringOverlay');
    const warningIcon = document.getElementById('warningIcon');
    const warningMessage = document.getElementById('warningMessage');
    const confirmSubmitModal = document.getElementById('confirmSubmitModal');
    const cancelSubmitBtn = document.getElementById('cancelSubmit');
    const confirmSubmitBtn = document.getElementById('confirmSubmit');
    const cheatingWarningModal = document.getElementById('cheatingWarningModal');
    const acknowledgeWarningBtn = document.getElementById('acknowledgeWarning');
    const cheatingWarningMessage = document.getElementById('cheatingWarningMessage');
    
    // Initialize the exam
    function initExam() {
        // Parse questions from exam data
        const questions = examData.questions;
        
        // Initialize user answers array
        userAnswers = Array(questions.length).fill(null);
        
        // Render first question
        renderQuestion(0);
        
        // Create question indicators
        createQuestionIndicators(questions.length);
        
        // Set up timer
        startTimer(examData.duration);
        
        // Initialize webcam
        initWebcam();
    }
    
    // Render a question
    function renderQuestion(index) {
        const questions = examData.questions;
        if (index < 0 || index >= questions.length) return;
        
        currentQuestion = index;
        const question = questions[index];
        
        let questionHTML = `
            <div class="question">
                <h3>${index + 1}. ${question.text}</h3>
                <div class="options">
        `;
        
        question.options.forEach((option, i) => {
            const isSelected = userAnswers[index] === i;
            questionHTML += `
                <div class="option ${isSelected ? 'selected' : ''}">
                    <input type="radio" id="q${index}_opt${i}" name="q${index}" value="${i}" ${isSelected ? 'checked' : ''}>
                    <label for="q${index}_opt${i}">${option}</label>
                </div>
            `;
        });
        
        questionHTML += `
                </div>
            </div>
        `;
        
        questionsContainer.innerHTML = questionHTML;
        
        // Add event listeners to options
        document.querySelectorAll(`input[name="q${index}"]`).forEach((radio) => {
            radio.addEventListener('change', (e) => {
                userAnswers[index] = parseInt(e.target.value);
                updateQuestionIndicators();
            });
        });
        
        // Update navigation buttons
        updateNavigationButtons();
        
        // Update indicators
        updateQuestionIndicators();
    }
    
    // Create question indicators
    function createQuestionIndicators(count) {
        questionIndicators.innerHTML = '';
        
        for (let i = 0; i < count; i++) {
            const indicator = document.createElement('div');
            indicator.className = 'question-indicator';
            indicator.textContent = i + 1;
            indicator.addEventListener('click', () => renderQuestion(i));
            questionIndicators.appendChild(indicator);
        }
    }
    
    // Update question indicators
    function updateQuestionIndicators() {
        const indicators = questionIndicators.querySelectorAll('.question-indicator');
        
        indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === currentQuestion);
            indicator.classList.toggle('answered', userAnswers[index] !== null);
        });
    }
    
    // Update navigation buttons
    function updateNavigationButtons() {
        prevBtn.disabled = currentQuestion === 0;
        nextBtn.disabled = currentQuestion === examData.questions.length - 1;
    }
    
    // Start the exam timer
    function startTimer(minutes) {
        let totalSeconds = minutes * 60;
        
        timer = setInterval(() => {
            totalSeconds--;
            
            if (totalSeconds <= 0) {
                clearInterval(timer);
                submitExam();
                return;
            }
            
            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            
            timerElement.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            
            if (totalSeconds <= 300) { // Last 5 minutes
                timerElement.style.color = 'var(--error-color)';
            }
        }, 1000);
    }
    
    // Initialize webcam
    function initWebcam() {
        const video = document.getElementById('webcam');
        
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(function (stream) {
                    webcamStream = stream;
                    video.srcObject = stream;
                    // Start proctoring checks
                    startProctoring();
                })
                .catch(function (error) {
                    console.error("Could not access webcam:", error);
                    alert("Webcam access is required for this exam. Please allow access and reload the page.");
                });
        } else {
            alert("Your browser does not support webcam access. Please use a different browser.");
        }
    }
    
    // Start proctoring checks
    function startProctoring() {
        // Check every 3 seconds
        setInterval(() => {
            captureFrame();
        }, 3000);
    }
    
    // Capture a frame from the webcam
    function captureFrame() {
        const video = document.getElementById('webcam');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL('image/jpeg');
        
        // Send to server for analysis
        checkForCheating(dataURL);
    }
    
    // Check for cheating
    function checkForCheating(frameData) {
        fetch('/detect-cheating', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ frame: frameData }),
        })
        .then(response => response.json())
        .then(data => {
            // Handle detection results
            if (data.cheating_detected) {
                handleCheatingDetection(data.indicators);
            } else {
                // Reset status
                proctoringStatus.style.backgroundColor = 'var(--success-color)';
                warningIcon.classList.add('hidden');
                warningMessage.classList.add('hidden');
            }
        })
        .catch(error => {
            console.error('Error checking for cheating:', error);
        });
    }
    
    // Handle cheating detection
    function handleCheatingDetection(indicators) {
        cheatingDetected = true;
        proctoringStatus.style.backgroundColor = 'var(--warning-color)';
        
        // Count different types of violations
        if (indicators.no_face) cheatingChecks.noFaceDetected++;
        if (indicators.multiple_faces) cheatingChecks.multipleFacesDetected++;
        if (indicators.looking_away) cheatingChecks.lookingAway++;
        if (indicators.excessive_movement) cheatingChecks.excessiveMovement++;
        
        // Show warning in the UI
        warningIcon.classList.remove('hidden');
        warningMessage.classList.remove('hidden');
        
        // Set appropriate warning message
        if (indicators.no_face) {
            warningMessage.textContent = "Face not detected!";
        } else if (indicators.multiple_faces) {
            warningMessage.textContent = "Multiple faces detected!";
        } else if (indicators.looking_away) {
            warningMessage.textContent = "Looking away detected!";
        } else if (indicators.excessive_movement) {
            warningMessage.textContent = "Excessive movement detected!";
        }
        
        // If this is a persistent violation, show modal warning
        const totalViolations = Object.values(cheatingChecks).reduce((a, b) => a + b, 0);
        if (totalViolations % 5 === 0 && cheatingWarningCount < 3) {
            showCheatingWarning();
        }
    }
    
    // Show cheating warning modal
    function showCheatingWarning() {
        cheatingWarningCount++;
        
        // Customize message based on violation types
        let message = "The proctoring system has detected suspicious activity: ";
        
        if (cheatingChecks.noFaceDetected > 0) {
            message += "your face was not visible, ";
        }
        if (cheatingChecks.multipleFacesDetected > 0) {
            message += "multiple people were detected, ";
        }
        if (cheatingChecks.lookingAway > 0) {
            message += "you were looking away from the screen, ";
        }
        if (cheatingChecks.excessiveMovement > 0) {
            message += "excessive movement was detected, ";
        }
        
        message = message.slice(0, -2) + ".";
        message += " This will be reported. Please focus on your exam.";
        
        cheatingWarningMessage.textContent = message;
        cheatingWarningModal.classList.add('active');
    }
    
    // Submit the exam
    function submitExam() {
        // Stop the webcam
        if (webcamStream) {
            webcamStream.getTracks().forEach(track => track.stop());
        }
        
        // Clear the timer
        clearInterval(timer);
        
        // Calculate cheating score
        const totalViolations = Object.values(cheatingChecks).reduce((a, b) => a + b, 0);
        
        // Send data to server
        fetch('/submit-exam', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                exam_id: examData.id,
                answers: userAnswers,
                cheating_detected: totalViolations > 3
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                window.location.href = data.redirect;
            } else {
                alert('There was an error submitting your exam. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error submitting exam:', error);
            alert('There was an error submitting your exam. Please try again.');
        });
    }
    
    // Event Listeners
    prevBtn.addEventListener('click', () => {
        if (currentQuestion > 0) {
            renderQuestion(currentQuestion - 1);
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentQuestion < examData.questions.length - 1) {
            renderQuestion(currentQuestion + 1);
        }
    });
    
    submitBtn.addEventListener('click', () => {
        confirmSubmitModal.classList.add('active');
    });
    
    cancelSubmitBtn.addEventListener('click', () => {
        confirmSubmitModal.classList.remove('active');
    });
    
    confirmSubmitBtn.addEventListener('click', () => {
        confirmSubmitModal.classList.remove('active');
        submitExam();
    });
    
    acknowledgeWarningBtn.addEventListener('click', () => {
        cheatingWarningModal.classList.remove('active');
    });
    
    // Initialize the exam
    initExam();
});
