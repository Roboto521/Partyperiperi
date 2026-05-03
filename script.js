if (localStorage.getItem("loggedIn") !== "true") {
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", function () {

  /* ===== DATOS DE USUARIO ===== */
  const nombreInput = document.getElementById("cliente-nombre");
  const gradoInput  = document.getElementById("cliente-grado");
  if (nombreInput) nombreInput.value = localStorage.getItem("userName") || "";
  if (gradoInput)  gradoInput.value  = localStorage.getItem("userGrado") || "";

  setTimeout(() => {
    window.cargarPuntosUsuario?.();
    window.cargarTicker?.();
  }, 500);

  /* ===== SWIPER ===== */
  if (document.querySelector(".mySwiper-1")) {
    new Swiper(".mySwiper-1", {
      slidesPerView : 1, spaceBetween: 30, loop: true,
      pagination    : { el:".swiper-pagination", clickable:true },
      navigation    : { nextEl:".swiper-button-next", prevEl:".swiper-button-prev" }
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
    ['rankingModal','rankingJuegoModal','gameModal','resultModal','modelosModal','secretariasModal'].forEach(id => {
      const m = document.getElementById(id);
      if (m) m.style.display = 'none';
    });
    window._cerrarJuego?.();
  }
  function cerrarAlFondo(id) {
    document.getElementById(id)?.addEventListener("click", e => {
      if (e.target.id === id) e.target.style.display = "none";
    });
  }

  /* ===== SLIDER ===== */
  window.agregarDesdeSlider = function(name) {
    document.querySelector(`.add-to-cart[data-name="${name}"]`)?.click();
    const dropdown = document.getElementById('cart-dropdown');
    if (dropdown) dropdown.style.display = 'block';
  };

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
    toast.textContent = msg;
    toast.style.bottom = "30px";
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

  document.querySelectorAll(".add-to-cart").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      agregarAlCarrito(btn.dataset.name, btn.dataset.price, btn.dataset.img);
    });
  });

  document.addEventListener('agregarProducto', e => {
    agregarAlCarrito(e.detail.name, e.detail.price, e.detail.img);
  });

  /* ===== RENDER CARRITO ===== */
  function updateCart() {
    cartItemsList.innerHTML = "";
    let total = 0, count = 0;

    cart.forEach((item, index) => {
      total += item.price * item.quantity;
      count += item.quantity;

      const stock     = window._stockActual || {};
      const stockDisp = stock[item.name] !== undefined ? stock[item.name] : Infinity;
      const maxPerm   = Math.min(MAX_COMPRA(), stockDisp);
      const puedeSubir = item.quantity < maxPerm;

      const li = document.createElement("li");
      li.innerHTML = `
        <img src="${item.img}" width="40" style="border-radius:8px;object-fit:contain;flex-shrink:0;">
        <span class="cart-item-nombre">${item.name} <b>x${item.quantity}</b></span>
        <div class="cart-item-btns">
          <button class="btn-mas"    data-index="${index}" ${puedeSubir ? "" : "disabled"}>➕</button>
          <button class="btn-menos"  data-index="${index}">➖</button>
          <button class="btn-remove" data-index="${index}">❌</button>
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
      return;
    }

    const nombre = localStorage.getItem("userName")  || "No indicado";
    const grado  = localStorage.getItem("userGrado") || "No indicado";
    const uid    = localStorage.getItem("userUID")   || "";
    const total  = parseFloat(cartTotal.textContent);

    const errores = await window.descontarStock?.(cart) || [];
    if (errores.length > 0) {
      mostrarToast(`⚠️ Stock insuficiente para: ${errores.join(", ")}`, "#ff8c42");
      cart = cart.filter(i => !errores.includes(i.name));
      updateCart();
      return;
    }

    window.guardarPedido?.({ uid, nombre, grado, items:[...cart], total, puntos:Math.floor(total), fecha:new Date().toLocaleString("es-GT") });

    let mensaje = `🍬 Pedido Party Perilingües 🍬\n\n👤 Nombre: ${nombre}\n🎓 Grado/Carrera: ${grado}\n\n`;
    cart.forEach(item => { mensaje += `• ${item.name} x${item.quantity} — Q${(item.price * item.quantity).toFixed(2)}\n`; });
    mensaje += `\n💰 Total: Q${total.toFixed(2)}`;

    cart = []; updateCart();
    window.location.href = `https://wa.me/50239411839?text=${encodeURIComponent(mensaje)}`;
  });

  /* ===== RESTO DE MODALES ===== */
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

const volumenes = [
  0.15,
  1.0,
  0.50,
  0.50,
  0.50,
];

let trackActual    = parseInt(localStorage.getItem("musicTrack")) || 0;
let tiempoGuardado = parseFloat(localStorage.getItem("musicTiempo")) || 0;
if (trackActual >= playlist.length) trackActual = 0;

let cambiando = false;

function cargarCancion(index, desde = 0) {
  cambiando = true;

  // Fade OUT de la canción actual
  const fadeOut = setInterval(() => {
    if (music.volume > 0.02) {
      music.volume = Math.max(0, music.volume - 0.02);
    } else {
      clearInterval(fadeOut);
      music.volume = 0;

      // Cargar nueva canción
      music.src    = playlist[index];
      music.load();
      music.oncanplay = () => {
        music.oncanplay = null;
        if (desde > 0) music.currentTime = desde;
        music.play().catch(() => {});

        // Fade IN de la nueva canción
        const targetVol = volumenes[index];
        music.volume = 0;
        const fadeIn = setInterval(() => {
          if (music.volume < targetVol - 0.02) {
            music.volume = Math.min(targetVol, music.volume + 0.02);
          } else {
            music.volume = targetVol;
            clearInterval(fadeIn);
            setTimeout(() => { cambiando = false; }, 500);
          }
        }, 50);
      };
    }
  }, 50);
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

setInterval(() => {
  if (!music.paused && !music.muted && !cambiando && music.duration > 0) {
    if (music.currentTime >= music.duration - 0.5) {
      trackActual = (trackActual + 1) % playlist.length;
      localStorage.setItem("musicTrack",  trackActual);
      localStorage.setItem("musicTiempo", 0);
      cargarCancion(trackActual, 0);
    }
  }
}, 1000);

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
    } catch(e) { console.error("Error al cerrar sesión:", e); }
    localStorage.clear();
    window.location.href = "index.html";
  });

});

// ===== CARRUSEL PUBLICISTAS =====
(function(){
  const track    = document.getElementById('pubTrack');
  if(!track) return;
  const dotsWrap = document.getElementById('pubDots');
  const counter  = document.getElementById('pubCounter');
  const modalBox = document.querySelector('#modelosModal .modal-publicistas-box');
  const slides   = track.querySelectorAll('.pub-slide');
  let cur = 0;

  const colores = [
    'linear-gradient(110deg,#E01B1B,#E01B1B,#fff0f8)',
    'linear-gradient(110deg,#56CFFC,#56CFFC,#fff0f8)',
    'linear-gradient(110deg,#128C03,#128C03,#fff0f8)',
    'linear-gradient(110deg,#EA87ED,#EA87ED,#fff0f8)',
  ];

  slides.forEach((_,i) => {
    const d = document.createElement('div');
    d.className = 'pub-dot' + (i===0?' active':'');
    d.onclick = () => go(i);
    dotsWrap.appendChild(d);
  });

  function go(n){
    cur = (n + slides.length) % slides.length;
    track.style.transform = `translateX(-${cur*100}%)`;
    dotsWrap.querySelectorAll('.pub-dot').forEach((d,i) => d.classList.toggle('active', i===cur));
    counter.textContent = `${cur+1} / ${slides.length}`;
    if(modalBox && colores[cur]) modalBox.style.background = colores[cur];
  }

  document.getElementById('pubNext').onclick = () => go(cur+1);
  document.getElementById('pubPrev').onclick = () => go(cur-1);
  if(modalBox && colores[0]) modalBox.style.background = colores[0];
})();
