/* animations.js — GSAP ScrollTrigger reveals, parallax, animated stats */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (typeof gsap === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);

  if (reduceMotion) {
    document.querySelectorAll(".reveal-item, .reveal-up").forEach((el) => el.classList.add("in-view"));
  } else {
    /* ---------- Scroll reveals ---------- */
    const revealEls = document.querySelectorAll(".reveal-item, .reveal-up");
    revealEls.forEach((el, i) => {
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: () => {
          gsap.to(el, {
            delay: (i % 5) * 0.06,
            duration: 0.05,
            onStart: () => el.classList.add("in-view"),
          });
        },
      });
    });

    /* ---------- Hero background subtle parallax ---------- */
    gsap.to(".hero-jet", {
      yPercent: 6,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });

    /* ---------- Cabin section parallax ---------- */
    gsap.to(".cabin-bg", {
      yPercent: 12,
      ease: "none",
      scrollTrigger: { trigger: ".cabin", start: "top bottom", end: "bottom top", scrub: true },
    });
  }

  /* ---------- Animated stat counters ---------- */
  const statEls = document.querySelectorAll(".stat-value");
  statEls.forEach((el) => {
    const target = parseInt(el.getAttribute("data-count"), 10) || 0;
    const suffix = el.getAttribute("data-suffix") || "";
    let done = false;

    const animate = () => {
      if (done) return;
      done = true;
      if (reduceMotion) {
        el.textContent = target + suffix;
        return;
      }
      const obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        duration: 1.6,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = Math.round(obj.val) + suffix;
        },
      });
    };

    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.create({
        trigger: el,
        start: "top 90%",
        once: true,
        onEnter: animate,
      });
    } else {
      animate();
    }
  });
})();
