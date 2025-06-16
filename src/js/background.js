// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check if the page has finished loading and is on examtopics.com
    if (changeInfo.status === 'complete' && tab.url.includes('examtopics.com')) {
        // Open the popup
        chrome.action.openPopup();
    }
}); 