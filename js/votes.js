/**
 * Votes Module
 * Handles upvotes, downvotes, and comments on projects
 * Stored in cookies until API integration
 */

const VOTES_COOKIE_NAME = 'cipmap_votes';
const COMMENTS_COOKIE_NAME = 'cipmap_comments';
const COOKIE_DAYS = 365;

// State
let userVotes = {}; // projectId -> 'up' | 'down' | null
let userComments = {}; // projectId -> [array of comment strings]

/**
 * Load votes and comments from cookies
 */
export function loadVotesAndComments() {
    // Reset state first
    userVotes = {};
    userComments = {};
    
    // Load votes
    const votesCookie = getCookie(VOTES_COOKIE_NAME);
    if (votesCookie) {
        try {
            userVotes = JSON.parse(votesCookie);
        } catch (e) {
            console.error('Failed to parse votes cookie:', e);
            userVotes = {};
        }
    }
    
    // Load comments
    const commentsCookie = getCookie(COMMENTS_COOKIE_NAME);
    if (commentsCookie) {
        try {
            userComments = JSON.parse(commentsCookie);
        } catch (e) {
            console.error('Failed to parse comments cookie:', e);
            userComments = {};
        }
    }
}

/**
 * Get the user's vote for a project
 * @returns 'up' | 'down' | null
 */
export function getVote(projectId) {
    return userVotes[projectId] || null;
}

/**
 * Set an upvote for a project
 */
export function upvote(projectId) {
    if (userVotes[projectId] === 'up') {
        // Toggle off
        delete userVotes[projectId];
    } else {
        userVotes[projectId] = 'up';
    }
    saveVotesToCookie();
    return userVotes[projectId] || null;
}

/**
 * Set a downvote for a project
 */
export function downvote(projectId) {
    if (userVotes[projectId] === 'down') {
        // Toggle off
        delete userVotes[projectId];
    } else {
        userVotes[projectId] = 'down';
    }
    saveVotesToCookie();
    return userVotes[projectId] || null;
}

/**
 * Get comments for a project
 */
export function getComments(projectId) {
    return userComments[projectId] || [];
}

/**
 * Add a comment to a project
 */
export function addComment(projectId, comment) {
    if (!comment || !comment.trim()) return;
    
    if (!userComments[projectId]) {
        userComments[projectId] = [];
    }
    userComments[projectId].push({
        text: comment.trim(),
        timestamp: new Date().toISOString()
    });
    saveCommentsToCookie();
}

/**
 * Check if user has commented on a project
 */
export function hasComments(projectId) {
    return !!(userComments[projectId] && userComments[projectId].length > 0);
}

/**
 * Save votes to cookie
 */
function saveVotesToCookie() {
    const expires = new Date();
    expires.setTime(expires.getTime() + COOKIE_DAYS * 24 * 60 * 60 * 1000);
    const cookieValue = encodeURIComponent(JSON.stringify(userVotes));
    document.cookie = `${VOTES_COOKIE_NAME}=${cookieValue};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Save comments to cookie
 */
function saveCommentsToCookie() {
    const expires = new Date();
    expires.setTime(expires.getTime() + COOKIE_DAYS * 24 * 60 * 60 * 1000);
    const cookieValue = encodeURIComponent(JSON.stringify(userComments));
    document.cookie = `${COMMENTS_COOKIE_NAME}=${cookieValue};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Get cookie value
 */
function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
            return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
    }
    return null;
}
