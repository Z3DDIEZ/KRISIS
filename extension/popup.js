document.getElementById('clipBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = "Analyzing page...";
    
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script
    try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: "getPageDetails" });
        
        if (response) {
            statusDiv.textContent = "Data Captured! (Mock)";
            console.log("Captured Data:", response);
            // In real version, we would call the KRISIS API here
             statusDiv.textContent = `Found: ${response.title.substring(0, 30)}...`;
        } else {
            statusDiv.textContent = "Failed to capture data.";
        }
    } catch (error) {
        statusDiv.textContent = "Error: " + error.message;
    }
});
