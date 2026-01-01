/**
 * Vote Buttons Module
 * Shared logic for wiring up vote/comment buttons on project cards and detail panels
 */

import { getVote, upvote, downvote, hasComments } from './votes.js';
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

    // Upvote handler
    upvoteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!hasUser()) {
            showUserDialog('Please provide your information to use this feature');
            return;
        }
        const newVote = upvote(project.id);
        upvoteBtn.classList.toggle('active', newVote === 'up');
        downvoteBtn.classList.remove('active');
    });

    // Downvote handler
    downvoteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!hasUser()) {
            showUserDialog('Please provide your information to use this feature');
            return;
        }
        const newVote = downvote(project.id);
        downvoteBtn.classList.toggle('active', newVote === 'down');
        upvoteBtn.classList.remove('active');
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
