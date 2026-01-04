/**
 * Tests for votes.js
 */

import { testHarness, assert } from './test-harness.js';
import { 
    loadVotesAndComments, 
    getVote, 
    upvote, 
    downvote, 
    getComments, 
    addComment, 
    hasComments 
} from '../js/votes.js';
import { getAppId } from '../js/config.js';

const { describe, it, beforeEach } = testHarness;

// Helper to clear vote cookies
function clearVoteCookies() {
    const appId = getAppId();
    document.cookie = `${appId}_votes=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    document.cookie = `${appId}_comments=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

describe('getVote', () => {
    beforeEach(() => {
        clearVoteCookies();
        loadVotesAndComments();
    });

    it('returns null for projects with no vote', () => {
        assert.equal(getVote('project-1'), null);
        assert.equal(getVote('nonexistent'), null);
    });

    it('returns up after upvoting', () => {
        upvote('project-1');
        assert.equal(getVote('project-1'), 'up');
    });

    it('returns down after downvoting', () => {
        downvote('project-1');
        assert.equal(getVote('project-1'), 'down');
    });
});

describe('upvote', () => {
    beforeEach(() => {
        clearVoteCookies();
        loadVotesAndComments();
    });

    it('sets vote to up', () => {
        const result = upvote('project-1');
        assert.equal(result, 'up');
        assert.equal(getVote('project-1'), 'up');
    });

    it('toggles off when already upvoted', () => {
        upvote('project-1');
        const result = upvote('project-1');
        assert.equal(result, null);
        assert.equal(getVote('project-1'), null);
    });

    it('changes downvote to upvote', () => {
        downvote('project-1');
        assert.equal(getVote('project-1'), 'down');
        const result = upvote('project-1');
        assert.equal(result, 'up');
        assert.equal(getVote('project-1'), 'up');
    });

    it('handles multiple projects independently', () => {
        upvote('project-1');
        downvote('project-2');
        assert.equal(getVote('project-1'), 'up');
        assert.equal(getVote('project-2'), 'down');
        assert.equal(getVote('project-3'), null);
    });
});

describe('downvote', () => {
    beforeEach(() => {
        clearVoteCookies();
        loadVotesAndComments();
    });

    it('sets vote to down', () => {
        const result = downvote('project-1');
        assert.equal(result, 'down');
        assert.equal(getVote('project-1'), 'down');
    });

    it('toggles off when already downvoted', () => {
        downvote('project-1');
        const result = downvote('project-1');
        assert.equal(result, null);
        assert.equal(getVote('project-1'), null);
    });

    it('changes upvote to downvote', () => {
        upvote('project-1');
        assert.equal(getVote('project-1'), 'up');
        const result = downvote('project-1');
        assert.equal(result, 'down');
        assert.equal(getVote('project-1'), 'down');
    });
});

describe('getComments', () => {
    beforeEach(() => {
        clearVoteCookies();
        loadVotesAndComments();
    });

    it('returns empty array for projects with no comments', () => {
        const comments = getComments('project-1');
        assert.ok(Array.isArray(comments), 'Should return an array');
        assert.equal(comments.length, 0);
    });

    it('returns comments after adding them', () => {
        addComment('project-1', 'First comment');
        const comments = getComments('project-1');
        assert.equal(comments.length, 1);
        assert.equal(comments[0].text, 'First comment');
    });
});

describe('addComment', () => {
    beforeEach(() => {
        clearVoteCookies();
        loadVotesAndComments();
    });

    it('adds a comment with text and timestamp', () => {
        addComment('project-1', 'Test comment');
        const comments = getComments('project-1');
        assert.equal(comments.length, 1);
        assert.equal(comments[0].text, 'Test comment');
        assert.ok(comments[0].timestamp, 'Should have a timestamp');
    });

    it('adds multiple comments to same project', () => {
        addComment('project-1', 'First');
        addComment('project-1', 'Second');
        addComment('project-1', 'Third');
        const comments = getComments('project-1');
        assert.equal(comments.length, 3);
        assert.equal(comments[0].text, 'First');
        assert.equal(comments[1].text, 'Second');
        assert.equal(comments[2].text, 'Third');
    });

    it('trims whitespace from comments', () => {
        addComment('project-1', '  spaces around  ');
        const comments = getComments('project-1');
        assert.equal(comments[0].text, 'spaces around');
    });

    it('ignores empty or whitespace-only comments', () => {
        addComment('project-1', '');
        addComment('project-1', '   ');
        addComment('project-1', null);
        const comments = getComments('project-1');
        assert.equal(comments.length, 0);
    });

    it('handles multiple projects independently', () => {
        addComment('project-1', 'Comment on 1');
        addComment('project-2', 'Comment on 2');
        assert.equal(getComments('project-1').length, 1);
        assert.equal(getComments('project-2').length, 1);
        assert.equal(getComments('project-3').length, 0);
    });
});

describe('hasComments', () => {
    beforeEach(() => {
        clearVoteCookies();
        loadVotesAndComments();
    });

    it('returns false for projects with no comments', () => {
        assert.equal(hasComments('project-1'), false);
    });

    it('returns true after adding a comment', () => {
        addComment('project-1', 'A comment');
        assert.equal(hasComments('project-1'), true);
    });

    it('returns false for different project', () => {
        addComment('project-1', 'A comment');
        assert.equal(hasComments('project-2'), false);
    });
});

describe('vote persistence', () => {
    beforeEach(() => {
        clearVoteCookies();
    });

    it('persists votes to cookies', () => {
        loadVotesAndComments();
        upvote('project-1');
        downvote('project-2');
        
        // Reload from cookies
        loadVotesAndComments();
        
        assert.equal(getVote('project-1'), 'up');
        assert.equal(getVote('project-2'), 'down');
    });

    it('persists comments to cookies', () => {
        loadVotesAndComments();
        addComment('project-1', 'Persisted comment');
        
        // Reload from cookies
        loadVotesAndComments();
        
        const comments = getComments('project-1');
        assert.equal(comments.length, 1);
        assert.equal(comments[0].text, 'Persisted comment');
    });
});
