// Constants
const STORAGE_KEYS_LIST = 'storageKeysList';
const LAST_SELECTED_KEY = 'lastSelectedStorageKey';
const DEFAULT_STORAGE_KEY = 'quizletData';
const LAST_SEARCH_KEY = 'lastSearchKey';
const AUTO_NEXT_ENABLED = 'autoNextEnabled';

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
let searchKeyInput;
let autoNextCheckbox;
let searchSection;

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
    searchKeyInput = document.getElementById('searchKey');
    autoNextCheckbox = document.getElementById('autoNextCheckbox');
    searchSection = document.querySelector('.search-section');
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
            if (exists) {
                buttonText.textContent = autoNextCheckbox.checked ? 'Next' : 'Already Crawled';
                crawlButton.disabled = !autoNextCheckbox.checked;
                titleElement.textContent = titleElement.textContent.replace(' (Already Crawled)', '') + ' (Already Crawled)';
            } else {
                buttonText.textContent = autoNextCheckbox.checked ? 'Crawl & Next' : 'Crawl';
                crawlButton.disabled = false;
                titleElement.textContent = titleElement.textContent.replace(' (Already Crawled)', '');
            }
        } else {
            crawlButton.disabled = true;
            buttonText.textContent = 'No Question';
            titleElement.textContent = titleElement.textContent.replace(' (Already Crawled)', '');
        }
    } catch (error) {
        console.error('Error checking question existence:', error);
        crawlButton.disabled = true;
        buttonText.textContent = 'Error';
        titleElement.textContent = titleElement.textContent.replace(' (Already Crawled)', '');
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

// Load auto-next setting
async function loadAutoNextSetting() {
    try {
        const result = await chrome.storage.local.get(AUTO_NEXT_ENABLED);
        const enabled = result[AUTO_NEXT_ENABLED] || false;
        autoNextCheckbox.checked = enabled;
        searchSection.style.display = enabled ? 'block' : 'none';
    } catch (error) {
        console.error('Error loading auto-next setting:', error);
    }
}

// Save auto-next setting
async function saveAutoNextSetting(enabled) {
    try {
        await chrome.storage.local.set({ [AUTO_NEXT_ENABLED]: enabled });
        searchSection.style.display = enabled ? 'block' : 'none';
    } catch (error) {
        console.error('Error saving auto-next setting:', error);
    }
}

// Event Handlers
async function handleCrawlButtonClick() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getTempData' });
    
    if (!response) return;

    const storageKey = storageKeySelect.value;
    const result = await chrome.storage.local.get(storageKey);
    const existingData = result[storageKey] || {};
    const exists = response.hash in existingData;

    if (!exists) {
        buttonText.textContent = 'Crawling...';
        crawlButton.disabled = true;

        try {
            existingData[response.hash] = {
                question: response.question,
                answer: response.answer
            };
            await chrome.storage.local.set({ [storageKey]: existingData });
            await updateQuestionCount();
            buttonText.textContent = autoNextCheckbox.checked ? 'Next' : 'Crawl Done';
            crawlButton.disabled = autoNextCheckbox.checked ? false : true;
        } catch (error) {
            console.error('Error:', error);
            buttonText.textContent = 'Error! Try Again';
            crawlButton.disabled = false;
            return;
        }
    }

    // If auto-next is enabled or question already exists, perform next action
    if (autoNextCheckbox.checked || exists) {
        const searchKey = searchKeyInput.value.trim();
        if (searchKey) {
            await saveSearchKey(searchKey);
            try {
                await chrome.tabs.sendMessage(tab.id, { 
                    action: 'nextQuestion',
                    searchKey: searchKey
                });
            } catch (error) {
                console.error('Error performing next action:', error);
            }
        }
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
        textRows.push(data.answer);
        textRows.push('-------------------'); // Separator between answer and question
        textRows.push(data.question);
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

// Load last search key
async function loadLastSearchKey() {
    try {
        const result = await chrome.storage.local.get(LAST_SEARCH_KEY);
        if (result[LAST_SEARCH_KEY]) {
            searchKeyInput.value = result[LAST_SEARCH_KEY];
        }
    } catch (error) {
        console.error('Error loading last search key:', error);
    }
}

// Save search key
async function saveSearchKey(key) {
    try {
        await chrome.storage.local.set({ [LAST_SEARCH_KEY]: key });
    } catch (error) {
        console.error('Error saving search key:', error);
    }
}

// Next Function
async function handleNextButtonClick() {
    console.log('Next button clicked');
    const searchKey = searchKeyInput.value.trim();
    console.log('Search key:', searchKey);
    
    if (searchKey) {
        await saveSearchKey(searchKey);
    }
    
    try {
        console.log('Querying active tab');
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log('Active tab:', tab);

        // Inject content script if not already injected
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['src/js/content.js']
            });
            console.log('Content script injected');
        } catch (error) {
            console.log('Content script might already be injected:', error);
        }
        
        console.log('Sending message to content script');
        await chrome.tabs.sendMessage(tab.id, { 
            action: 'nextQuestion',
            searchKey: searchKey
        });
        console.log('Message sent successfully');
    } catch (error) {
        console.error('Error going to next question:', error);
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
    
    autoNextCheckbox.addEventListener('change', async (e) => {
        await saveAutoNextSetting(e.target.checked);
        await checkQuestionExists(); // Update button text when checkbox changes
    });
}

// Initialize app
async function initializeApp() {
    initializeElements();
    setupEventListeners();
    await loadStorageKeys();
    await loadLastSearchKey();
    await loadAutoNextSetting();
    await getCurrentQuestion();
}

// Start the app
initializeApp(); 