/**
 * Comment Dialog Module
 * Handles the comment dialog UI and interactions
 */

import { getComments, addComment } from './votes.js';
import { getUser } from './user.js';
import { getConfig } from './config.js';
import { showApiError } from './debug.js';

// Current project ID for comment dialog
let commentProjectId = null;

/**
 * Post comment to API server
 * @param {string} projectId - The project ID
 * @param {string} commentText - The comment text
 * @returns {Promise<boolean>} - Success status
 */
async function postCommentToApi(projectId, commentText) {
    const config = getConfig();
    if (!config.apiServer) {
        return false;
    }
    
    const user = getUser();
    if (!user?.userId) {
        console.warn('No userId available for API comment');
        return false;
    }
    
    try {
        const response = await fetch(`${config.apiServer}/api/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userid: user.userId,
                appid: 'cipmap',
                item_id: projectId,
                comment: commentText
            })
        });
        
        if (!response.ok) {
            console.error('API comment failed:', response.status);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('API comment error:', error);
        showApiError('/api/comment POST', error);
        return false;
    }
}

/**
 * Fetch comments from API server
 * @param {string} projectId - The project ID
 * @returns {Promise<Array>} - Array of comments from server
 */
async function fetchCommentsFromApi(projectId) {
    const config = getConfig();
    if (!config.apiServer) {
        return [];
    }
    
    try {
        const params = new URLSearchParams({
            appid: 'cipmap',
            item_id: projectId
        });
        
        const response = await fetch(`${config.apiServer}/api/comment?${params}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('API fetch comments failed:', response.status);
            return [];
        }
        
        return await response.json();
    } catch (error) {
        console.error('API fetch comments error:', error);
        showApiError('/api/comment GET', error);
        return [];
    }
}

/**
 * Render comments in the dialog
 * @param {Array} comments - Array of comment objects from API
 */
function renderComments(comments) {
    const previousCommentsContainer = document.getElementById('previousComments');
    previousCommentsContainer.innerHTML = '';
    
    if (comments.length === 0) {
        previousCommentsContainer.innerHTML = '<div class="no-comments">No comments yet</div>';
        return;
    }
    
    comments.forEach(comment => {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment-item';
        
        const headerEl = document.createElement('div');
        headerEl.className = 'comment-header';
        
        const authorEl = document.createElement('span');
        authorEl.className = 'comment-author';
        authorEl.textContent = `${comment.firstname} ${comment.lastname}`;
        
        const timeEl = document.createElement('span');
        timeEl.className = 'comment-time';
        timeEl.textContent = formatCommentTime(comment.created_at);
        
        headerEl.appendChild(authorEl);
        headerEl.appendChild(timeEl);
        
        const textEl = document.createElement('div');
        textEl.className = 'comment-text';
        textEl.textContent = comment.comment;
        
        commentEl.appendChild(headerEl);
        commentEl.appendChild(textEl);
        previousCommentsContainer.appendChild(commentEl);
    });
}

/**
 * Show the comment dialog for a project
 * @param {Object} project - The project to comment on
 */
export async function showCommentDialog(project) {
    commentProjectId = project.id;
    
    const dialog = document.getElementById('commentDialog');
    const overlay = document.getElementById('commentDialogOverlay');
    
    // Set project name
    document.getElementById('commentProjectName').textContent = project.name;
    
    // Clear input
    document.getElementById('commentInput').value = '';
    
    // Show loading state
    const previousCommentsContainer = document.getElementById('previousComments');
    previousCommentsContainer.innerHTML = '<div class="loading-comments">Loading comments...</div>';
    
    // Show dialog
    dialog.hidden = false;
    overlay.hidden = false;
    
    // Focus input
    document.getElementById('commentInput').focus();
    
    // Fetch and render comments from API
    const comments = await fetchCommentsFromApi(project.id);
    renderComments(comments);
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
export async function handleCommentDialogOk() {
    const input = document.getElementById('commentInput');
    const commentText = input.value.trim();
    
    if (commentText && commentProjectId) {
        // Post to API (async, don't wait)
        postCommentToApi(commentProjectId, commentText);
        
        // Save locally
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
