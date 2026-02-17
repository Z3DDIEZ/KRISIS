// Basic content extractor
console.log("KRISIS Content Script Loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageDetails") {
    const details = {
      title: document.title,
      url: window.location.href,
      description: document.querySelector('meta[name="description"]')?.content || ""
    };
    sendResponse(details);
  }
});
