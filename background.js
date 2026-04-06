function canInjectIntoTab(tab) {
  const url = tab?.url;
  if (!url) return false;
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "insert-youtube-overlay",
      title: "Choose where the video appears",
      contexts: ["all"],
      documentUrlPatterns: ["http://*/*", "https://*/*"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "insert-youtube-overlay" || tab?.id == null) return;
  if (!canInjectIntoTab(tab)) return;

  chrome.scripting
    .executeScript({
      target: { tabId: tab.id },
      func: () => {
        window.enableSelectionMode && window.enableSelectionMode();
      },
    })
    .catch(() => {
      /* restricted tab, PDF viewer, etc. */
    });
});
