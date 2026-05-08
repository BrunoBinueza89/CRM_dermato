function ensureRegion() {
  const existing = document.getElementById("toastRegion");
  if (existing) return existing;

  const region = document.createElement("div");
  region.id = "toastRegion";
  region.className = "toast-region";
  region.setAttribute("role", "status");
  region.setAttribute("aria-live", "polite");
  region.setAttribute("aria-relevant", "additions text");

  document.body.appendChild(region);
  return region;
}

function createToast({ type = "info", title = "", message = "", timeoutMs = 3500 } = {}) {
  const region = ensureRegion();

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;

  const heading = document.createElement("div");
  heading.className = "toast__title";
  heading.textContent = title || (type === "error" ? "Erro" : type === "success" ? "Sucesso" : "Aviso");

  const body = document.createElement("div");
  body.className = "toast__message";
  body.textContent = message || "";

  const close = document.createElement("button");
  close.type = "button";
  close.className = "toast__close";
  close.setAttribute("aria-label", "Fechar");
  close.textContent = "×";

  const remove = () => {
    toast.classList.add("is-leaving");
    window.setTimeout(() => toast.remove(), 180);
  };

  close.onclick = remove;

  toast.appendChild(heading);
  toast.appendChild(body);
  toast.appendChild(close);

  region.appendChild(toast);

  if (timeoutMs > 0) {
    window.setTimeout(remove, timeoutMs);
  }

  return toast;
}

export const toast = {
  success: (message, options) => createToast({ ...(options || {}), type: "success", message }),
  error: (message, options) => createToast({ ...(options || {}), type: "error", message, timeoutMs: 6000 }),
  info: (message, options) => createToast({ ...(options || {}), type: "info", message }),
};

