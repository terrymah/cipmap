/**
 * Votes Module
 * Handles upvotes, downvotes, and comments on projects
 * Stored in cookies until API integration
 */

import { getCookie, setCookie } from './cookies.js';

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
    setCookie(VOTES_COOKIE_NAME, JSON.stringify(userVotes), COOKIE_DAYS);
}

/**
 * Save comments to cookie
 */
function saveCommentsToCookie() {
    setCookie(COMMENTS_COOKIE_NAME, JSON.stringify(userComments), COOKIE_DAYS);
}
