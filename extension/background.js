// Background service worker
console.log("KRISIS Background Worker Active");

chrome.runtime.onInstalled.addListener(() => {
  console.log("KRISIS Clipper Installed");
});
