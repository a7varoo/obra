// Interfaz del pipeline: la tarjeta del nodo y las preguntas al agente. Funciona con o sin la escena 3D.
import { NODOS, PREGUNTAS } from "./pipeline-datos.js";

export function montarUI() {
  const $ = (id) => document.getElementById(id);
  const titulo = $("card-title"), capa = $("card-capa"), texto = $("card-text"), decision = $("card-decision");
  const answer = $("answer"), ruta = $("answer-route"), resp = $("answer-text"), origen = $("answer-origin");
  const botones = [...document.querySelectorAll(".ask")];
  const nombre = (id) => (NODOS.find((n) => n.id === id) || { etiqueta: id }).etiqueta;
  let escena = null;

  function mostrarNodo(n) {
    titulo.textContent = n.etiqueta;
    capa.textContent = n.capa;
    texto.textContent = n.texto;
    decision.textContent = n.decision;
    decision.hidden = false;
  }

  async function preguntar(clave) {
    const p = PREGUNTAS[clave];
    if (!p) return;
    botones.forEach((b) => { b.disabled = true; b.classList.toggle("activa", b.dataset.pregunta === clave); });
    answer.hidden = false;
    ruta.textContent = "consultando…";
    resp.textContent = "";
    origen.innerHTML = "";
    const pasos = [];
    for (let i = 0; i < p.ruta.length; i++) {
      const id = p.ruta[i];
      if (pasos[pasos.length - 1] !== nombre(id)) pasos.push(nombre(id));
    }
    ruta.textContent = pasos.join(" → ");
    if (escena) {
      try { await escena.iluminarRuta(p.ruta); } catch (_) { /* la respuesta se enseña igual */ }
    }
    resp.textContent = p.respuesta;
    origen.innerHTML = p.origen.map((o) => `<span class="chip">${o}</span>`).join("");
    botones.forEach((b) => { b.disabled = false; });
  }

  botones.forEach((b) => b.addEventListener("click", () => preguntar(b.dataset.pregunta)));

  return { mostrarNodo, conectar(e) { escena = e; } };
}
