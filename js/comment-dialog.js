/**
 * Comment Dialog Module
 * Handles the comment dialog UI and interactions
 */

import { getComments, addComment } from './votes.js';

// Current project ID for comment dialog
let commentProjectId = null;

/**
 * Show the comment dialog for a project
 * @param {Object} project - The project to comment on
 */
export function showCommentDialog(project) {
    commentProjectId = project.id;
    
    const dialog = document.getElementById('commentDialog');
    const overlay = document.getElementById('commentDialogOverlay');
    
    // Set project name
    document.getElementById('commentProjectName').textContent = project.name;
    
    // Clear input
    document.getElementById('commentInput').value = '';
    
    // Render previous comments
    const previousCommentsContainer = document.getElementById('previousComments');
    previousCommentsContainer.innerHTML = '';
    
    const comments = getComments(project.id);
    comments.forEach(comment => {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment-item';
        
        const textEl = document.createElement('div');
        textEl.className = 'comment-text';
        textEl.textContent = comment.text;
        
        const timeEl = document.createElement('div');
        timeEl.className = 'comment-time';
        timeEl.textContent = formatCommentTime(comment.timestamp);
        
        commentEl.appendChild(textEl);
        commentEl.appendChild(timeEl);
        previousCommentsContainer.appendChild(commentEl);
    });
    
    // Show dialog
    dialog.hidden = false;
    overlay.hidden = false;
    
    // Focus input
    document.getElementById('commentInput').focus();
}

/**
 * Hide the comment dialog
 */
export function hideCommentDialog() {
    const dialog = document.getElementById('commentDialog');
    const overlay = document.getElementById('commentDialogOverlay');
    
    dialog.hidden = true;
    overlay.hidden = true;
    commentProjectId = null;
}

/**
 * Handle OK button on comment dialog
 */
export function handleCommentDialogOk() {
    const input = document.getElementById('commentInput');
    const commentText = input.value.trim();
    
    if (commentText && commentProjectId) {
        addComment(commentProjectId, commentText);
        
        // Update the comment button state in the project list
        const card = document.querySelector(`.project-card[data-project-id="${commentProjectId}"]`);
        if (card) {
            card.querySelector('.comment-btn').classList.add('has-comments');
        }
    }
    
    hideCommentDialog();
}

/**
 * Format comment timestamp for display
 */
function formatCommentTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
}
