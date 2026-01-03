/**
 * Vote Buttons Module
 * Shared logic for wiring up vote/comment buttons on project cards and detail panels
 */

import { getVote, upvote, downvote, hasComments, fetchVoteScore } from './votes.js';
import { hasUser, showUserDialog } from './user.js';

/**
 * Wire up vote buttons in a container element
 * @param {Element} container - The container element with vote buttons
 * @param {Object} project - The project object
 * @param {Function} onShowCommentDialog - Callback to show the comment dialog
 */
export function wireVoteButtons(container, project, onShowCommentDialog) {
    const upvoteBtn = container.querySelector('.upvote-btn');
    const downvoteBtn = container.querySelector('.downvote-btn');
    const commentBtn = container.querySelector('.comment-btn');
    const scoreEl = container.querySelector('.vote-score');

    if (!upvoteBtn || !downvoteBtn || !commentBtn) {
        return; // Buttons not found
    }

    // Set initial vote state
    const currentVote = getVote(project.id);
    if (currentVote === 'up') {
        upvoteBtn.classList.add('active');
    } else if (currentVote === 'down') {
        downvoteBtn.classList.add('active');
    }

    // Set initial comment state
    if (hasComments(project.id)) {
        commentBtn.classList.add('has-comments');
    }

    // Fetch and display score if score element exists (detail panel only)
    if (scoreEl) {
        fetchAndDisplayScore(project.id, scoreEl);
    }

    // Upvote handler
    upvoteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!hasUser()) {
            showUserDialog('Please provide your information to use this feature');
            return;
        }
        const newVote = upvote(project.id);
        upvoteBtn.classList.toggle('active', newVote === 'up');
        downvoteBtn.classList.remove('active');
        
        // Refresh score after voting
        if (scoreEl) {
            setTimeout(() => fetchAndDisplayScore(project.id, scoreEl), 500);
        }
    });

    // Downvote handler
    downvoteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!hasUser()) {
            showUserDialog('Please provide your information to use this feature');
            return;
        }
        const newVote = downvote(project.id);
        downvoteBtn.classList.toggle('active', newVote === 'down');
        upvoteBtn.classList.remove('active');
        
        // Refresh score after voting
        if (scoreEl) {
            setTimeout(() => fetchAndDisplayScore(project.id, scoreEl), 500);
        }
    });

    // Comment handler
    commentBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!hasUser()) {
            showUserDialog('Please provide your information to use this feature');
            return;
        }
        if (onShowCommentDialog) {
            onShowCommentDialog(project);
        }
    });
}

/**
 * Fetch vote score from API and update display
 * @param {string} projectId - The project ID
 * @param {Element} scoreEl - The score element to update
 */
async function fetchAndDisplayScore(projectId, scoreEl) {
    const data = await fetchVoteScore(projectId);
    if (data && typeof data.score === 'number') {
        scoreEl.textContent = data.score;
        scoreEl.title = `${data.upvotes} upvotes, ${data.downvotes} downvotes`;
    } else {
        scoreEl.textContent = '0';
    }
}
