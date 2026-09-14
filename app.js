(() => {
  // Email ensamblado: no aparece en texto plano en el HTML.
  const addr = ["alvaro-96", "outlook.es"].join("@");
  document.querySelectorAll("[data-mail]").forEach(a => { a.href = "mailto:" + addr; if (a.dataset.mail === "show") a.textContent = addr; });

  // Reveal al scroll.
  const io = "IntersectionObserver" in window ? new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" }) : null;
  document.querySelectorAll(".reveal").forEach(el => io ? io.observe(el) : el.classList.add("in"));

  document.querySelectorAll("[data-year]").forEach(el => { el.textContent = String(new Date().getFullYear()); });
})();
