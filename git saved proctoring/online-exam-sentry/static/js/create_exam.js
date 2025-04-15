
document.addEventListener('DOMContentLoaded', function() {
    const addQuestionBtn = document.getElementById('addQuestion');
    const questionsList = document.getElementById('questionsList');
    const questionsInput = document.getElementById('questions');
    const examForm = document.getElementById('examForm');
    const backBtn = document.getElementById('backBtn');
    let questionCount = 1;
    
    // Handle adding a new question
    addQuestionBtn.addEventListener('click', function() {
        questionCount++;
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';
        questionDiv.innerHTML = `
            <div class="question-header">
                <h4>Question ${questionCount}</h4>
                <button type="button" class="btn btn-small btn-delete">Remove</button>
            </div>
            <div class="form-group">
                <label>Question Text</label>
                <input type="text" class="question-text" required>
            </div>
            <div class="options-container">
                <div class="option-item">
                    <input type="radio" name="correct-${questionCount}" checked>
                    <input type="text" class="option-text" placeholder="Option 1" required>
                </div>
                <div class="option-item">
                    <input type="radio" name="correct-${questionCount}">
                    <input type="text" class="option-text" placeholder="Option 2" required>
                </div>
            </div>
            <button type="button" class="btn btn-small add-option">Add Option</button>
        `;
        
        questionsList.appendChild(questionDiv);
        
        // Add event listener for removing this question
        questionDiv.querySelector('.btn-delete').addEventListener('click', function() {
            questionDiv.remove();
            updateQuestionNumbers();
        });
        
        // Add event listener for adding an option to this question
        questionDiv.querySelector('.add-option').addEventListener('click', function() {
            addOptionToQuestion(questionDiv);
        });
    });
    
    // Function to add an option to a question
    function addOptionToQuestion(questionDiv) {
        const optionsContainer = questionDiv.querySelector('.options-container');
        const optionCount = optionsContainer.childElementCount + 1;
        const questionNumber = questionDiv.querySelector('h4').textContent.split(' ')[1];
        
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option-item';
        optionDiv.innerHTML = `
            <input type="radio" name="correct-${questionNumber}">
            <input type="text" class="option-text" placeholder="Option ${optionCount}" required>
            <button type="button" class="btn btn-small btn-delete-option">×</button>
        `;
        
        optionsContainer.appendChild(optionDiv);
        
        // Add event listener for deleting this option
        optionDiv.querySelector('.btn-delete-option').addEventListener('click', function() {
            optionDiv.remove();
        });
    }
    
    // Function to update question numbers after deletion
    function updateQuestionNumbers() {
        const questions = questionsList.querySelectorAll('.question-item');
        questions.forEach((question, index) => {
            const number = index + 1;
            question.querySelector('h4').textContent = `Question ${number}`;
            
            // Update radio button names
            const radios = question.querySelectorAll('input[type="radio"]');
            radios.forEach(radio => {
                radio.setAttribute('name', `correct-${number}`);
            });
        });
        
        questionCount = questions.length;
    }
    
    // Add event listener for the first question's delete option button
    questionsList.querySelector('.btn-delete').addEventListener('click', function() {
        // Don't remove if it's the only question
        if (questionsList.childElementCount > 1) {
            this.closest('.question-item').remove();
            updateQuestionNumbers();
        } else {
            alert('You need at least one question in the exam.');
        }
    });
    
    // Add event listener for the first question's add option button
    questionsList.querySelector('.add-option').addEventListener('click', function() {
        addOptionToQuestion(this.closest('.question-item'));
    });
    
    // Handle form submission
    examForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Collect questions and options
        const questions = [];
        const questionItems = questionsList.querySelectorAll('.question-item');
        
        questionItems.forEach((questionItem) => {
            const questionText = questionItem.querySelector('.question-text').value;
            const options = [];
            const optionItems = questionItem.querySelectorAll('.option-item');
            let correctAnswerIndex = 0;
            
            optionItems.forEach((optionItem, index) => {
                const optionText = optionItem.querySelector('.option-text').value;
                const isCorrect = optionItem.querySelector('input[type="radio"]').checked;
                
                options.push(optionText);
                if (isCorrect) correctAnswerIndex = index;
            });
            
            questions.push({
                text: questionText,
                options: options,
                correctAnswer: correctAnswerIndex
            });
        });
        
        // Set the hidden input value
        questionsInput.value = JSON.stringify(questions);
        
        // Submit the form
        this.submit();
    });
    
    // Back button
    backBtn.addEventListener('click', function() {
        window.location.href = '/teacher/dashboard';
    });
    
    // Initially add "remove" buttons to the default options
    const firstQuestionOptions = questionsList.querySelectorAll('.option-item');
    firstQuestionOptions.forEach(option => {
        if (firstQuestionOptions.length > 2) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn btn-small btn-delete-option';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', function() {
                option.remove();
            });
            option.appendChild(removeBtn);
        }
    });
});
