document.getElementById('clipBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = "Connecting to KRISIS...";
    
    try {
        // Get active tab URL
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab && tab.url) {
            const encodedUrl = encodeURIComponent(tab.url);
            // Redirect to KRISIS New Application page with import parameter
            const krisisUrl = `http://localhost:5173/applications/new?importUrl=${encodedUrl}`;
            
            await chrome.tabs.create({ url: krisisUrl });
            
            statusDiv.textContent = "Sent to KRISIS!";
            setTimeout(() => window.close(), 1000);
        } else {
            statusDiv.textContent = "Could not detect URL.";
        }
    } catch (error) {
        statusDiv.textContent = "Error: " + error.message;
    }
});
