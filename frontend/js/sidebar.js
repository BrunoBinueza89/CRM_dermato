export function initSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const toggle = document.getElementById("sidebarToggle");

  if (!sidebar || !toggle) return;

  const savedState = localStorage.getItem("SIDEBAR_STATE");
  if (savedState === "collapsed" || savedState === "expanded") {
    sidebar.dataset.state = savedState;
  }

  toggle.addEventListener("click", () => {
    const next = sidebar.dataset.state === "collapsed" ? "expanded" : "collapsed";
    sidebar.dataset.state = next;
    localStorage.setItem("SIDEBAR_STATE", next);
  });
}

export function setActiveRoute(route) {
  const items = document.querySelectorAll("[data-route]");
  for (const item of items) {
    const isActive = item.getAttribute("data-route") === route;
    item.classList.toggle("is-active", isActive);
  }
}

