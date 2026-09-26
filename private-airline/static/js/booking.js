/* booking.js — flight search, booking, contact form, modals, map, carousel */
(function () {
  "use strict";

  const DATA = window.__AURELIA_DATA__ || { fleet: [], destinations: [] };

  /* ---------------------------------------------------------------------
     Helpers
  --------------------------------------------------------------------- */
  function clearErrors(form) {
    form.querySelectorAll(".field-error").forEach((e) => (e.textContent = ""));
    form.querySelectorAll(".field").forEach((f) => f.classList.remove("invalid"));
  }

  function showErrors(form, errors) {
    Object.entries(errors).forEach(([key, msg]) => {
      const errEl = form.querySelector(`.field-error[data-for="${key}"]`);
      if (errEl) {
        errEl.textContent = msg;
        errEl.closest(".field")?.classList.add("invalid");
      }
    });
  }

  async function postJSON(url, payload) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  function setLoading(btn, loading) {
    btn.classList.toggle("loading", loading);
    btn.disabled = loading;
  }

  /* ---------------------------------------------------------------------
     Flight search
  --------------------------------------------------------------------- */
  const searchForm = document.getElementById("searchForm");
  const resultsWrap = document.getElementById("searchResults");
  const resultsGrid = document.getElementById("searchResultsGrid");

  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(searchForm);
    const submitBtn = searchForm.querySelector(".booking-submit");
    setLoading(submitBtn, true);

    const payload = {
      departure: searchForm.departure.value,
      destination: searchForm.destination.value,
      departDate: searchForm.departDate.value,
      returnDate: searchForm.returnDate.value,
      passengers: searchForm.passengers.value,
    };

    const { ok, data } = await postJSON("/api/search", payload);
    setLoading(submitBtn, false);

    if (!ok) {
      showErrors(searchForm, data.errors || {});
      return;
    }

    renderResults(data.results, payload);
  });

  function renderResults(results, query) {
    resultsGrid.innerHTML = "";
    results.forEach((craft) => {
      const card = document.createElement("div");
      card.className = "result-card";
      card.innerHTML = `
        <span class="category">${craft.category}</span>
        <h4>${craft.name}</h4>
        <ul>
          <li>Passengers: ${craft.passengers}</li>
          <li>Range: ${craft.range_km}+ km</li>
          <li>Speed: ${craft.speed_kmh} km/h</li>
        </ul>
        <button class="btn btn-primary" type="button" data-book="${craft.id}">Book This Aircraft</button>
      `;
      card.querySelector("[data-book]").addEventListener("click", () => openBookingConfirm(craft, query));
      resultsGrid.appendChild(card);
    });
    resultsWrap.hidden = false;
    resultsWrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function openBookingConfirm(craft, query) {
    const payload = {
      departure: query.departure,
      destination: query.destination,
      departDate: query.departDate,
      returnDate: query.returnDate,
      passengers: query.passengers,
      aircraft: craft.name,
    };
    const { ok, data } = await postJSON("/api/book", payload);
    if (ok) {
      showConfirmToast(data.reference);
    } else {
      alertInline("There was a problem submitting your request. Please check your details and try again.");
    }
  }

  function alertInline(msg) {
    resultsWrap.hidden = false;
    const note = document.createElement("p");
    note.style.color = "#ff9d8a";
    note.style.fontSize = ".85rem";
    note.textContent = msg;
    resultsGrid.after(note);
    setTimeout(() => note.remove(), 4000);
  }

  /* ---------------------------------------------------------------------
     Confirmation toast
  --------------------------------------------------------------------- */
  const confirmToast = document.getElementById("confirmToast");
  const confirmRef = document.getElementById("confirmRef");
  document.getElementById("confirmClose").addEventListener("click", () => (confirmToast.hidden = true));
  confirmToast.addEventListener("click", (e) => {
    if (e.target === confirmToast) confirmToast.hidden = true;
  });

  function showConfirmToast(reference) {
    confirmRef.textContent = reference ? `Reference: ${reference}` : "";
    confirmToast.hidden = false;
  }

  /* ---------------------------------------------------------------------
     Aircraft detail modal
  --------------------------------------------------------------------- */
  const modal = document.getElementById("aircraftModal");
  const modalBody = document.getElementById("modalBody");

  function openModal(craft) {
    modalBody.innerHTML = `
      <div class="modal-gallery">
        <div class="modal-gallery-main" style="background-image:url('/static/images/${craft.image}'); background-size:cover; background-position:center 55%;"></div>
      </div>
      <span class="eyebrow">${craft.category}</span>
      <h2 style="margin-top:10px;">${craft.name}</h2>
      <p class="muted">${craft.blurb}</p>
      <div class="modal-detail-grid">
        <div><span>Passengers</span><strong>${craft.passengers}</strong></div>
        <div><span>Range</span><strong>${craft.range_km}+ km</strong></div>
        <div><span>Cruise Speed</span><strong>${craft.speed_kmh} km/h</strong></div>
        <div><span>Baggage</span><strong>${craft.baggage}</strong></div>
        <div style="grid-column:1/-1;"><span>Cabin Dimensions</span><strong>${craft.cabin}</strong></div>
      </div>
      <a href="#booking" class="btn btn-primary" data-close style="width:100%; justify-content:center;">Request This Aircraft</a>
    `;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  document.querySelectorAll(".fleet-card").forEach((card) => {
    const id = card.getAttribute("data-aircraft");
    const craft = DATA.fleet.find((c) => c.id === id);
    card.querySelector(".fleet-view")?.addEventListener("click", () => craft && openModal(craft));
  });
  modal.querySelectorAll("[data-close]").forEach((el) =>
    el.addEventListener("click", (e) => {
      closeModal();
      // Allow the "Request This Aircraft" link to still scroll to #booking.
    })
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      confirmToast.hidden = true;
    }
  });

  /* ---------------------------------------------------------------------
     Destinations map
  --------------------------------------------------------------------- */
  const destInfo = document.getElementById("destInfo");
  document.querySelectorAll(".map-pin").forEach((pin) => {
    pin.addEventListener("click", () => {
      document.querySelectorAll(".map-pin").forEach((p) => p.classList.remove("active"));
      pin.classList.add("active");
      const dest = DATA.destinations.find((d) => d.id === pin.getAttribute("data-dest"));
      if (!dest) return;
      destInfo.innerHTML = `
        <div class="dest-info-image"></div>
        <h4>${dest.name}</h4>
        <span class="country">${dest.country}</span>
        <p>${dest.blurb}</p>
        <a href="#booking" class="link-cta" data-cursor="Book">Plan This Route <span class="arrow">&rarr;</span></a>
      `;
    });
  });

  /* ---------------------------------------------------------------------
     Cabin hotspots
  --------------------------------------------------------------------- */
  const hotspotPanel = document.getElementById("hotspotPanel");
  const hotspotData = document.querySelector(".hotspot-data");
  const hotspotTitle = document.getElementById("hotspotTitle");
  const hotspotText = document.getElementById("hotspotText");

  document.querySelectorAll(".hotspot").forEach((btn) => {
    btn.addEventListener("click", () => {
      const n = btn.getAttribute("data-hotspot");
      hotspotTitle.textContent = hotspotData.getAttribute(`data-${n}-title`);
      hotspotText.textContent = hotspotData.getAttribute(`data-${n}-text`);
      hotspotPanel.hidden = false;
    });
  });
  document.getElementById("hotspotClose")?.addEventListener("click", () => (hotspotPanel.hidden = true));

  /* ---------------------------------------------------------------------
     Testimonial carousel
  --------------------------------------------------------------------- */
  const slides = Array.from(document.querySelectorAll(".testimonial-slide"));
  const dotsWrap = document.getElementById("testDots");
  let activeSlide = 0;
  let autoTimer;

  slides.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.addEventListener("click", () => goToSlide(i));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  function goToSlide(i) {
    slides[activeSlide]?.classList.remove("active");
    dots[activeSlide]?.classList.remove("active");
    activeSlide = (i + slides.length) % slides.length;
    slides[activeSlide].classList.add("active");
    dots[activeSlide].classList.add("active");
    resetAuto();
  }

  function resetAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => goToSlide(activeSlide + 1), 6000);
  }

  document.getElementById("testPrev").addEventListener("click", () => goToSlide(activeSlide - 1));
  document.getElementById("testNext").addEventListener("click", () => goToSlide(activeSlide + 1));

  if (slides.length) {
    goToSlide(0);
  }

  /* ---------------------------------------------------------------------
     Contact form
  --------------------------------------------------------------------- */
  const contactForm = document.getElementById("contactForm");
  const contactStatus = document.getElementById("contactStatus");

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(contactForm);
    contactStatus.textContent = "";
    contactStatus.className = "form-status";

    const submitBtn = contactForm.querySelector('button[type="submit"]');
    setLoading(submitBtn, true);

    const payload = {
      fullName: contactForm.fullName.value,
      email: contactForm.email.value,
      phone: contactForm.phone.value,
      passengers: contactForm.passengers.value,
      departure: contactForm.departure.value,
      destination: contactForm.destination.value,
      travelDate: contactForm.travelDate.value,
      message: contactForm.message.value,
    };

    const { ok, data } = await postJSON("/api/contact", payload);
    setLoading(submitBtn, false);

    if (!ok) {
      showErrors(contactForm, data.errors || {});
      contactStatus.textContent = "Please correct the highlighted fields.";
      contactStatus.className = "form-status error";
      return;
    }

    contactStatus.textContent = "Thank you — a member of our concierge team will be in touch shortly.";
    contactStatus.className = "form-status success";
    contactForm.reset();
  });
})();
