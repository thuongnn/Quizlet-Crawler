// Constants
const STORAGE_KEYS_LIST = 'storageKeysList';
const LAST_SELECTED_KEY = 'lastSelectedStorageKey';
const DEFAULT_STORAGE_KEY = 'quizletData';

// DOM Elements
let titleElement;
let crawlButton;
let buttonText;
let storageKeySelect;
let newStorageKeyInput;
let addStorageKeyButton;
let downloadButton;
let questionCountElement;
let deleteStorageKeyButton;

// Initialize DOM elements
function initializeElements() {
    titleElement = document.getElementById('title');
    crawlButton = document.getElementById('crawlButton');
    buttonText = crawlButton.querySelector('.button-text');
    storageKeySelect = document.getElementById('storageKey');
    newStorageKeyInput = document.getElementById('newStorageKey');
    addStorageKeyButton = document.getElementById('addStorageKey');
    downloadButton = document.getElementById('downloadButton');
    questionCountElement = document.getElementById('questionCount');
    deleteStorageKeyButton = document.getElementById('deleteStorageKey');
}

// Storage Management Functions
async function loadStorageKeys() {
    try {
        const result = await chrome.storage.local.get([STORAGE_KEYS_LIST, LAST_SELECTED_KEY]);
        const storageKeys = result[STORAGE_KEYS_LIST] || [DEFAULT_STORAGE_KEY];
        const lastSelectedKey = result[LAST_SELECTED_KEY] || DEFAULT_STORAGE_KEY;
        
        storageKeySelect.innerHTML = storageKeys.map(key => 
            `<option value="${key}">${key}</option>`
        ).join('');

        if (storageKeys.length === 0) {
            await chrome.storage.local.set({ [STORAGE_KEYS_LIST]: [DEFAULT_STORAGE_KEY] });
        }

        if (storageKeys.includes(lastSelectedKey)) {
            storageKeySelect.value = lastSelectedKey;
        }

        await updateQuestionCount();
    } catch (error) {
        console.error('Error loading storage keys:', error);
    }
}

async function saveSelectedStorageKey(key) {
    try {
        await chrome.storage.local.set({ [LAST_SELECTED_KEY]: key });
        await updateQuestionCount();
        await checkQuestionExists();
    } catch (error) {
        console.error('Error saving selected storage key:', error);
    }
}

async function addStorageKey() {
    const newKey = newStorageKeyInput.value.trim();
    if (!newKey) return;

    try {
        const result = await chrome.storage.local.get(STORAGE_KEYS_LIST);
        const storageKeys = result[STORAGE_KEYS_LIST] || [DEFAULT_STORAGE_KEY];

        if (!storageKeys.includes(newKey)) {
            storageKeys.push(newKey);
            await chrome.storage.local.set({ [STORAGE_KEYS_LIST]: storageKeys });
            await loadStorageKeys();
            storageKeySelect.value = newKey;
            await saveSelectedStorageKey(newKey);
            newStorageKeyInput.value = '';
        }
    } catch (error) {
        console.error('Error adding storage key:', error);
    }
}

// Question Management Functions
async function checkQuestionExists() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getTempData' });
        
        if (response && response.hash) {
            const storageKey = storageKeySelect.value;
            const result = await chrome.storage.local.get(storageKey);
            const existingData = result[storageKey] || {};
            
            const exists = response.hash in existingData;
            crawlButton.disabled = exists;
            buttonText.textContent = exists ? 'Already Crawled' : 'Crawl';
        } else {
            crawlButton.disabled = true;
            buttonText.textContent = 'No Question';
        }
    } catch (error) {
        console.error('Error checking question existence:', error);
        crawlButton.disabled = true;
        buttonText.textContent = 'Error';
    }
}

async function getCurrentQuestion() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getCurrentQuestion' });
        if (response && response.question) {
            titleElement.textContent = response.question;
        } else {
            titleElement.textContent = 'No question selected';
        }
        await checkQuestionExists();
    } catch (error) {
        titleElement.textContent = 'Error loading question';
        crawlButton.disabled = true;
        buttonText.textContent = 'Error';
    }
}

async function updateQuestionCount() {
    try {
        const storageKey = storageKeySelect.value;
        const result = await chrome.storage.local.get(storageKey);
        const quizletData = result[storageKey] || {};
        questionCountElement.textContent = Object.keys(quizletData).length;
    } catch (error) {
        console.error('Error updating question count:', error);
        questionCountElement.textContent = 0;
    }
}

// Event Handlers
async function handleCrawlButtonClick() {
    buttonText.textContent = 'Crawling...';
    crawlButton.disabled = true;

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getTempData' });

        if (response) {
            const storageKey = storageKeySelect.value;
            const result = await chrome.storage.local.get(storageKey);
            const existingData = result[storageKey] || {};

            if (!(response.hash in existingData)) {
                existingData[response.hash] = {
                    question: response.question,
                    answer: response.answer
                };
                await chrome.storage.local.set({ [storageKey]: existingData });
                await updateQuestionCount();
                buttonText.textContent = 'Crawl Done';
            } else {
                buttonText.textContent = 'Already Crawled';
            }
            crawlButton.disabled = true;
        }
    } catch (error) {
        console.error('Error:', error);
        buttonText.textContent = 'Error! Try Again';
        crawlButton.disabled = false;
    }
}

async function handleDownloadButtonClick() {
    const storageKey = storageKeySelect.value;
    const result = await chrome.storage.local.get(storageKey);
    const quizletData = result[storageKey] || {};

    if (Object.keys(quizletData).length === 0) {
        alert('No data to download!');
        return;
    }

    // Convert to text format
    const textRows = [];
    for (const key in quizletData) {
        const data = quizletData[key];
        textRows.push(data.question);
        textRows.push('-------------------'); // Separator between question and answer
        textRows.push(data.answer);
        textRows.push('==================='); // Separator between different questions
    }

    const textContent = textRows.join('\n');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storageKey}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// Delete storage key
async function deleteStorageKey() {
    const selectedKey = storageKeySelect.value;
    
    // Prevent deleting the default storage key
    if (selectedKey === DEFAULT_STORAGE_KEY) {
        alert('Cannot delete the default storage key!');
        return;
    }

    if (confirm(`Are you sure you want to delete "${selectedKey}"?`)) {
        try {
            // Get current storage keys list
            const result = await chrome.storage.local.get([STORAGE_KEYS_LIST, selectedKey]);
            const storageKeys = result[STORAGE_KEYS_LIST] || [DEFAULT_STORAGE_KEY];

            // Remove the key from the list
            const updatedKeys = storageKeys.filter(key => key !== selectedKey);
            await chrome.storage.local.set({ [STORAGE_KEYS_LIST]: updatedKeys });

            // Remove the storage data
            await chrome.storage.local.remove(selectedKey);

            // Reload storage keys and update UI
            await loadStorageKeys();
        } catch (error) {
            console.error('Error deleting storage key:', error);
            alert('Error deleting storage key. Please try again.');
        }
    }
}

// Event Listeners Setup
function setupEventListeners() {
    storageKeySelect.addEventListener('change', async () => {
        await saveSelectedStorageKey(storageKeySelect.value);
    });

    addStorageKeyButton.addEventListener('click', addStorageKey);
    newStorageKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addStorageKey();
        }
    });

    deleteStorageKeyButton.addEventListener('click', deleteStorageKey);

    crawlButton.addEventListener('click', handleCrawlButtonClick);
    downloadButton.addEventListener('click', handleDownloadButtonClick);
}

// Initialize Application
async function initializeApp() {
    initializeElements();
    setupEventListeners();
    await loadStorageKeys();
    await getCurrentQuestion();

    try {
        const result = await chrome.storage.local.get('tempQuizletData');
        const tempQuizletData = result.tempQuizletData;
        
        if (tempQuizletData && tempQuizletData.discussionText) {
            titleElement.textContent = tempQuizletData.discussionText;
        }
    } catch (error) {
        console.error('Error getting data from storage:', error);
    }
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp); 