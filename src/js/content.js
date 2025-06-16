// Constants
const SELECTORS = {
    DISCUSSION_LINK: '.discussion-link',
    CARD_TEXT: '.card-text',
    MULTI_CHOICE_ITEM: '.multi-choice-item',
    MULTI_CHOICE_LETTER: '.multi-choice-letter',
    CORRECT_HIDDEN: '.correct-hidden',
    QUESTION_HEADER: '.question-discussion-header'
};

// Data Management
let tempQuizletData = null;

// Utility Functions
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
}

// Discussion Links Functions
function getDiscussionLinks() {
    const links = [];
    const discussionElements = document.getElementsByClassName(SELECTORS.DISCUSSION_LINK);
    
    for (let element of discussionElements) {
        links.push({
            text: element.textContent.trim(),
            href: element.href
        });
    }
    
    return links;
}

function saveDiscussionLinks() {
    const links = getDiscussionLinks();
    chrome.storage.sync.set({ discussionLinks: links }, function() {
        // Thông báo cho popup biết đã có dữ liệu mới
        chrome.runtime.sendMessage({ action: 'linksUpdated', links: links });
    });
}

// Quizlet Data Extraction Functions
function extractQuizletData() {
    const questionElement = document.querySelector(SELECTORS.CARD_TEXT);
    if (!questionElement) {
        return null;
    }

    const question = questionElement.innerText.trim();
    const answers = extractAnswers();
    const correctAnswers = extractCorrectAnswers();

    return {
        question: `${question}\n${answers.join('\n')}`,
        answer: correctAnswers.join(',')
    };
}

function extractAnswers() {
    const answerElements = document.querySelectorAll(SELECTORS.MULTI_CHOICE_ITEM);
    return Array.from(answerElements).map((element) => {
        const letter = element.querySelector(SELECTORS.MULTI_CHOICE_LETTER).getAttribute('data-choice-letter');
        let text = element.innerText.replace(`${letter}.`, '').trim();
        text = text.replace('Most Voted', '').trim();
        return `${letter}. ${text}`;
    });
}

function extractCorrectAnswers() {
    const correctAnswers = [];
    const correctAnswerElements = document.querySelectorAll(SELECTORS.CORRECT_HIDDEN);
    correctAnswerElements.forEach((element) => {
        correctAnswers.push(element.querySelector(SELECTORS.MULTI_CHOICE_LETTER).getAttribute('data-choice-letter'));
    });
    return correctAnswers;
}

function getCurrentQuestion() {
    const questionElement = document.querySelector(SELECTORS.QUESTION_HEADER);
    if (!questionElement) {
        return null;
    }
    const questionDiv = questionElement.querySelector('div');
    if (!questionDiv) {
        return null;
    }
    const questionText = questionDiv.innerText.trim();
    const questionMatch = questionText.match(/Question #: (\d+)/);
    return questionMatch ? `Question #: ${questionMatch[1]}` : null;
}

// Message Handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getTempData') {
        const quizletData = extractQuizletData();
        if (quizletData) {
            const hash = hashString(quizletData.question);
            sendResponse({
                hash,
                ...quizletData
            });
        } else {
            sendResponse(null);
        }
    } else if (request.action === 'getCurrentQuestion') {
        const question = getCurrentQuestion();
        sendResponse({ question });
    }
    return true;
});

// Initialization
document.addEventListener('DOMContentLoaded', saveDiscussionLinks);
saveDiscussionLinks(); // Run immediately in case page is already loaded
extractQuizletData(); // Initial data extraction 