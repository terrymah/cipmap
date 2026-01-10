/**
 * Votes Module
 * Handles upvotes, downvotes, and comments on projects
 * Stored in cookies until API integration
 */

import { getCookie, setCookie } from './cookies.js';
import { getUser } from './user.js';
import { getConfig, getAppId } from './config.js';
import { showApiError } from './debug.js';

function getVotesCookieName() {
    return `${getAppId()}_votes`;
}
function getCommentsCookieName() {
    return `${getAppId()}_comments`;
}
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
                appid: getAppId(),
                item_id: projectId,
                vote: vote
            })
        });
        
        if (!response.ok) {
            console.error('API vote failed:', response.status);
        }
    } catch (error) {
        console.error('API vote error:', error);
        showApiError('/api/vote POST', error);
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
            appid: getAppId(),
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
        showApiError('/api/vote GET', error);
        return null;
    }
}

/**
 * Fetch all vote scores from API server
 * @returns {Promise<Object>} - Map of item_id -> { upvotes, downvotes, score }
 */
export async function fetchAllVoteScores() {
    const config = getConfig();
    if (!config.apiServer) {
        return {};
    }
    
    try {
        const params = new URLSearchParams({
            appid: getAppId()
        });
        
        const response = await fetch(`${config.apiServer}/api/votes?${params}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('API fetch all vote scores failed:', response.status);
            return {};
        }
        
        const data = await response.json();
        // Convert array to map by item_id
        const scoreMap = {};
        if (Array.isArray(data)) {
            data.forEach(item => {
                scoreMap[item.item_id] = {
                    upvotes: item.upvotes || 0,
                    downvotes: item.downvotes || 0,
                    score: item.score || 0
                };
            });
        }
        return scoreMap;
    } catch (error) {
        console.error('API fetch all vote scores error:', error);
        showApiError('/api/votes GET', error);
        return {};
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
    const votesCookie = getCookie(getVotesCookieName());
    if (votesCookie) {
        try {
            userVotes = JSON.parse(votesCookie);
        } catch (e) {
            console.error('Failed to parse votes cookie:', e);
            userVotes = {};
        }
    }
    
    // Load comments
    const commentsCookie = getCookie(getCommentsCookieName());
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
 * Get the cookie name for tracking vote recovery
 */
function getVotesRecoveredCookieName() {
    return `${getAppId()}_votes_recovered`;
}

/**
 * Resubmit all votes from cookies to the API server
 * This is a one-time recovery function for when server data is lost
 * Sets a cookie to prevent re-running
 */
export async function recoverVotesToServer() {
    const config = getConfig();
    if (!config.apiServer) {
        return;
    }
    
    // Check if already recovered
    if (getCookie(getVotesRecoveredCookieName())) {
        return;
    }
    
    const user = getUser();
    if (!user?.userId) {
        // No user yet, can't recover
        return;
    }
    
    // Get votes from cookie
    const voteCount = Object.keys(userVotes).length;
    if (voteCount === 0) {
        // No votes to recover, mark as done
        setCookie(getVotesRecoveredCookieName(), 'true', COOKIE_DAYS);
        return;
    }
    
    console.log(`Recovering ${voteCount} votes to server...`);
    
    let successCount = 0;
    let failCount = 0;
    
    // Resubmit each vote
    for (const [projectId, vote] of Object.entries(userVotes)) {
        const apiVote = vote === 'up' ? 1 : vote === 'down' ? -1 : 0;
        if (apiVote !== 0) {
            try {
                const response = await fetch(`${config.apiServer}/api/vote`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userid: user.userId,
                        appid: getAppId(),
                        item_id: projectId,
                        vote: apiVote
                    })
                });
                if (response.ok) {
                    successCount++;
                } else {
                    failCount++;
                    console.error(`Failed to recover vote for ${projectId}: HTTP ${response.status}`);
                }
                // Small delay to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 50));
            } catch (error) {
                failCount++;
                console.error(`Failed to recover vote for ${projectId}:`, error);
            }
        }
    }
    
    console.log(`Vote recovery complete: ${successCount} succeeded, ${failCount} failed`);
    
    // Only mark as recovered if we had some success (or no votes to recover)
    // If all failed, we'll try again next time
    if (successCount > 0 || failCount === 0) {
        setCookie(getVotesRecoveredCookieName(), 'true', COOKIE_DAYS);
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
    setCookie(getVotesCookieName(), JSON.stringify(userVotes), COOKIE_DAYS);
}

/**
 * Save comments to cookie
 */
function saveCommentsToCookie() {
    setCookie(getCommentsCookieName(), JSON.stringify(userComments), COOKIE_DAYS);
}
