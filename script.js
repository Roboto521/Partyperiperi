if (localStorage.getItem("loggedIn") !== "true") {
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", function () {

  /* ===== DATOS DE USUARIO ===== */
  const nombreInput = document.getElementById("cliente-nombre");
  const gradoInput  = document.getElementById("cliente-grado");
  if (nombreInput) nombreInput.value = localStorage.getItem("userName")  || "";
  if (gradoInput)  gradoInput.value  = localStorage.getItem("userGrado") || "";

  setTimeout(() => {
    window.cargarPuntosUsuario?.();
    window.cargarTicker?.();
  }, 500);

  /* ===== SWIPER ===== */
  if (document.querySelector(".mySwiper-1")) {
    new Swiper(".mySwiper-1", {
      slidesPerView : 1, spaceBetween: 30, loop: true,
      pagination    : { el: ".swiper-pagination", clickable: true },
      navigation    : { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" }
    });
  }

  /* ===== TABS ===== */
  const tabBtns     = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  function activateTab(tabId) {
    tabBtns.forEach(b => b.classList.remove("active"));
    tabContents.forEach(c => c.classList.remove("active"));
    document.querySelector(`[data-tab="${tabId}"]`)?.classList.add("active");
    document.getElementById(tabId)?.classList.add("active");
  }
  tabBtns.forEach(btn => btn.addEventListener("click", () => activateTab(btn.dataset.tab)));

  /* ===== BÚSQUEDA ===== */
  document.getElementById("searchInput")?.addEventListener("input", function () {
    const term = this.value.toLowerCase().trim();
    let firstMatchTab = null;
    tabContents.forEach(tab => {
      let found = false;
      tab.querySelectorAll(".product").forEach(product => {
        const match = term === "" || product.innerText.toLowerCase().includes(term);
        product.style.display = match ? "flex" : "none";
        if (match) found = true;
      });
      if (found && !firstMatchTab) firstMatchTab = tab.id;
    });
    if (firstMatchTab) activateTab(firstMatchTab);
  });

  /* ===== CERRAR MODALES ===== */
  function cerrarTodosLosModales() {
    ["rankingModal","rankingJuegoModal","gameModal","resultModal","modelosModal","secretariasModal"].forEach(id => {
      const m = document.getElementById(id);
      if (m) m.style.display = "none";
    });
    window._cerrarJuego?.();
  }
  function cerrarAlFondo(id) {
    document.getElementById(id)?.addEventListener("click", e => {
      if (e.target.id === id) e.target.style.display = "none";
    });
  }

  /* ===== TOAST ===== */
  function mostrarToast(msg, color = "#ff4d6d") {
    let toast = document.getElementById("toast-stock");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast-stock";
      toast.style.cssText = `
        position:fixed; bottom:-100px; left:50%; transform:translateX(-50%);
        padding:12px 24px; border-radius:999px; font-weight:700; font-size:0.88rem;
        box-shadow:0 8px 30px rgba(0,0,0,0.3); transition:bottom 0.4s cubic-bezier(.17,.67,.39,1.4);
        z-index:999999; color:white; text-align:center; max-width:85vw; line-height:1.4;
      `;
      document.body.appendChild(toast);
    }
    toast.style.background = color;
    toast.textContent      = msg;
    toast.style.bottom     = "30px";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.style.bottom = "-100px"; }, 3000);
  }

  /* ===== CARRITO ===== */
  let cart = [];
  const MAX_COMPRA = () => window._MAX_POR_COMPRA || 10;

  const cartItemsList = document.getElementById("cart-items");
  const cartTotal     = document.getElementById("cart-total");
  const cartCount     = document.getElementById("cart-count");
  const cartDropdown  = document.getElementById("cart-dropdown");

  document.getElementById("cart-toggle")?.addEventListener("click", () => {
    cartDropdown.style.display = cartDropdown.style.display === "block" ? "none" : "block";
  });

  /* ===== SUMA SIN ERRORES DE PUNTO FLOTANTE ===== */
  function sumarTotal(items) {
    let totalCentavos = 0;
    items.forEach(item => {
      totalCentavos += Math.round(item.price * 100) * item.quantity;
    });
    return totalCentavos / 100;
  }

  /* ===== AGREGAR AL CARRITO ===== */
  function agregarAlCarrito(name, price, img) {
    const stock          = window._stockActual || {};
    const existing       = cart.find(i => i.name === name);
    const cantidadActual = existing ? existing.quantity : 0;
    const stockDisp      = stock[name] !== undefined ? stock[name] : Infinity;

    if (cantidadActual >= MAX_COMPRA()) {
      mostrarToast(`⚠️ Máximo ${MAX_COMPRA()} unidades de "${name}" por compra`, "#ff8c42");
      return;
    }
    if (cantidadActual >= stockDisp) {
      mostrarToast(`📦 Solo hay ${stockDisp} "${name}" disponibles`, "#9d6bff");
      return;
    }

    if (existing) existing.quantity++;
    else cart.push({ name, price: parseFloat(price), img, quantity: 1 });
    updateCart();
  }

  /* ===== BIND BOTONES DE CARRITO ===== */
  window._bindCartButtons = function () {
    document.querySelectorAll(".add-to-cart").forEach(btn => {
      if (btn._cartBound) return;
      btn._cartBound = true;
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        agregarAlCarrito(btn.dataset.name, btn.dataset.price, btn.dataset.img);
      });
    });
  };

  window._bindCartButtons();

  document.addEventListener("agregarProducto", e => {
    agregarAlCarrito(e.detail.name, e.detail.price, e.detail.img);
  });

  /* ===== SLIDER ===== */
  window.agregarDesdeSlider = function (name) {
    const btn = document.querySelector(`.add-to-cart[data-name="${name}"]:not(.sin-stock):not([disabled])`);
    if (!btn) {
      mostrarToast(`📦 "${name}" no está disponible en este momento`, "#9d6bff");
      return;
    }
    document.dispatchEvent(new CustomEvent("agregarProducto", {
      detail: { name: btn.dataset.name, price: btn.dataset.price, img: btn.dataset.img }
    }));
    if (cartDropdown) cartDropdown.style.display = "block";
  };

  /* ===== RENDER CARRITO ===== */
  function updateCart() {
    cartItemsList.innerHTML = "";
    let count = 0;

    cart.forEach((item, index) => {
      count += item.quantity;

      const stock      = window._stockActual || {};
      const stockDisp  = stock[item.name] !== undefined ? stock[item.name] : Infinity;
      const maxPerm    = Math.min(MAX_COMPRA(), stockDisp);
      const puedeSubir = item.quantity < maxPerm;

      const subtotalItem = (Math.round(item.price * 100) * item.quantity) / 100;

      const li = document.createElement("li");
      li.innerHTML = `
        <img src="${item.img}" width="40" style="border-radius:8px;object-fit:contain;flex-shrink:0;">
        <span class="cart-item-nombre">${item.name} <b>x${item.quantity}</b> — Q${subtotalItem.toFixed(2)}</span>
        <div class="cart-item-btns">
          <button class="btn-mas"    data-index="${index}" ${puedeSubir ? "" : "disabled"}>➕</button>
          <button class="btn-menos"  data-index="${index}">➖</button>
          <button class="btn-remove" data-index="${index}">❌</button>
        </div>
      `;
      cartItemsList.appendChild(li);
    });

    const total = sumarTotal(cart);
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
        updateCart();
      });
    });
    cartItemsList.querySelectorAll(".btn-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        cart.splice(parseInt(btn.dataset.index), 1);
        updateCart();
      });
    });
  }

  document.getElementById("clear-cart")?.addEventListener("click", () => { cart = []; updateCart(); });

  /* ===== COMPRAR ===== */
  document.getElementById("buy-cart")?.addEventListener("click", async () => {
    if (cart.length === 0) { mostrarToast("🍬 Tu carrito está vacío", "#ff4d6d"); return; }

    // ✅ PROTECCIÓN DOBLE CLICK — bloquear botón mientras procesa
    const buyBtn = document.getElementById("buy-cart");
    if (buyBtn.disabled) return;
    buyBtn.disabled    = true;
    buyBtn.textContent = "⏳ Procesando...";

    // Función para re-habilitar el botón si algo falla
    function resetBtn() {
      buyBtn.disabled    = false;
      buyBtn.textContent = "Comprar";
    }

    const problemas = window.validarCarritoContraStock?.(cart) || [];
    if (problemas.length > 0) {
      const msgs = problemas.map(p =>
        p.esLimite
          ? `• ${p.nombre}: máximo ${p.disponible} por compra`
          : p.disponible === 0
            ? `• ${p.nombre}: sin stock`
            : `• ${p.nombre}: solo quedan ${p.disponible}`
      );
      mostrarToast("⚠️ " + msgs.join(" | "), "#ff4d6d");
      problemas.forEach(p => {
        const item = cart.find(i => i.name === p.nombre);
        if (!item) return;
        if (p.disponible === 0) cart = cart.filter(i => i.name !== p.nombre);
        else item.quantity = p.disponible;
      });
      updateCart();
      resetBtn(); // re-habilitar si hay problemas de stock
      return;
    }

    const nombre = localStorage.getItem("userName")  || "No indicado";
    const grado  = localStorage.getItem("userGrado") || "No indicado";
    const uid    = localStorage.getItem("userUID")   || "";

    const total  = sumarTotal(cart);
    const puntos = Math.floor(total);

    const errores = await window.descontarStock?.(cart) || [];
    if (errores.length > 0) {
      mostrarToast(`⚠️ Stock insuficiente para: ${errores.join(", ")}`, "#ff8c42");
      cart = cart.filter(i => !errores.includes(i.name));
      updateCart();
      resetBtn(); // re-habilitar si hay errores de Firebase
      return;
    }

    window.guardarPedido?.({
      uid, nombre, grado,
      items : [...cart],
      total,
      puntos,
      fecha : new Date().toLocaleString("es-GT")
    });

    let mensaje = `🍬 Pedido Party Perilingüe 🍬\n\n👤 Nombre: ${nombre}\n🎓 Grado/Carrera: ${grado}\n\n`;
    cart.forEach(item => {
      const subtotal = (Math.round(item.price * 100) * item.quantity) / 100;
      mensaje += `• ${item.name} x${item.quantity} — Q${subtotal.toFixed(2)}\n`;
    });
    mensaje += `\n💰 Total: Q${total.toFixed(2)}`;

    cart = [];
    updateCart();
    resetBtn(); // re-habilitar por si el usuario regresa de WhatsApp
    window.open(`https://wa.me/50239411839?text=${encodeURIComponent(mensaje)}`, "_blank");
  });

  /* ===== MODALES ===== */
  document.getElementById("closeResult")?.addEventListener("click", () => {
    document.getElementById("resultModal").style.display = "none";
  });

  document.getElementById("ranking-btn")?.addEventListener("click", () => {
    cerrarTodosLosModales();
    document.getElementById("rankingModal").style.display = "flex";
    window.cargarRanking?.();
  });
  document.getElementById("closeRanking")?.addEventListener("click", () => {
    document.getElementById("rankingModal").style.display = "none";
  });
  cerrarAlFondo("rankingModal");

  document.getElementById("ranking-juego-btn")?.addEventListener("click", () => {
    cerrarTodosLosModales();
    document.getElementById("rankingJuegoModal").style.display = "flex";
    window.cargarRankingJuego?.();
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
  const music    = document.getElementById("bg-music");
  const musicBtn = document.getElementById("music-btn");

  const playlist = [
    "musica/Just the way you are milky best part loop.mp3",
    "musica/MY TALKING TOM - CAKE TOWER SOUNDTRACK OST.mp3",
    "musica/Sweet Sweet Canyon - Mario Kart 8 OST.mp3",
    "musica/Animal Crossing - Bubblegum K.K. [Remix].mp3",
    "musica/Kirby's Return to Dream Land  Adventure Wii - Menu.mp3"
  ];
  const volumenes = [0.15, 1.0, 0.50, 0.50, 0.50];

  let trackActual    = parseInt(localStorage.getItem("musicTrack")) || 0;
  let tiempoGuardado = parseFloat(localStorage.getItem("musicTiempo")) || 0;
  if (trackActual >= playlist.length) trackActual = 0;

  function cargarCancion(index, desde = 0) {
    music.src    = playlist[index];
    music.volume = volumenes[index];
    music.load();
    music.oncanplay = () => {
      music.oncanplay = null;
      if (desde > 0) music.currentTime = desde;
      music.play().catch(() => {});
    };
  }

  music.addEventListener("timeupdate", () => {
    localStorage.setItem("musicTrack",  trackActual);
    localStorage.setItem("musicTiempo", music.currentTime);
  });

  music.addEventListener("ended", () => {
    trackActual = (trackActual + 1) % playlist.length;
    localStorage.setItem("musicTrack",  trackActual);
    localStorage.setItem("musicTiempo", 0);
    cargarCancion(trackActual, 0);
  });

  if (music && musicBtn) {
    musicBtn.classList.add("muted");

    document.addEventListener("click", () => {
      music.muted = false;
      cargarCancion(trackActual, tiempoGuardado);
      musicBtn.textContent = "🔊";
      musicBtn.classList.replace("muted", "playing");
    }, { once: true });

    musicBtn.addEventListener("click", e => {
      e.stopPropagation();
      if (music.muted || music.paused) {
        music.muted = false;
        music.play().catch(() => {});
        musicBtn.textContent = "🔊";
        musicBtn.classList.replace("muted", "playing");
      } else {
        music.muted = true;
        musicBtn.textContent = "🔇";
        musicBtn.classList.replace("playing", "muted");
      }
    });
  }

  /* ===== PUBLICIDAD ===== */
  const ad      = document.getElementById("adModal");
  const closeAd = document.getElementById("closeAd");
  if (ad && closeAd) {
    setTimeout(() => { ad.style.display = "flex"; ad.classList.add("show-ad"); }, 500);
    closeAd.onclick = () => {
      ad.classList.remove("show-ad");
      setTimeout(() => { ad.style.display = "none"; }, 300);
    };
  }

  /* ===== LOGOUT ===== */
  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    try {
      const { getAuth, signOut } = await import("https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js");
      await signOut(getAuth());
    } catch (e) {
      console.error("Error al cerrar sesión:", e);
    }
    localStorage.clear();
    window.location.href = "index.html";
  });

});

/* ===== CARRUSEL PUBLICISTAS ===== */
(function () {
  function initCarrusel() {
    const track = document.getElementById("pubTrack");
    if (!track) return;

    const dotsWrap = document.getElementById("pubDots");
    const counter  = document.getElementById("pubCounter");
    const modalBox = document.querySelector("#modelosModal .modal-publicistas-box");
    const slides   = track.querySelectorAll(".pub-slide");
    let cur = 0;

    const colores = [
      "linear-gradient(110deg,#E01B1B,#E01B1B,#fff0f8)",
      "linear-gradient(110deg,#56CFFC,#56CFFC,#fff0f8)",
      "linear-gradient(110deg,#128C03,#128C03,#fff0f8)",
      "linear-gradient(110deg,#EA87ED,#EA87ED,#fff0f8)",
    ];

    slides.forEach((_, i) => {
      const d     = document.createElement("div");
      d.className = "pub-dot" + (i === 0 ? " active" : "");
      d.onclick   = () => go(i);
      dotsWrap.appendChild(d);
    });

    function go(n) {
      cur = (n + slides.length) % slides.length;
      track.style.transform = `translateX(-${cur * 100}%)`;
      dotsWrap.querySelectorAll(".pub-dot").forEach((d, i) => d.classList.toggle("active", i === cur));
      counter.textContent = `${cur + 1} / ${slides.length}`;
      if (modalBox && colores[cur]) modalBox.style.background = colores[cur];
    }

    document.getElementById("pubNext").onclick = () => go(cur + 1);
    document.getElementById("pubPrev").onclick = () => go(cur - 1);
    if (modalBox && colores[0]) modalBox.style.background = colores[0];
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCarrusel);
  } else {
    initCarrusel();
  }
})();
