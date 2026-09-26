/* main.js — loading screen, navigation, custom cursor */
(function () {
  "use strict";

  /* ---------- Loading screen ---------- */
  const loader = document.getElementById("loader");
  window.addEventListener("load", () => {
    setTimeout(() => {
      loader.classList.add("hidden");
      document.body.style.overflow = "";
    }, 1400);
  });
  document.body.style.overflow = "hidden";

  /* ---------- Navigation scroll state ---------- */
  const nav = document.getElementById("nav");
  const onScroll = () => {
    if (window.scrollY > 40) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  const burger = document.getElementById("navBurger");
  const navMobile = document.getElementById("navMobile");
  burger.addEventListener("click", () => {
    const open = navMobile.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
  });
  navMobile.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => navMobile.classList.remove("open"))
  );

  /* ---------- Custom cursor (desktop only) ---------- */
  const cursor = document.getElementById("cursor");
  const cursorLabel = cursor.querySelector(".cursor-label");
  const isCoarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  if (!isCoarse) {
    let mx = 0, my = 0, cx = 0, cy = 0;
    window.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      cursor.classList.add("active");
    });
    (function raf() {
      cx += (mx - cx) * 0.2;
      cy += (my - cy) * 0.2;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
      requestAnimationFrame(raf);
    })();

    document.querySelectorAll("[data-cursor], a, button").forEach((el) => {
      el.addEventListener("mouseenter", () => {
        const label = el.getAttribute("data-cursor");
        if (label) {
          cursor.classList.add("grow");
          cursorLabel.textContent = label;
        }
      });
      el.addEventListener("mouseleave", () => {
        cursor.classList.remove("grow");
        cursorLabel.textContent = "";
      });
    });
  }
})();
