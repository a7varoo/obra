// Los nodos y las aristas del pipeline. La escena 3D y la interfaz leen de aquí; nada está inventado
// en la escena: es la arquitectura de ACR management con nombres genéricos.
export const NODOS = [
  { id: "erp", etiqueta: "ERP de obra", capa: "Fuente", pos: [-7, 3.0, 0], color: 0x6f8296,
    texto: "El programa donde la oficina técnica lleva presupuestos, certificaciones y costes de cada obra. Suele ser antiguo, con una base de datos que nadie quiere tocar.",
    decision: "Se lee por vistas de solo lectura acordadas con el cliente. Nunca se escribe en él." },
  { id: "contab", etiqueta: "Contabilidad", capa: "Fuente", pos: [-7, 1.5, 0], color: 0x6f8296,
    texto: "La contabilidad y la gestión de la empresa. Aquí viven las cuentas analíticas que deberían corresponder a cada obra, y a menudo faltan.",
    decision: "Se accede por su API oficial. Si algún día se escribe, es con autorización expresa y solo ahí." },
  { id: "excel", etiqueta: "Hojas de cálculo", capa: "Fuente", pos: [-7, 0, 0], color: 0x6f8296,
    texto: "Presupuestos que no están en el ERP, comparativos de compras, control de horas. Es donde vive lo que ningún sistema recoge.",
    decision: "Se importan con un código y una fecha; cada fila importada sabe de qué hoja salió." },
  { id: "correo", etiqueta: "Correo", capa: "Fuente", pos: [-7, -1.5, 0], color: 0x6f8296,
    texto: "Pedidos a proveedor, certificaciones al promotor, incidencias. La mitad de las decisiones de una obra pasan por aquí.",
    decision: "El agente puede leer y dejar borradores. Nunca envía nada sin una persona." },
  { id: "whatsapp", etiqueta: "WhatsApp de obra", capa: "Fuente", pos: [-7, -3.0, 0], color: 0x6f8296,
    texto: "El jefe de obra manda fotos, audios y avisos por el móvil. Es dato, aunque nadie lo trate como tal.",
    decision: "Fase posterior: transcribir, clasificar y escalar. Sin sustituir el número ni el flujo actual." },
  { id: "adapt", etiqueta: "Adaptadores · solo lectura", capa: "Integración", pos: [-3.3, 0, 0], color: 0xf2b544,
    texto: "Un adaptador por sistema. Cada uno sabe leer su fuente y traducirla al mismo modelo. Un perfil por instalación dice qué sistema manda sobre cada entidad y qué significa «obra viva».",
    decision: "Antes de vender, un comando explora la instalación con un usuario de solo lectura y dice si es viable con esos datos." },
  { id: "canon", etiqueta: "Modelo canónico · PostgreSQL", capa: "Datos", pos: [0.4, 0.7, 0], color: 0xf2b544,
    texto: "Una sola forma de decir obra, presupuesto, certificación y coste, venga de donde venga. Con SQL a la vista y migraciones numeradas.",
    decision: "Cada fila sabe de qué sistema salió y cuándo se sincronizó. Lo que no se ha observado se declara como no disponible, no se rellena." },
  { id: "audit", etiqueta: "Auditoría · hash", capa: "Datos", pos: [0.4, -2.3, 0], color: 0xb8842a,
    texto: "Cada vínculo confirmado, cada certificación emitida y cada pregunta al agente quedan en un registro que solo crece, encadenado por hash.",
    decision: "Se puede verificar en cualquier momento que nadie lo ha tocado. Es lo que permite defender una cifra delante de un promotor." },
  { id: "herr", etiqueta: "Herramientas de lectura", capa: "Agente", pos: [3.8, 0.7, 0], color: 0x5fded0,
    texto: "Seis consultas cerradas sobre el modelo: obras, presupuestos, certificaciones, costes, vínculos y descuadres. Cada una devuelve datos y su origen.",
    decision: "El modelo elige la herramienta; nunca escribe SQL. Cada cifra que dice viene de una de estas." },
  { id: "agente", etiqueta: "Agente", capa: "Agente", pos: [7, 1.9, 0], color: 0x5fded0,
    texto: "Contesta preguntas sobre la cartera con lenguaje normal. Sabe qué fecha tienen los datos porque se le inyecta; si no se le dijera, se la inventaría.",
    decision: "No calcula ni una cifra. No estima nada futuro. No arranca hasta que el cliente declara su conformidad RGPD." },
  { id: "persona", etiqueta: "Persona · confirma", capa: "Agente", pos: [7, -1.6, 0], color: 0xe8e0d0,
    texto: "Quien decide. Confirma o rechaza cada vínculo propuesto, valida cada certificación por rol, aprueba cada envío.",
    decision: "El sistema propone con evidencia; nunca decide solo. Un falso positivo metería el coste de una obra en otra." },
];

export const ARISTAS = [
  ["erp", "adapt"], ["contab", "adapt"], ["excel", "adapt"], ["correo", "adapt"], ["whatsapp", "adapt"],
  ["adapt", "canon"], ["canon", "audit"], ["canon", "herr"], ["herr", "agente"], ["agente", "persona"],
  ["persona", "canon"], ["persona", "audit"],
];

export const CAPAS = [
  { etiqueta: "Fuentes", x: -7 }, { etiqueta: "Integración", x: -3.3 }, { etiqueta: "Datos", x: 0.4 }, { etiqueta: "Agente", x: 5.4 },
];

export const PREGUNTAS = {
  certificado: {
    ruta: ["agente", "herr", "canon", "adapt", "erp", "adapt", "canon", "herr", "agente", "persona"],
    respuesta: "Certificado a origen a 31 de agosto: 412.300 € en seis certificaciones emitidas. El coste laboral no está en el ERP: no entra en el margen y el informe lo declara.",
    origen: ["tabla certificaciones", "sincronizada del ERP el 1 de septiembre", "herramienta certificaciones_de_obra"],
  },
  descuadre: {
    ruta: ["agente", "herr", "canon", "herr", "agente", "persona"],
    respuesta: "Dos de dieciocho presupuestos vivos: la obra 07 (cabecera 1.250.000 €, capítulos 1.238.400 €) y la obra 15 (cabecera 640.000 €, capítulos 655.100 €). Los cuatro que llevan ajuste de oferta no cuentan como descuadre: así cierra la empresa una oferta.",
    origen: ["tablas presupuestos y capitulos", "herramienta presupuestos_descuadrados"],
  },
  futuro: {
    ruta: ["agente", "herr", "canon", "herr", "agente", "persona"],
    respuesta: "No lo sé, y no lo estimo: no hay ningún coste futuro registrado. Lo que consta a 31 de agosto: material 188.400 €, subcontratas 96.200 €, laboral no disponible. Si hace falta una previsión, la registra una persona y entonces podré citarla.",
    origen: ["tabla costes", "regla 01: nunca inventa cifras"],
  },
};
