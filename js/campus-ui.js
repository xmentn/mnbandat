// =========================================================
// ĐIỀU HƯỚNG TAB KHU VỰC ĐIỂM TRƯỜNG
// =========================================================

const campusTabButtons = [...document.querySelectorAll("[data-campus-tab]")];
const campusTabPanels = [...document.querySelectorAll("[data-campus-panel]")];

function openCampusTab(tabName, updateHash = true) {
  const targetButton = campusTabButtons.find(
    (button) => button.dataset.campusTab === tabName,
  );

  const targetPanel = campusTabPanels.find(
    (panel) => panel.dataset.campusPanel === tabName,
  );

  if (!targetButton || !targetPanel) {
    return;
  }

  campusTabButtons.forEach((button) => {
    button.classList.toggle("active", button === targetButton);
  });

  campusTabPanels.forEach((panel) => {
    panel.hidden = panel !== targetPanel;
  });

  if (updateHash) {
    history.replaceState(null, "", `#${tabName}`);
  }
}

campusTabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openCampusTab(button.dataset.campusTab);
  });
});

const initialTab = window.location.hash.replace("#", "") || "overview";
openCampusTab(initialTab, false);
