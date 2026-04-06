const input = document.getElementById("videoUrl");
const opacitySlider = document.getElementById("overlayOpacity");
const opacityLabel = document.getElementById("opacityLabel");
const hoverToggle = document.getElementById("onlyShowVideoOnHover");

function clampOpacity(n) {
  const x = Math.round(Number(n));
  if (Number.isNaN(x)) return 85;
  return Math.min(100, Math.max(0, x));
}

function syncOpacityLabel() {
  opacityLabel.textContent = String(opacitySlider.value);
}

chrome.storage.local.get(["videoUrl", "overlayOpacity", "onlyShowVideoOnHover"], (data) => {
  if (data.videoUrl) {
    input.value = data.videoUrl;
  }
  const pct = typeof data.overlayOpacity === "number" ? clampOpacity(data.overlayOpacity) : 85;
  opacitySlider.value = String(pct);
  syncOpacityLabel();
  if (typeof data.onlyShowVideoOnHover === "boolean") {
    hoverToggle.checked = data.onlyShowVideoOnHover;
  } else {
    hoverToggle.checked = true;
  }
});

opacitySlider.addEventListener("input", () => {
  syncOpacityLabel();
  const v = clampOpacity(opacitySlider.value);
  chrome.storage.local.set({ overlayOpacity: v });
});

hoverToggle.addEventListener("change", () => {
  chrome.storage.local.set({ onlyShowVideoOnHover: hoverToggle.checked });
});

document.getElementById("saveUrl").addEventListener("click", () => {
  const videoUrl = input.value.trim();
  const overlayOpacity = clampOpacity(opacitySlider.value);
  const onlyShowVideoOnHover = hoverToggle.checked;
  if (videoUrl) {
    chrome.storage.local.set({ videoUrl, overlayOpacity, onlyShowVideoOnHover }, () => {
      window.close();
    });
  } else {
    chrome.storage.local.set({ overlayOpacity, onlyShowVideoOnHover }, () => {
      window.close();
    });
  }
});
