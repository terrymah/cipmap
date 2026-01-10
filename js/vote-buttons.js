/**
 * Vote Buttons Module
 * Shared logic for wiring up vote/comment buttons on project cards and detail panels
 */

import { getVote, upvote, downvote, hasComments, fetchVoteScore } from './votes.js';
import { hasUser, showUserDialog } from './user.js';
import { isResultsMode } from './config.js';

/**
 * Wire up vote buttons in a container element
 * @param {Element} container - The container element with vote buttons
 * @param {Object} project - The project object
 * @param {Function} onShowCommentDialog - Callback to show the comment dialog
 * @param {Object} options - Optional configuration { commentCount: number }
 */
export function wireVoteButtons(container, project, onShowCommentDialog, options = {}) {
    const upvoteBtn = container.querySelector('.upvote-btn');
    const downvoteBtn = container.querySelector('.downvote-btn');
    const commentBtn = container.querySelector('.comment-btn');
    const commentCountEl = container.querySelector('.comment-count');
    const scoreEl = container.querySelector('.vote-score');

    if (!upvoteBtn || !downvoteBtn || !commentBtn) {
        return; // Buttons not found
    }

    const resultsMode = isResultsMode();

    // Show comment count if provided (survey mode or results mode)
    if (commentCountEl && typeof options.commentCount === 'number' && options.commentCount > 0) {
        commentCountEl.textContent = options.commentCount;
        commentCountEl.hidden = false;
    }

    // In results mode, disable voting and show results data
    if (resultsMode) {
        // Disable vote buttons visually
        upvoteBtn.disabled = true;
        downvoteBtn.disabled = true;
        upvoteBtn.classList.add('disabled');
        downvoteBtn.classList.add('disabled');
        upvoteBtn.style.opacity = '0.5';
        downvoteBtn.style.opacity = '0.5';
        upvoteBtn.style.cursor = 'default';
        downvoteBtn.style.cursor = 'default';
        
        // Show score if provided in options
        if (scoreEl && options.resultsData) {
            scoreEl.textContent = options.resultsData.score || 0;
            scoreEl.title = `${options.resultsData.upvotes || 0} upvotes, ${options.resultsData.downvotes || 0} downvotes`;
        } else if (scoreEl) {
            // Fetch score for detail panel
            fetchAndDisplayScore(project.id, scoreEl);
        }
        
        // Comment button still works
        commentBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (onShowCommentDialog) {
                onShowCommentDialog(project);
            }
        });
        
        return;
    }

    // Normal mode - set initial vote state
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
        
        const doUpvote = () => {
            const newVote = upvote(project.id);
            upvoteBtn.classList.toggle('active', newVote === 'up');
            downvoteBtn.classList.remove('active');
            
            // Refresh score after voting
            if (scoreEl) {
                setTimeout(() => fetchAndDisplayScore(project.id, scoreEl), 500);
            }
        };
        
        if (!hasUser()) {
            showUserDialog('Please fill out a profile to use this feature', doUpvote);
            return;
        }
        doUpvote();
    });

    // Downvote handler
    downvoteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        const doDownvote = () => {
            const newVote = downvote(project.id);
            downvoteBtn.classList.toggle('active', newVote === 'down');
            upvoteBtn.classList.remove('active');
            
            // Refresh score after voting
            if (scoreEl) {
                setTimeout(() => fetchAndDisplayScore(project.id, scoreEl), 500);
            }
        };
        
        if (!hasUser()) {
            showUserDialog('Please fill out a profile to use this feature', doDownvote);
            return;
        }
        doDownvote();
    });

    // Comment handler
    commentBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        const doShowComment = () => {
            if (onShowCommentDialog) {
                onShowCommentDialog(project);
            }
        };
        
        if (!hasUser()) {
            showUserDialog('Please fill out a profile to use this feature', doShowComment);
            return;
        }
        doShowComment();
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
