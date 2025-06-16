// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check if the page has finished loading
    if (changeInfo.status === 'complete') {
        if (tab.url && tab.url.includes('examtopics.com')) {
            // Enable extension for examtopics.com
            chrome.action.enable(tabId);
            // Open the popup
            chrome.action.openPopup().catch(() => {
                // Silently ignore the error
            });
        } else {
            // Disable extension for other sites
            chrome.action.disable(tabId);
        }
    }
});

// Listen for tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab.url && tab.url.includes('examtopics.com')) {
            chrome.action.enable(tab.id);
        } else {
            chrome.action.disable(tab.id);
        }
    });
}); 