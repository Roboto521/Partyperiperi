if (localStorage.getItem("loggedIn") !== "true") {
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", function () {

  /* ===== DATOS DE USUARIO ===== */
  const nombreInput = document.getElementById("cliente-nombre");
  const gradoInput = document.getElementById("cliente-grado");
  if (nombreInput) nombreInput.value = localStorage.getItem("userName") || "";
  if (gradoInput) gradoInput.value = localStorage.getItem("userGrado") || "";

  setTimeout(() => {
    ventana.cargarPuntosUsuario?.();
    ventana.cargarTicker?.();
  }, 500);

  /* ===== SWIPER ===== */
  if (document.querySelector(".mySwiper-1")) {
    nuevo Swiper(".mySwiper-1", {
      diapositivasPorVista: 1, espacioEntre: 30, bucle: verdadero,
      paginación : { el:".swiper-pagination", clickable:true },
      navegación: { nextEl:".swiper-button-next", prevEl:".swiper-button-prev" }
    });
  }

  /* ===== TABS ===== */
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  función activateTab(tabId) {
    tabBtns.forEach(b => b.classList.remove("active"));
    tabContents.forEach(c => c.classList.remove("active"));
    document.querySelector(`[data-tab="${tabId}"]`)?.classList.add("active");
    document.getElementById(tabId)?.classList.add("active");
  }
  tabBtns.forEach(btn => btn.addEventListener("click", () => activateTab(btn.dataset.tab)));

  /* ===== BÃšSQUEDA ===== */
  document.getElementById("searchInput")?.addEventListener("input", function () {
    const term = this.value.toLowerCase().trim();
    sea firstMatchTab = null;
    tabContents.forEach(tab => {
      sea encontrado = falso;
      tab.querySelectorAll(".product").forEach(product => {
        const match = term === "" || product.innerText.toLowerCase().includes(term);
        producto.estilo.visualización = coincidir ? "flexible" : "ninguno";
        si (coincidencia) encontrada = verdadero;
      });
      si (encontrado && !firstMatchTab) firstMatchTab = tab.id;
    });
    si (firstMatchTab) activeTab(firstMatchTab);
  });

  /* ===== CERRAR MODALES ===== */
  function cerrarTodosLosModales() {
    ["rankingModal","rankingJuegoModal","gameModal","resultModal","modelosModal","secretariasModal"].forEach(id => {
      const m = document.getElementById(id);
      si (m) m.style.display = "ninguno";
    });
    ventana._cerrarJuego?.();
  }
  función cerrarAlFondo(id) {
    document.getElementById(id)?.addEventListener("click", e => {
      if (e.target.id === id) e.target.style.display = "none";
    });
  }

  /* ===== TOSTADA ===== */
  función mostrarToast(msg, color = "#ff4d6d") {
    let toast = document.getElementById("toast-stock");
    si (!tostado) {
      toast = document.createElement("div");
      toast.id = "toast-stock";
      toast.style.cssText = `
        posición: fija; abajo: -100px; izquierda: 50%; transformar: trasladarX(-50%);
        relleno: 12px 24px; radio de borde: 999px; peso de fuente: 700; tamaño de fuente: 0,88rem;
        box-shadow:0 8px 30px rgba(0,0,0,0.3); transition:bottom 0.4s cubic-bezier(.17,.67,.39,1.4);
        z-index:999999; color:white; text-align:center; max-width:85vw; line-height:1.4;
      `;
      documento.cuerpo.añadirHijo(toast);
    }
    Tostada.estilo.fondo = color;
    toast.textContent = msg;
    toast.style.bottom = "30px";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.style.bottom = "-100px"; }, 3000);
  }

  /* ===== CARRITO ===== */
  sea carrito = [];
  const MAX_COMPRA = () => ventana._MAX_POR_COMPRA || 10;

  const cartItemsList = document.getElementById("cart-items");
  const cartTotal = document.getElementById("cart-total");
  const cartCount = document.getElementById("cart-count");
  const cartDropdown = document.getElementById("cart-dropdown");

  document.getElementById("cart-toggle")?.addEventListener("click", () => {
    cartDropdown.style.display = cartDropdown.style.display === "block" ? "none" : "block";
  });

  función agregarAlCarrito(nombre, precio, imagen) {
    const stock = window._stockActual || {};
    const existing = cart.find(i => i.name === name);
    const cantidadActual = existente ? existente.cantidad : 0;
    const stockDisp = stock[name] !== undefined ? stock[name] : Infinity;

    if (cantidadActual >= MAX_COMPRA()) {
      mostrarToast(`âš ï¸ Máximo ${MAX_COMPRA()} unidades de "${name}" por compra`, "#ff8c42");
      devolver;
    }
    si (cantidadActual >= stockDisp) {
      mostrarToast(`ðŸ“¦ Solo hay ${stockDisp} "${name}" disponibles`, "#9d6bff");
      devolver;
    }

    si (existente) cantidad existente++;
    else cart.push({ nombre, precio: parseFloat(precio), imagen, cantidad: 1 });
    actualizarCarrito();
  }

  /* ===== ENLACE BOTONES DE CARRITO =====
     Se llama al inicio Y cada vez que firebase.js crea tarjetas nuevas
     (por ejemplo en Más Vendidos). El flag _cartBound evita duplicar eventos. */
  window._bindCartButtons = function () {
    document.querySelectorAll(".add-to-cart").forEach(btn => {
      si (btn._cartBound) regresar;
      btn._cartBound = verdadero;
      btn.addEventListener("click", () => {
        si (btn.disabled) regresar;
        agregarAlCarrito(btn.dataset.nombre, btn.dataset.precio, btn.dataset.img);
      });
    });
  };

  // Bind inicial para los botones que ya están en el HTML
  window._bindCartButtons();

  // Escucha el evento global (usado por agregarDesdeSlider)
  document.addEventListener("agregarProducto", e => {
    agregarAlCarrito(e.detalle.nombre, e.detalle.precio, e.detalle.img);
  });

  /* ===== DESLIZADOR ===== */
  ventana.agregarDesdeSlider = función (nombre) {
    const btn = document.querySelector(`.add-to-cart[data-name="${name}"]:not(.sin-stock):not([disabled])`);
    si (!btn) {
      mostrarToast(`ðŸ“¦ "${name}" no está disponible en este momento`, "#9d6bff");
      devolver;
    }
    document.dispatchEvent(new CustomEvent("agregarProducto", {
      detalle: { nombre: btn.dataset.name, precio: btn.dataset.price, img: btn.dataset.img }
    }));
    if (cartDropdown) cartDropdown.style.display = "block";
  };

  /* ===== RENDER CARRITO ===== */
  función updateCart() {
    cartItemsList.innerHTML = "";
    sea total = 0, recuento = 0;

    carrito.forEach((item, index) => {
      total += precio.artículo * cantidad.artículo;
      recuento += cantidad.elemento;

      const stock = window._stockActual || {};
      const stockDisp = stock[item.name] !== undefined ? stock[item.name] : Infinity;
      const maxPerm = Math.min(MAX_COMPRA(), stockDisp);
      const puedeSubir = item.quantity < maxPerm;

      const li = document.createElement("li");
      li.innerHTML = `
        <img src="${item.img}" width="40" style="border-radius:8px;object-fit:contain;flex-shrink:0;">
        <span class="cart-item-nombre">${item.name} <b>x${item.quantity}</b></span>
        <div class="cart-item-btns">
          <button class="btn-mas" data-index="${index}" ${puedeSubir ? "" : "disabled"}>âž•</button>
          <button class="btn-menos" data-index="${index}">âž–</button>
          <button class="btn-remove" data-index="${index}">â Œ</button>
        </div>
      `;
      cartItemsList.appendChild(li);
    });

    cartTotal.textContent = total.toFixed(2);
    cartCount.textContent = count;

    cartItemsList.querySelectorAll(".btn-mas").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = parseInt(btn.dataset.index);
        agregarAlCarrito(cart[i].name, cart[i].price, cart[i].img);
      });
    });
    cartItemsList.querySelectorAll(".btn-menos").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = parseInt(btn.dataset.index);
        if (--cart[i].quantity <= 0) cart.splice(i, 1);
        actualizarCarrito();
      });
    });
    cartItemsList.querySelectorAll(".btn-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        cart.splice(parseInt(btn.dataset.index), 1);
        actualizarCarrito();
      });
    });
  }

  document.getElementById("clear-cart")?.addEventListener("click", () => { cart = []; updateCart(); });

  /* ===== COMPRAR ===== */
  document.getElementById("buy-cart")?.addEventListener("click", async () => {
    if (cart.length === 0) { mostrarToast("ðŸ ¬ Tu carrito está vacío", "#ff4d6d"); devolver; }

    const problemas = window.validarCarritoContraStock?.(cart) || [];
    Si (problemas.length > 0) {
      const msgs = problemas.map(p =>
        p.esLimite
          ? `â€¢ ${p.nombre}: máximo ${p.disponible} por compra`
          : p.disponible === 0
            ? `â€¢ ${p.nombre}: sin stock`
            : `â€¢ ${p.nombre}: solo quedan ${p.disponible}`
      );
      mostrarToast("âš ï¸ " + msgs.join(" | "), "#ff4d6d");
      problemas.forEach(p => {
        const item = cart.find(i => i.name === p.nombre);
        si (!elemento) regresar;
        if (p.disponible === 0) cart = cart.filter(i => i.name !== p.nombre);
        de lo contrario item.quantity = p.disponible;
      });
      actualizarCarrito();
      devolver;
    }

    const nombre = localStorage.getItem("nombredeusuario") || "No indicado";
    const grado = localStorage.getItem("usuarioGrado") || "No indicado";
    const uid = localStorage.getItem("userUID") || "";
    constante total = parseFloat(cartTotal.textContent);
    const puntos = Math.floor(total);

    const errores = await window.descontarStock?.(cart) || [];
    si (errores.length > 0) {
      mostrarToast(`âš ï¸ Stock insuficiente para: ${errores.join(", ")}`, "#ff8c42");
      carrito = carrito.filter(i => !errores.includes(i.name));
      actualizarCarrito();
      devolver;
    }

    // Guarda el pedido en Firebase
    ventana.guardarPedido?.({
      uid, nombre, grado,
      artículos: [...carrito],
      total,
      puntos,
      fecha : nueva Fecha().toLocaleString("es-GT")
    });

    // â ³ Los puntos se suman solo cuando el administrador aprueba el pedido

    // Arma el mensaje de WhatsApp
    let mensaje = `ðŸ ¬ Pedido Party Perilingües ðŸ ¬\n\nðŸ'¤ Nombre: ${nombre}\nðŸŽ“ Grado/Carrera: ${grado}\n\n`;
    carrito.forEach(item => {
      mensaje += `¢€¢ ${item.name} x${item.quantity} â€— Q${(item.price * item.quantity).toFixed(2)}\n`;
    });
    mensaje += `\nðŸ'° Total: Q${total.toFixed(2)}`;

    carrito = [];
    actualizarCarrito();
    window.location.href = `https://wa.me/50239411839?text=${encodeURIComponent(mensaje)}`;
  });

  /* ===== MODALES ===== */
  document.getElementById("closeResult")?.addEventListener("click", () => {
    document.getElementById("resultModal").style.display = "none";
  });

  document.getElementById("ranking-btn")?.addEventListener("click", () => {
    cerrarTodosLosModales();
    document.getElementById("rankingModal").style.display = "flex";
    ventana.cargarRanking?.();
  });
  document.getElementById("closeRanking")?.addEventListener("click", () => {
    document.getElementById("rankingModal").style.display = "none";
  });
  cerrarAlFondo("rankingModal");

  document.getElementById("ranking-juego-btn")?.addEventListener("click", () => {
    cerrarTodosLosModales();
    document.getElementById("rankingJuegoModal").style.display = "flex";
    ventana.cargarRankingJuego?.();
  });
  document.getElementById("closeRankingJuego")?.addEventListener("click", () => {
    document.getElementById("rankingJuegoModal").style.display = "none";
  });
  cerrarAlFondo("rankingJuegoModal");

  document.getElementById("publicistas-btn")?.addEventListener("click", () => {
    cerrarTodosLosModales();
    document.getElementById("modelosModal").style.display = "flex";
  });
  cerrarAlFondo("modelosModal");

  document.getElementById("secretarias-btn")?.addEventListener("click", () => {
    cerrarTodosLosModales();
    document.getElementById("secretariasModal").style.display = "flex";
  });
  cerrarAlFondo("secretariasModal");

  /* ===== MÚSICA CON PROGRESO GUARDADO ===== */
  const music = document.getElementById("bg-music");
  const musicBtn = document.getElementById("music-btn");

  const playlist = [
    "musica/Just the way you are milky best part loop.mp3",
    "musica/MY TALKING TOM - CAKE TOWER SOUNDTRACK OST.mp3",
    "musica/Sweet Sweet Canyon - Mario Kart 8 OST.mp3",
    "música/Animal Crossing - Bubblegum KK [Remix].mp3",
    "musica/Kirby's Return to Dream Land Adventure Wii - Menu.mp3"
  ];
  volúmenes constantes = [0,15, 1,0, 0,50, 0,50, 0,50];

  let trackActual = parseInt(localStorage.getItem("musicTrack")) || 0;
  let tiempoGuardado = parseFloat(localStorage.getItem("musicTiempo")) || 0;
  Si (trackActual >= playlist.length) trackActual = 0;

  let cambiando = falso;

  function cargarCancion(index, desde = 0) {
    cambiando = verdadero;
    música.src = playlist[index];
    música.volumen = volúmenes[índice];
    música.cargar();
    música.oncanplay = () => {
      música.oncanplay = null;
      if (desde > 0) music.currentTime = desde;
      música.reproducir().catch(() => {});
      setTimeout(() => { cambiando = false; }, 1000);
    };
  }

  música.addEventListener("timeupdate", () => {
    localStorage.setItem("musicTrack", trackActual);
    localStorage.setItem("musicTiempo", music.currentTime);
  });

  // Avanza a la siguiente canción al terminar (un solo controlador, sin setInterval duplicado)
  música.addEventListener("terminado", () => {
    trackActual = (trackActual + 1) % playlist.length;
    localStorage.setItem("musicTrack", trackActual);
    localStorage.setItem("musicTiempo", 0);
    cargarCancion(trackActual, 0);
  });

  si (música && botón de música) {
    musicBtn.classList.add("silenciado");

    document.addEventListener("click", () => {
      música.silenciada = falso;
      cargarCancion(trackActual, tiempoGuardado);
      musicBtn.textContent = "ðŸ”Š";
      musicBtn.classList.replace("muted", "playing");
    }, { una vez: verdadero });

    musicBtn.addEventListener("hacer clic", e => {
      e.stopPropagation();
      si (música.silenciada || música.pausada) {
        música.silenciada = falso;
        música.reproducir().catch(() => {});
        musicBtn.textContent = "ðŸ”Š";
        musicBtn.classList.replace("muted", "playing");
      } demás {
        música.silenciada = verdadero;
        musicBtn.textContent = "ðŸ”‡";
        musicBtn.classList.replace("playing", "muted");
      }
    });
  }

  /* ===== PUBLICIDAD ===== */
  const anuncio = document.getElementById("adModal");
  const closeAd = document.getElementById("closeAd");
  si (anuncio && cerrarAnuncio) {
    setTimeout(() => { ad.style.display = "flex"; ad.classList.add("show-ad"); }, 500);
    closeAd.onclick = () => {
      ad.classList.remove("show-ad");
      setTimeout(() => { ad.style.display = "none"; }, 300);
    };
  }

  /* ===== CERRAR SESIÓN ===== */
  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    intentar {
      const { getAuth, signOut } = await import("https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js");
      esperar a firmar(obtenerAutenticación());
    } capturar (e) {
      console.error("Error al cerrar sesión:", e);
    }
    localStorage.clear();
    window.location.href = "index.html";
  });

});

/* ===== CARRUSEL PUBLICISTAS ===== */
(función () {
  // Espera a que el DOM esté listo antes de inicializar el carrusel
  función initCarrusel() {
    const track = document.getElementById("pubTrack");
    si (!track) regresar;

    const dotsWrap = document.getElementById("pubDots");
    const contador = document.getElementById("pubCounter");
    const modalBox = document.querySelector("#modelosModal .modal-publicistas-box");
    const slides = track.querySelectorAll(".pub-slide");
    sea cur = 0;

    const colores = [
      "linear-gradient(110deg,#E01B1B,#E01B1B,#fff0f8)",
      "gradiente-lineal(110 grados,#56CFFC,#56CFFC,#fff0f8)",
      "gradiente-lineal(110 grados,#128C03,#128C03,#fff0f8)",
      "gradiente-lineal(110 grados,#EA87ED,#EA87ED,#fff0f8)",
    ];

    diapositivas.forEach((_, i) => {
      const d = document.createElement("div");
      d.className = "pub-dot" + (i === 0 ? " active" : "");
      d.onclick = () => ir(i);
      dotsWrap.appendChild(d);
    });

    función go(n) {
      cur = (n + slides.length) % slides.length;
      track.style.transform = `translateX(-${cur * 100}%)`;
      dotsWrap.querySelectorAll(".pub-dot").forEach((d, i) => d.classList.toggle("active", i === cur));
      contador.texto = `${cur + 1} / ${slides.length}`;
      if (modalBox && colores[cur]) modalBox.style.background = colores[cur];
    }

    document.getElementById("pubNext").onclick = () => go(cur + 1);
    document.getElementById("pubPrev").onclick = () => go(cur - 1);
    if (modalBox && colores[0]) modalBox.style.background = colores[0];
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCarrusel);
  } demás {
    initCarrusel();
  }
})();
