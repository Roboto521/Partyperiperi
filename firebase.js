import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, get, set, update, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

const firebaseConfig = {
  apiKey            : "AIzaSyD7HAFjgYC_9Ly4BcosgUpPP2wYk7ZJubY",
  authDomain        : "gomas-2530d.firebaseapp.com",
  databaseURL       : "https://gomas-2530d-default-rtdb.firebaseio.com",
  projectId         : "gomas-2530d",
  storageBucket     : "gomas-2530d.appspot.com",
  messagingSenderId : "856600921569",
  appId             : "1:856600921569:web:3e57244a3f29db5a35fea0"
};

const db = getDatabase(initializeApp(firebaseConfig));
window._db = db;

/* ===== HELPER: suma de items sin errores de punto flotante ===== */
function calcularTotal(items) {
  let centavos = 0;
  (items || []).forEach(item => {
    centavos += Math.round(item.price * 100) * (item.quantity || 1);
  });
  return centavos / 100;
}

/* ===== CHEQUEO DE MANTENIMIENTO ===== */
onValue(ref(db, "config/mantenimiento"), (snap) => {
  const enMantenimiento = snap.val();
  const enPaginaMant    = window.location.pathname.includes("mantenimiento.html");
  if (enMantenimiento && !enPaginaMant) window.location.href = "mantenimiento.html";
  if (!enMantenimiento && enPaginaMant) window.location.href = "index.html";
});

/* ===== REORDENAR TARJETAS POR STOCK ===== */
function reordenarProductosPorStock(stockData) {
  document.querySelectorAll(".tab-content:not(#masvendidos)").forEach(grid => {
    const cards = Array.from(grid.querySelectorAll(".product"));
    if (cards.length === 0) return;

    cards.sort((a, b) => {
      const btnA = a.querySelector(".add-to-cart");
      const btnB = b.querySelector(".add-to-cart");

      const fijoA = !btnA || btnA.classList.contains("sin-stock-fijo");
      const fijoB = !btnB || btnB.classList.contains("sin-stock-fijo");
      if (fijoA && !fijoB) return 1;
      if (!fijoA && fijoB) return -1;
      if (fijoA && fijoB)  return 0;

      const nombreA = btnA.dataset.name;
      const nombreB = btnB.dataset.name;
      const stockA  = nombreA ? (stockData[nombreA] ?? -1) : -1;
      const stockB  = nombreB ? (stockData[nombreB] ?? -1) : -1;
      const tieneA  = stockA > 0 ? 1 : 0;
      const tieneB  = stockB > 0 ? 1 : 0;

      if (tieneA !== tieneB) return tieneB - tieneA;
      if (tieneA && tieneB) return stockB - stockA;
      return 0;
    });

    cards.forEach(card => grid.appendChild(card));
  });
}

/* ===== ACTUALIZAR BOTÓN DE STOCK ===== */
function actualizarBotonStock(btn, cantidad) {
  if (cantidad !== undefined && cantidad <= 0) {
    btn.disabled    = true;
    btn.textContent = "Sin Stock ❌";
    btn.classList.add("sin-stock");

    const card = btn.closest(".product");
    card?.querySelector(".stock-bajo-label")?.remove();
    if (card && !card.querySelector(".badge-sin-stock-dinamico")) {
      const badge       = document.createElement("div");
      badge.className   = "badge-sin-stock badge-sin-stock-dinamico";
      badge.textContent = "📦 Sin Stock";
      card.appendChild(badge);
    }
  } else {
    btn.disabled    = false;
    btn.textContent = "Agregar 🛒";
    btn.classList.remove("sin-stock");

    const card = btn.closest(".product");
    card?.querySelector(".badge-sin-stock-dinamico")?.remove();

    if (cantidad !== undefined && cantidad <= 5 && cantidad > 0) {
      let label = card?.querySelector(".stock-bajo-label");
      if (!label) {
        label           = document.createElement("div");
        label.className = "stock-bajo-label";
        btn.insertAdjacentElement("beforebegin", label);
      }
      label.textContent = `⚠️ ¡Solo quedan ${cantidad}!`;
    } else {
      card?.querySelector(".stock-bajo-label")?.remove();
    }

    if (typeof window._bindCartButtons === "function") {
      window._bindCartButtons();
    }
  }
}

/* ===== STOCK EN TIEMPO REAL ===== */
const MAX_POR_COMPRA = 10;

onValue(ref(db, "stock"), (snap) => {
  const stockData = snap.val() || {};
  window._stockActual = stockData;

  reordenarProductosPorStock(stockData);

  if (typeof window.cargarMasVendidos === "function") {
    window.cargarMasVendidos();
  }

  document.querySelectorAll(".tab-content:not(#masvendidos) .add-to-cart:not(.sin-stock-fijo)").forEach(btn => {
    const nombre = btn.dataset.name;
    if (!nombre) return;
    actualizarBotonStock(btn, stockData[nombre]);
  });

  const contenedorMV = document.getElementById("masvendidos");
  if (contenedorMV && contenedorMV.querySelector(".product")) {
    contenedorMV.querySelectorAll(".add-to-cart:not(.sin-stock-fijo)").forEach(btn => {
      const nombre = btn.dataset.name;
      if (!nombre) return;
      actualizarBotonStock(btn, stockData[nombre]);
    });
  }

  document.querySelectorAll(".btn-1[onclick*='agregarDesdeSlider']").forEach(btn => {
    const match = btn.getAttribute("onclick").match(/agregarDesdeSlider\('(.+?)'\)/);
    if (!match) return;
    const nombre   = match[1];
    const cantidad = stockData[nombre];
    const sinStock = cantidad !== undefined && cantidad <= 0;

    if (sinStock) {
      btn.textContent         = "Sin Stock ❌";
      btn.style.background    = "#ccc";
      btn.style.cursor        = "not-allowed";
      btn.style.pointerEvents = "none";
      btn.style.opacity       = "0.7";
    } else {
      btn.textContent         = "Comprar";
      btn.style.background    = "";
      btn.style.cursor        = "";
      btn.style.pointerEvents = "";
      btn.style.opacity       = "";
    }
  });

  reordenarProductosPorStock(stockData);
});

/* ===== INICIALIZAR STOCK ===== */
window.inicializarStock = async function () {
  const todosLosProductos = {
    "Ositos"                    : 30,
    "Gusanos"                   : 30,
    "Aros"                      : 30,
    "Regaliz de frambuesa"      : 30,
    "Tiras Ácidas de frambuesa" : 30,
    "Gomitas Preparadas bolsita": 15,
    "Cachetadas"                : 30,
    "Dulce cremoso"             : 30,
    "Ositos coloridos"          : 30,
    "Pelon pelo rico"           : 30,
    "Pulparindo"                : 30,
    "Besitos"                   : 30,
    "Chicles"                   : 30,
    "Bonbon"                    : 30,
    "Sandias Acidas"            : 30,
    "Pulparindo de sandia"      : 30,
    "Maripositas"               : 30,
    "Polvos de Chamoy"          : 30,
    /* ===== NUEVOS ===== */
    "Helados"                   : 30,
    "Cepillos"                  : 30,
    "Regaliz de colores"        : 30,
    "Limoncho"                  : 30
  };

  if (sessionStorage.getItem("stockInicializado")) return;

  try {
    const snap        = await get(ref(db, "stock"));
    const stockActual = snap.val() || {};
    const nuevos      = {};

    for (const [nombre, cantidad] of Object.entries(todosLosProductos)) {
      if (stockActual[nombre] === undefined) nuevos[nombre] = cantidad;
    }

    if (Object.keys(nuevos).length > 0) {
      await update(ref(db, "stock"), nuevos);
      console.log("✅ Productos nuevos agregados al stock:", nuevos);
    }

    sessionStorage.setItem("stockInicializado", "1");
  } catch (e) {
    console.error("Error inicializando stock:", e);
  }
};
window.inicializarStock();

/* ===== DESCONTAR STOCK AL COMPRAR ===== */
window.descontarStock = async function (items) {
  const errores = [];
  for (const item of items) {
    const nombre   = item.name;
    const cantidad = item.quantity;
    const stockRef = ref(db, "stock/" + nombre);
    try {
      const result = await runTransaction(stockRef, (stockActual) => {
        if (stockActual === null) return stockActual;
        if (stockActual < cantidad) return undefined;
        return stockActual - cantidad;
      });
      if (!result.committed) errores.push(nombre);
    } catch (e) {
      console.error("Error descontando stock de " + nombre, e);
      errores.push(nombre);
    }
  }
  return errores;
};

/* ===== VALIDAR CARRITO CONTRA STOCK ===== */
window.validarCarritoContraStock = function (cart) {
  const stock     = window._stockActual || {};
  const problemas = [];
  for (const item of cart) {
    const nombre = item.name;
    if (stock[nombre] !== undefined && stock[nombre] < item.quantity) {
      problemas.push({ nombre, disponible: stock[nombre], pedido: item.quantity });
    }
    if (item.quantity > MAX_POR_COMPRA) {
      problemas.push({ nombre, disponible: MAX_POR_COMPRA, pedido: item.quantity, esLimite: true });
    }
  }
  return problemas;
};

window._MAX_POR_COMPRA = MAX_POR_COMPRA;

/* ===== NIVELES COMPRAS ===== */
function calcularNivel(puntos) {
  if (puntos >= 500) return { nombre:"⚡ Elite",   clase:"nivel-elite"   };
  if (puntos >= 61)  return { nombre:"💎 Platino", clase:"nivel-platino" };
  if (puntos >= 41)  return { nombre:"🥇 Oro",     clase:"nivel-oro"     };
  if (puntos >= 21)  return { nombre:"🥈 Plata",   clase:"nivel-plata"   };
  return                    { nombre:"🥉 Bronce",  clase:"nivel-bronce"  };
}

/* ===== NIVELES JUEGO ===== */
function calcularNivelJuego(pts) {
  if (pts >= 70000) return { nombre:"👾 Inmortal",       clase:"nivel-galactico" };
  if (pts >= 59000) return { nombre:"💀 Sin Vida",       clase:"nivel-galactico" };
  if (pts >= 58000) return { nombre:"🧬 Mutante",        clase:"nivel-galactico" };
  if (pts >= 57000) return { nombre:"⚛️ Cuántico",      clase:"nivel-galactico" };
  if (pts >= 56000) return { nombre:"🌊 Tsunami",        clase:"nivel-galactico" };
  if (pts >= 55000) return { nombre:"🕳️ Agujero Negro", clase:"nivel-galactico" };
  if (pts >= 54000) return { nombre:"🌌 Multiverso",     clase:"nivel-galactico" };
  if (pts >= 53000) return { nombre:"🌀 Absurdo",        clase:"nivel-galactico" };
  if (pts >= 52000) return { nombre:"🔮 Oráculo",        clase:"nivel-galactico" };
  if (pts >= 51000) return { nombre:"🛸 Alienígena",     clase:"nivel-galactico" };
  if (pts >= 50000) return { nombre:"🚀 Galáctico",      clase:"nivel-galactico" };
  if (pts >= 49000) return { nombre:"☄️ Meteoro",        clase:"nivel-galactico" };
  if (pts >= 48000) return { nombre:"🌠 Estelar",        clase:"nivel-galactico" };
  if (pts >= 47000) return { nombre:"⭐ Astral",         clase:"nivel-galactico" };
  if (pts >= 46000) return { nombre:"🌙 Lunar",          clase:"nivel-galactico" };
  if (pts >= 45000) return { nombre:"💫 Orbital",        clase:"nivel-galactico" };
  if (pts >= 44000) return { nombre:"🔭 Explorador",     clase:"nivel-elite"     };
  if (pts >= 43000) return { nombre:"🧨 Explosivo",      clase:"nivel-elite"     };
  if (pts >= 42000) return { nombre:"⚡ Titán",          clase:"nivel-elite"     };
  if (pts >= 41000) return { nombre:"🎖️ Glorioso",      clase:"nivel-elite"     };
  if (pts >= 40000) return { nombre:"🏅 Insigne",        clase:"nivel-elite"     };
  if (pts >= 39000) return { nombre:"👑 Leyenda",        clase:"nivel-elite"     };
  if (pts >= 38000) return { nombre:"🌋 Volcánico",      clase:"nivel-elite"     };
  if (pts >= 37000) return { nombre:"🔱 Supremo",        clase:"nivel-elite"     };
  if (pts >= 36000) return { nombre:"🗡️ Conquistador",  clase:"nivel-elite"     };
  if (pts >= 35000) return { nombre:"🧠 Genio",          clase:"nivel-elite"     };
  if (pts >= 34000) return { nombre:"💎 Diamante",       clase:"nivel-platino"   };
  if (pts >= 33000) return { nombre:"🛡️ Indomable",     clase:"nivel-platino"   };
  if (pts >= 32000) return { nombre:"🎯 Certero",        clase:"nivel-platino"   };
  if (pts >= 31000) return { nombre:"⚔️ Gladiador",     clase:"nivel-platino"   };
  if (pts >= 30000) return { nombre:"🔥 Infernal",       clase:"nivel-platino"   };
  if (pts >= 29000) return { nombre:"💥 Brutal",         clase:"nivel-platino"   };
  if (pts >= 28000) return { nombre:"🏆 Campeón",        clase:"nivel-platino"   };
  if (pts >= 27000) return { nombre:"🦁 Feroz",          clase:"nivel-platino"   };
  if (pts >= 26000) return { nombre:"🐯 Salvaje",        clase:"nivel-platino"   };
  if (pts >= 25000) return { nombre:"⚡ Maestro",        clase:"nivel-platino"   };
  if (pts >= 24000) return { nombre:"🎖️ Gran Pro",      clase:"nivel-oro"       };
  if (pts >= 23000) return { nombre:"🏅 Pro",            clase:"nivel-oro"       };
  if (pts >= 22000) return { nombre:"🏆 Experto",        clase:"nivel-oro"       };
  if (pts >= 21000) return { nombre:"🎯 Veterano",       clase:"nivel-oro"       };
  if (pts >= 20000) return { nombre:"⚔️ Élite",         clase:"nivel-oro"       };
  if (pts >= 19000) return { nombre:"🛡️ Guerrero",      clase:"nivel-oro"       };
  if (pts >= 18000) return { nombre:"💪 Luchador",       clase:"nivel-oro"       };
  if (pts >= 17000) return { nombre:"🥊 Peleador",       clase:"nivel-oro"       };
  if (pts >= 16000) return { nombre:"🔥 Pro",            clase:"nivel-oro"       };
  if (pts >= 15000) return { nombre:"🌟 Destacado",      clase:"nivel-oro"       };
  if (pts >= 14000) return { nombre:"🎮 Hábil",          clase:"nivel-plata"     };
  if (pts >= 13000) return { nombre:"🧩 Estratega",      clase:"nivel-plata"     };
  if (pts >= 12000) return { nombre:"🎯 Preciso",        clase:"nivel-plata"     };
  if (pts >= 11000) return { nombre:"⚡ Ágil",           clase:"nivel-plata"     };
  if (pts >= 10000) return { nombre:"🏅 Competidor",     clase:"nivel-plata"     };
  if (pts >= 9000)  return { nombre:"🔑 Avanzado",       clase:"nivel-plata"     };
  if (pts >= 8000)  return { nombre:"💡 Inteligente",    clase:"nivel-plata"     };
  if (pts >= 7000)  return { nombre:"🎖️ Dedicado",      clase:"nivel-plata"     };
  if (pts >= 6000)  return { nombre:"🌱 Constante",      clase:"nivel-bronce"    };
  if (pts >= 5000)  return { nombre:"🥉 Aprendiz",       clase:"nivel-bronce"    };
  if (pts >= 4000)  return { nombre:"🎮 Jugador",        clase:"nivel-bronce"    };
  if (pts >= 3000)  return { nombre:"🌟 Novato",         clase:"nivel-bronce"    };
  if (pts >= 2000)  return { nombre:"🥊 Iniciado",       clase:"nivel-bronce"    };
  if (pts >= 1000)  return { nombre:"🌱 Recluta",        clase:"nivel-bronce"    };
  return                   { nombre:"👶 Nuevo",          clase:"nivel-bronce"    };
}

/* ===== AVATAR ===== */
function avatarHTML(nombre, foto) {
  if (foto) return `<img class="rank-avatar" src="${foto}" alt="${nombre}">`;
  const colores = ["#ff6b6b","#ffa07a","#ffd93d","#3ddc97","#9d6bff","#ff66c4","#4ecdc4"];
  const color   = colores[nombre.charCodeAt(0) % colores.length];
  return `<div class="rank-avatar" style="background:${color}">${nombre.charAt(0).toUpperCase()}</div>`;
}

/* ===== FILAS RANKING ===== */
const MEDALLAS = ["🥇","🥈","🥉"];

function buildRow(u, i, uidActual, icono, nivel, campo) {
  const esYo   = u.uid === uidActual;
  const esTop3 = i < 3;
  const med    = esTop3 ? MEDALLAS[i] : `#${i + 1}`;
  const pts    = u[campo];

  const claseTop = esTop3
    ? (campo === "puntos" ? "ranking-top3-compras" : "ranking-top3-juego")
    : "";

  return `<div class="ranking-row ${esYo ? "ranking-yo" : ""} ${claseTop}">
    <span class="rank-pos">${med}</span>
    ${avatarHTML(u.nombre, u.foto)}
    <div class="rank-info">
      <span class="rank-nombre">${u.nombre}${esYo ? " <em>(tú)</em>" : ""}</span>
      <span class="rank-carrera">${u.carrera}</span>
      <span class="rank-nivel ${nivel.clase}">${nivel.nombre}</span>
    </div>
    <span class="rank-puntos">${icono} ${pts}</span>
  </div>`;
}

/* ===== HELPERS RANKING ===== */
function renderRanking({ lista, tablaEl, verMasBtnId, uidActual, icono, calcNivel, campo }) {
  const top10 = lista.slice(0, 10);
  const resto = lista.slice(10);

  tablaEl.innerHTML = top10.map((u, i) =>
    buildRow(u, i, uidActual, icono, calcNivel(u[campo]), campo)
  ).join("");

  const btn = document.getElementById(verMasBtnId);

  if (resto.length > 0) {
    const restoDiv         = document.createElement("div");
    restoDiv.className     = "ranking-resto-inner";
    restoDiv.style.display = "none";
    restoDiv.innerHTML     = resto.map((u, i) =>
      buildRow(u, i + 10, uidActual, icono, calcNivel(u[campo]), campo)
    ).join("");
    tablaEl.appendChild(restoDiv);

    if (btn) {
      btn.style.display = "block";
      btn.textContent   = "Ver ranking completo ▼";
      btn.onclick = function () {
        const abierto = restoDiv.style.display !== "none";
        restoDiv.style.display = abierto ? "none" : "block";
        this.textContent = abierto ? "Ver ranking completo ▼" : "Ver menos ▲";
        if (!abierto) tablaEl.scrollTop = tablaEl.scrollHeight;
      };
    }
  } else {
    if (btn) btn.style.display = "none";
  }
}

/* ===== PUNTOS USUARIO ===== */
window.cargarPuntosUsuario = function () {
  const uid = localStorage.getItem("userUID");
  if (!uid) return;
  get(ref(db, "usuarios/" + uid)).then(snap => {
    if (snap.exists()) window.mostrarPuntosUsuario(snap.val());
  });
};

window.mostrarPuntosUsuario = function (datos) {
  const badge = document.getElementById("puntos-badge");
  if (badge) {
    badge.innerHTML     = `⭐ ${datos.puntos || 0} pts`;
    badge.style.display = "flex";
  }
};

/* ===== PEDIDOS ===== */
window.guardarPedido = function (pedido) {
  const totalSeguro  = calcularTotal(pedido.items);
  const puntosSeguro = Math.floor(totalSeguro);

  set(ref(db, "pedidos/" + Date.now()), {
    ...pedido,
    total  : totalSeguro,
    puntos : puntosSeguro,
    estado : "pendiente"
  }).catch(e => console.error("Error guardando pedido:", e));
};

/* ===== PUNTOS COMPRAS (solo llamado desde admin) ===== */
window.sumarPuntos = function (uid, puntosExtra) {
  if (!uid || puntosExtra <= 0) return;
  get(ref(db, "usuarios/" + uid)).then(snap => {
    if (snap.exists() && snap.val() && typeof snap.val() === "object") {
      const nuevos = (snap.val().puntos || 0) + puntosExtra;
      update(ref(db, "usuarios/" + uid), { puntos: nuevos }).then(() => {
        window.mostrarPuntosUsuario({ ...snap.val(), puntos: nuevos });
      });
    }
  });
};

/* ===== PUNTOS JUEGO ===== */
window._subirPuntosJuego = async function (pts) {
  const uid = localStorage.getItem("userUID");
  if (!uid) return;
  try {
    const snap = await get(ref(db, "usuarios/" + uid));
    if (snap.exists() && snap.val() && typeof snap.val() === "object"
        && pts > (snap.val().puntosJuego || 0)) {
      await update(ref(db, "usuarios/" + uid), { puntosJuego: pts });
    }
  } catch (e) {
    console.error("Error guardando puntos juego:", e);
  }
};

/* ===== REINICIAR RANKING DE JUEGO (solo puntos, no las cuentas) ===== */
window.reiniciarRankingJuego = async function () {
  try {
    const snap = await get(ref(db, "usuarios"));
    if (!snap.exists()) {
      console.log("No hay usuarios.");
      return;
    }
    const updates = {};
    Object.keys(snap.val()).forEach(uid => {
      updates["usuarios/" + uid + "/puntosJuego"] = 0;
    });
    await update(ref(db), updates);
    // También limpia el récord local de cada dispositivo
    localStorage.removeItem("evb_hi");
    console.log("✅ Ranking de juego reiniciado. Cuentas intactas.");
  } catch (e) {
    console.error("Error reiniciando ranking:", e);
  }
};

/* ===== RANKING COMPRAS ===== */
window.cargarRanking = function () {
  const tablaEl = document.getElementById("ranking-lista");
  tablaEl.innerHTML = "<p style='text-align:center;color:#aaa'>Cargando...</p>";

  get(ref(db, "usuarios")).then(snap => {
    if (!snap.exists()) {
      tablaEl.innerHTML = "<p style='text-align:center;color:#aaa'>No hay usuarios aún.</p>";
      return;
    }
    const uidActual = localStorage.getItem("userUID") || "";
    const lista = Object.entries(snap.val())
      .filter(([, d]) => d && typeof d === "object")
      .map(([uid, d]) => ({
        uid,
        nombre  : d.nombre  || "Anónimo",
        carrera : d.carrera || "",
        puntos  : d.puntos  || 0,
        foto    : d.foto    || ""
      }))
      .sort((a, b) => b.puntos - a.puntos);

    renderRanking({ lista, tablaEl, verMasBtnId:"ranking-ver-mas", uidActual, icono:"⭐", calcNivel:calcularNivel, campo:"puntos" });
  });
};

/* ===== RANKING JUEGO ===== */
window.cargarRankingJuego = function () {
  const tablaEl = document.getElementById("ranking-juego-lista");
  tablaEl.innerHTML = "<p style='text-align:center;color:#aaa'>Cargando...</p>";

  get(ref(db, "usuarios")).then(snap => {
    if (!snap.exists()) {
      tablaEl.innerHTML = "<p style='text-align:center;color:#aaa'>Nadie ha jugado aún.</p>";
      return;
    }
    const uidActual = localStorage.getItem("userUID") || "";
    const lista = Object.entries(snap.val())
      .filter(([, d]) => d && typeof d === "object")
      .map(([uid, d]) => ({
        uid,
        nombre      : d.nombre      || "Anónimo",
        carrera     : d.carrera     || "",
        puntosJuego : d.puntosJuego || 0,
        foto        : d.foto        || ""
      }))
      .filter(u => u.puntosJuego > 0)
      .sort((a, b) => b.puntosJuego - a.puntosJuego);

    if (lista.length === 0) {
      tablaEl.innerHTML = "<p style='text-align:center;color:#aaa'>Nadie ha jugado aún — ¡sé el primero!</p>";
      const btn = document.getElementById("ranking-juego-ver-mas");
      if (btn) btn.style.display = "none";
      return;
    }
    renderRanking({ lista, tablaEl, verMasBtnId:"ranking-juego-ver-mas", uidActual, icono:"🎮", calcNivel:calcularNivelJuego, campo:"puntosJuego" });
  });
};

/* ===== MÁS VENDIDOS AUTOMÁTICO ===== */
const PRODUCTOS_INFO = {
  "Ositos"                    : { img:"images/azucar.png",                   desc:"El favorito de todos 🍬",                              precio:"Q1",    precioVal:1    },
  "Gusanos"                   : { img:"images/image-removebg-preview.png",   desc:"Sabor ácido que despierta tus sentidos",               precio:"Q1",    precioVal:1    },
  "Aros"                      : { img:"images/aros.png",                     desc:"Refrescante sabor a melocoton",                         precio:"Q1",    precioVal:1    },
  "Besitos"                   : { img:"images/besitos .png",                 desc:"Gomitas de besitos para azucarar tu dia",              precio:"Q1",    precioVal:1    },
  "Ositos coloridos"          : { img:"images/osxs.png",                     desc:"Ositos para alegrar tu dia",                            precio:"Q1",    precioVal:1    },
  "Regaliz de frambuesa"      : { img:"images/regaliz fra.png",              desc:"Refrescante sabor a frambuesa",                         precio:"Q1",    precioVal:1    },
  "Tiras Ácidas de frambuesa" : { img:"images/franses .png",                 desc:"Todos los sabores en una sola gomita",                  precio:"Q1",    precioVal:1    },
  "Gomitas Preparadas bolsita": { img:"images/ewas.png",                     desc:"Mezcla especial con chamoy y mas",                      precio:"Q3",    precioVal:3    },
  "Sandias Acidas"            : { img:"images/azul.png",                     desc:"Gomitas de sandía Acidas",                              precio:"Q1",    precioVal:1    },
  "Cachetadas"                : { img:"images/lengua.png",                   desc:"Arma tu propia paleta!",                                precio:"Q1",    precioVal:1    },
  "Dulce cremoso"             : { img:"images/dulduldul.png",                desc:"Suave y dulce, sabor clásico",                          precio:"Q1",    precioVal:1    },
  "Pelon pelo rico"           : { img:"images/pelusa.png",                   desc:"Pasta de tamarindo picante. ¡Adictivo! 🌶️",            precio:"Q3",    precioVal:3    },
  "Pulparindo"                : { img:"images/pelo.png",                     desc:"Tamarindo con chile, dulce y picante 🌶️",              precio:"Q2.50", precioVal:2.50 },
  "Pulparindo de sandia"      : { img:"images/pulsan.png",                   desc:"Tamarindo con sandía, dulce y picante 🍉",             precio:"Q2.50", precioVal:2.50 },
  "Chicles"                   : { img:"images/rana.png",                     desc:"Chicles de sabores variados y refrescantes",            precio:"Q1",    precioVal:1    },
  "Bonbon"                    : { img:"images/barry.png",                    desc:"Bonbon sabor a barrilete",                              precio:"Q1",    precioVal:1    },
  "Maripositas"               : { img:"images/mari.png",                     desc:"Mariposita con chocolate y bolitas de galleta 🦋",      precio:"Q2",    precioVal:2    },
  "Polvos de Chamoy"          : { img:"images/vov.png",                      desc:"Polvos de chamoy, dulce y picante 🌶️",                 precio:"Q1",    precioVal:1    },
  /* ===== NUEVOS ===== */
  "Helados"                   : { img:"images/helados.png",                  desc:"Gomitas de helado, frías y deliciosas 🍦",              precio:"Q1",    precioVal:1    },
  "Cepillos"                  : { img:"images/cepi.png",                 desc:"Gomitas de cepillo, dulces y coloridas 🪥",             precio:"Q1",    precioVal:1    },
  "Regaliz de colores"        : { img:"images/barra.png",                       desc:"Regaliz de colores los mas dulces 🎉",                   precio:"Q1",    precioVal:1    },
  "Limoncho"                  : { img:"images/limoncho.png",                 desc:"Dulce de limón con chamoy, ácido y delicioso 🍋",       precio:"Q3",    precioVal:3    }
};

const MEDALLAS_TOP = ["🥇","🥈","🥉"];

window.cargarMasVendidos = function () {
  const contenedor = document.getElementById("masvendidos");
  if (!contenedor) return;

  get(ref(db, "pedidos")).then(snap => {
    const loading = document.getElementById("masvendidos-loading");

    if (!snap.exists()) {
      if (loading) loading.textContent = "Aún no hay ventas registradas 🍬";
      return;
    }

    const ventas = {};
    snap.forEach(pedidoSnap => {
      const pedido = pedidoSnap.val();
      if (!pedido || pedido.estado === "rechazado" || !pedido.items) return;
      const items = Array.isArray(pedido.items)
        ? pedido.items
        : Object.values(pedido.items);
      items.forEach(item => {
        if (!item?.name) return;
        ventas[item.name] = (ventas[item.name] || 0) + (item.quantity || 1);
      });
    });

    const ranking = Object.entries(ventas)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    if (ranking.length === 0) {
      if (loading) loading.textContent = "Aún no hay ventas registradas 🍬";
      return;
    }

    contenedor.innerHTML = "";
    const stockActual = window._stockActual || {};

    ranking.forEach(([nombre, totalVendido], i) => {
      const info = PRODUCTOS_INFO[nombre];
      if (!info) return;

      const badgeTexto = i < 3 ? `${MEDALLAS_TOP[i]} #${i + 1}` : "⭐ Top";
      const sinStock   = stockActual[nombre] !== undefined && stockActual[nombre] <= 0;

      const card     = document.createElement("div");
      card.className = "product cat-top";
      card.innerHTML = `
        <div class="product-badge top-badge">${badgeTexto}</div>
        <img src="${info.img}" alt="${nombre}">
        <h4>${nombre}</h4>
        <p class="prod-desc">${info.desc}</p>
        <span>${info.precio}</span>
        ${sinStock
          ? `<button class="add-to-cart sin-stock" disabled>Sin Stock ❌</button>`
          : `<button class="add-to-cart" data-name="${nombre}" data-price="${info.precioVal}" data-img="${info.img}">Agregar 🛒</button>`
        }
      `;
      contenedor.appendChild(card);
    });

    if (typeof window._bindCartButtons === "function") {
      window._bindCartButtons();
    }
  }).catch(e => console.error("Error cargando más vendidos:", e));
};

/* ===== TICKER ===== */
window.cargarTicker = function () {
  get(ref(db, "usuarios")).then(snap => {
    if (!snap.exists()) return;
    const usuarios = Object.values(snap.val()).filter(u => u && typeof u === "object");

    function iniciarTicker(elementId, prefijo, lista, campo) {
      const el = document.getElementById(elementId);
      if (!el || lista.length === 0) {
        if (el) el.textContent = prefijo === "🎮" ? "🎮 ¡Juega para aparecer aquí!" : "";
        return;
      }
      const items = lista.map((u, i) => `${MEDALLAS[i]} ${u.nombre || "Anónimo"} (${u[campo]}pts)`);
      let idx = 0;
      function rotar() {
        el.style.opacity = "0";
        setTimeout(() => {
          el.textContent   = prefijo + " " + items[idx];
          el.style.opacity = "1";
          idx = (idx + 1) % items.length;
        }, 400);
      }
      rotar();
      setInterval(rotar, 3000);
    }

    iniciarTicker("ticker-contenido", "🏆",
      usuarios.filter(u => (u.puntos || 0) > 0).sort((a, b) => b.puntos - a.puntos).slice(0, 3), "puntos");
    iniciarTicker("ticker-juego-contenido", "🎮",
      usuarios.filter(u => (u.puntosJuego || 0) > 0).sort((a, b) => b.puntosJuego - a.puntosJuego).slice(0, 3), "puntosJuego");
  });
};

/* ===== LLAMADA INICIAL MÁS VENDIDOS ===== */
window.cargarMasVendidos();
