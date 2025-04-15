
document.addEventListener('DOMContentLoaded', function() {
    // Handle view results buttons
    const viewResultsButtons = document.querySelectorAll('.view-results');
    
    viewResultsButtons.forEach(button => {
        button.addEventListener('click', function() {
            const examId = this.getAttribute('data-exam-id');
            window.location.href = `/view-results?exam_id=${examId}`;
        });
    });
});
