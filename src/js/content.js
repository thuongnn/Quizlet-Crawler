// Constants
const SELECTORS = {
    DISCUSSION_LINK: '.discussion-link',
    CARD_TEXT: '.card-text',
    MULTI_CHOICE_ITEM: '.multi-choice-item',
    MULTI_CHOICE_LETTER: '.multi-choice-letter',
    CORRECT_HIDDEN: '.correct-hidden',
    QUESTION_HEADER: '.question-discussion-header',
    SEARCH_INPUT: 'input[type="search"]',
    NEXT_BUTTON: 'a[href*="next"]'
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

// Next Function
function goToNextQuestion(searchKey) {
    console.log('Going to next question with search key:', searchKey);
    
    // Get current question number
    const questionElement = document.querySelector(SELECTORS.QUESTION_HEADER);
    let nextQuestionNumber = '';
    
    if (questionElement) {
        const questionDiv = questionElement.querySelector('div');
        if (questionDiv) {
            const questionText = questionDiv.innerText.trim();
            const questionMatch = questionText.match(/Question #: (\d+)/);
            if (questionMatch) {
                const currentNumber = parseInt(questionMatch[1]);
                nextQuestionNumber = (currentNumber + 1).toString();
                console.log('Current question number:', currentNumber);
                console.log('Next question number:', nextQuestionNumber);
            }
        }
    }
    
    if (searchKey) {
        // Combine search key with next question number
        const fullSearchKey = nextQuestionNumber ? `${searchKey} ${nextQuestionNumber}` : searchKey;
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(fullSearchKey)}`;
        console.log('Redirecting to:', searchUrl);
        window.location.href = searchUrl;
    }
}

// Message Handler
console.log('Setting up message listener in content script');
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
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
    } else if (request.action === 'nextQuestion') {
        console.log('Handling nextQuestion action');
        goToNextQuestion(request.searchKey);
        sendResponse({ success: true });
    }
    return true;
});

// Log when content script is loaded
console.log('Content script loaded');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded in content script');
    saveDiscussionLinks();
    extractQuizletData();
}); 