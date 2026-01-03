/**
 * Votes Module
 * Handles upvotes, downvotes, and comments on projects
 * Stored in cookies until API integration
 */

import { getCookie, setCookie } from './cookies.js';
import { getUser } from './user.js';
import { getConfig } from './config.js';

const VOTES_COOKIE_NAME = 'cipmap_votes';
const COMMENTS_COOKIE_NAME = 'cipmap_comments';
const COOKIE_DAYS = 365;

// State
let userVotes = {}; // projectId -> 'up' | 'down' | null
let userComments = {}; // projectId -> [array of comment strings]

/**
 * Post vote to API server
 * @param {string} projectId - The project ID
 * @param {number} vote - 1 for upvote, -1 for downvote, 0 to clear
 */
async function postVoteToApi(projectId, vote) {
    const config = getConfig();
    if (!config.apiServer) {
        return;
    }
    
    const user = getUser();
    if (!user?.userId) {
        console.warn('No userId available for API vote');
        return;
    }
    
    try {
        const response = await fetch(`${config.apiServer}/api/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userid: user.userId,
                appid: 'cipmap',
                item_id: projectId,
                vote: vote
            })
        });
        
        if (!response.ok) {
            console.error('API vote failed:', response.status);
        }
    } catch (error) {
        console.error('API vote error:', error);
    }
}

/**
 * Fetch vote score from API server
 * @param {string} projectId - The project ID
 * @returns {Promise<Object|null>} - Vote data { upvotes, downvotes, score } or null
 */
export async function fetchVoteScore(projectId) {
    const config = getConfig();
    if (!config.apiServer) {
        return null;
    }
    
    try {
        const params = new URLSearchParams({
            appid: 'cipmap',
            item_id: projectId
        });
        
        const response = await fetch(`${config.apiServer}/api/vote?${params}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('API fetch vote score failed:', response.status);
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error('API fetch vote score error:', error);
        return null;
    }
}

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
    let apiVote;
    if (userVotes[projectId] === 'up') {
        // Toggle off
        delete userVotes[projectId];
        apiVote = 0;
    } else {
        userVotes[projectId] = 'up';
        apiVote = 1;
    }
    saveVotesToCookie();
    postVoteToApi(projectId, apiVote);
    return userVotes[projectId] || null;
}

/**
 * Set a downvote for a project
 */
export function downvote(projectId) {
    let apiVote;
    if (userVotes[projectId] === 'down') {
        // Toggle off
        delete userVotes[projectId];
        apiVote = 0;
    } else {
        userVotes[projectId] = 'down';
        apiVote = -1;
    }
    saveVotesToCookie();
    postVoteToApi(projectId, apiVote);
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
