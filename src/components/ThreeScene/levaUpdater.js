/**
 * Helper to update Leva controls programmatically
 * This works by finding the Leva store and updating values directly
 */

let levaStore = null;

// Try to get Leva store - this is a bit hacky but works
export function getLevaStore() {
  if (levaStore) return levaStore;

  // Try to find Leva store in window (if exposed)
  if (typeof window !== "undefined" && window.__LEVA_STORE__) {
    levaStore = window.__LEVA_STORE__;
    return levaStore;
  }

  // Try to find it via DOM inspection (fallback)
  // This is a workaround - ideally we'd use Leva's API
  return null;
}

/**
 * Update a Leva control value by finding the input and updating it
 * @param {string} folder - The folder name (e.g., "Text Settings")
 * @param {string} controlName - The control name (e.g., "headerPositionX")
 * @param {number} value - The new value
 */
export function updateLevaControl(folder, controlName, value) {
  if (typeof window === "undefined") return;

  // Find Leva root
  const levaRoot =
    document.querySelector("[data-leva-root]") ||
    document.querySelector('[class*="leva"]') ||
    document.body;

  if (!levaRoot) return;

  // Find the folder
  const allElements = levaRoot.querySelectorAll("*");
  let targetInput = null;

  for (const el of allElements) {
    const text = el.textContent || "";
    if (text.includes(folder)) {
      // Found the folder, now find the control
      let current = el;
      for (let i = 0; i < 10 && current; i++) {
        // Look for input elements with the control name
        const inputs = current.querySelectorAll('input[type="number"]');
        for (const input of inputs) {
          // Check if this input is for our control
          // Leva typically has a label or data attribute
          const label = input
            .closest('[class*="control"]')
            ?.querySelector('[class*="label"]');
          if (label && label.textContent?.includes(controlName.split(/(?=[A-Z])/).join(" "))) {
            targetInput = input;
            break;
          }
        }
        if (targetInput) break;
        current = current.parentElement;
      }
      if (targetInput) break;
    }
  }

  if (targetInput) {
    // Update the input value
    targetInput.value = value;
    // Trigger input and change events to update Leva
    targetInput.dispatchEvent(new Event("input", { bubbles: true }));
    targetInput.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

/**
 * Better approach: Use Leva's button API to update controls
 * This dispatches events that Leva controllers can listen to
 */
export function dispatchLevaUpdate(folder, updates) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("levaControlUpdate", {
      detail: { folder, updates },
    })
  );
}

