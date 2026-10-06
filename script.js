const contactConfig = {
  recipientEmail: "heetnasit80@gmail.com",
  mode: "mailto",
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");
const themeToggleIcon = document.querySelector(".theme-toggle__icon");
const menuToggle = document.querySelector(".menu-toggle");
const navPanel = document.querySelector(".nav-panel");
const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll("main section[id]");
const revealItems = document.querySelectorAll(".reveal");
const scrollTopButton = document.querySelector(".scroll-top");
const contactForm = document.querySelector("#contact-form");
const footerYear = document.querySelector("#footer-year");
const sceneCanvas = document.querySelector("#scene");
const sceneContext = sceneCanvas?.getContext("2d", { alpha: true });
const scenePoints = createKnotPoints(280);
const sceneState = {
  width: 0,
  height: 0,
  pointerX: 0,
  pointerY: 0,
  targetPointerX: 0,
  targetPointerY: 0,
  time: 0,
};

function createKnotPoints(count) {
  return Array.from({ length: count }, (_, index) => {
    const progress = index / count;
    const angle = progress * Math.PI * 2;
    const majorRadius = 1;
    const tubeRadius = 0.34;
    const tubeAngle = angle * 3;
    const ringAngle = angle * 2;
    const ring = majorRadius + tubeRadius * Math.cos(tubeAngle);

    return {
      x: ring * Math.cos(ringAngle),
      y: ring * Math.sin(ringAngle),
      z: tubeRadius * Math.sin(tubeAngle),
    };
  });
}

function rotatePoint(point, rotationX, rotationY, rotationZ) {
  const cosX = Math.cos(rotationX);
  const sinX = Math.sin(rotationX);
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);
  const cosZ = Math.cos(rotationZ);
  const sinZ = Math.sin(rotationZ);

  const yAfterX = point.y * cosX - point.z * sinX;
  const zAfterX = point.y * sinX + point.z * cosX;
  const xAfterY = point.x * cosY + zAfterX * sinY;
  const zAfterY = -point.x * sinY + zAfterX * cosY;

  return {
    x: xAfterY * cosZ - yAfterX * sinZ,
    y: xAfterY * sinZ + yAfterX * cosZ,
    z: zAfterY,
  };
}

function getSceneColor() {
  const isDark = root.dataset.theme === "dark";
  return isDark ? "243, 241, 236" : "17, 17, 17";
}

function drawScene(elapsedTime = 0) {
  if (!sceneContext || !sceneState.width || !sceneState.height) return;

  const { width, height } = sceneState;
  const isMobile = width < 640;
  const centerX = width * (isMobile ? 0.5 : 0.67);
  const centerY = height * (isMobile ? 0.47 : 0.5);
  const scale = Math.min(width, height) * (isMobile ? 1.72 : 1.36);
  const rotationY = elapsedTime * 0.13 + sceneState.pointerX * 0.18;
  const rotationX = sceneState.pointerY * 0.13 - 0.12;
  const rotationZ = elapsedTime * 0.035;
  const cameraDistance = 3.8;
  const color = getSceneColor();
  const projected = scenePoints.map((point) => {
    const rotated = rotatePoint(point, rotationX, rotationY, rotationZ);
    const perspective = 1 / (cameraDistance + rotated.z);

    return {
      x: centerX + rotated.x * scale * perspective,
      y: centerY + rotated.y * scale * perspective,
      depth: perspective,
    };
  });
  const segments = projected.map((point, index) => {
    const nextPoint = projected[(index + 1) % projected.length];

    return {
      point,
      nextPoint,
      depth: (point.depth + nextPoint.depth) / 2,
    };
  });

  segments.sort((first, second) => first.depth - second.depth);
  sceneContext.clearRect(0, 0, width, height);
  sceneContext.save();
  sceneContext.globalCompositeOperation = "source-over";
  sceneContext.lineCap = "round";

  segments.forEach(({ point, nextPoint, depth }) => {
    const depthRatio = Math.max(0, Math.min(1, (depth - 0.255) / 0.08));
    sceneContext.beginPath();
    sceneContext.moveTo(point.x, point.y);
    sceneContext.lineTo(nextPoint.x, nextPoint.y);
    sceneContext.strokeStyle = `rgba(${color}, ${0.04 + depthRatio * 0.22})`;
    sceneContext.lineWidth = 0.45 + depthRatio * 1.15;
    sceneContext.stroke();
  });

  sceneContext.beginPath();
  sceneContext.ellipse(centerX, centerY, scale * 0.56, scale * 0.18, rotationZ, 0, Math.PI * 2);
  sceneContext.strokeStyle = `rgba(${color}, 0.08)`;
  sceneContext.lineWidth = 0.7;
  sceneContext.stroke();
  sceneContext.restore();
}

function resizeScene() {
  if (!sceneCanvas || !sceneContext) return;

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  sceneState.width = window.innerWidth;
  sceneState.height = window.innerHeight;
  sceneCanvas.width = Math.floor(sceneState.width * pixelRatio);
  sceneCanvas.height = Math.floor(sceneState.height * pixelRatio);
  sceneContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  drawScene(sceneState.time);
}

function handleScenePointerMove(event) {
  if (prefersReducedMotion) return;

  sceneState.targetPointerX = (event.clientX / window.innerWidth) * 2 - 1;
  sceneState.targetPointerY = (event.clientY / window.innerHeight) * 2 - 1;
}

function animateScene(timestamp) {
  sceneState.time = timestamp * 0.001;
  sceneState.pointerX += (sceneState.targetPointerX - sceneState.pointerX) * 0.045;
  sceneState.pointerY += (sceneState.targetPointerY - sceneState.pointerY) * 0.045;
  drawScene(sceneState.time);
  window.requestAnimationFrame(animateScene);
}

function setupScene() {
  if (!sceneCanvas || !sceneContext) {
    sceneCanvas?.remove();
    return;
  }

  resizeScene();
  window.addEventListener("resize", resizeScene, { passive: true });
  window.addEventListener("pointermove", handleScenePointerMove, { passive: true });

  if (prefersReducedMotion) {
    drawScene(0);
    return;
  }

  window.requestAnimationFrame(animateScene);
}

function setTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem("theme", theme);

  const isDark = theme === "dark";
  themeToggle?.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");

  if (themeToggleIcon) {
    themeToggleIcon.textContent = "";
  }

  drawScene(sceneState.time);
}

function closeMobileMenu() {
  document.body.classList.remove("menu-open");
  navPanel?.classList.remove("is-open");
  menuToggle?.setAttribute("aria-expanded", "false");
  menuToggle?.setAttribute("aria-label", "Open navigation menu");
}

function toggleMobileMenu() {
  const isOpen = menuToggle?.getAttribute("aria-expanded") === "true";

  document.body.classList.toggle("menu-open", !isOpen);
  navPanel?.classList.toggle("is-open", !isOpen);
  menuToggle?.setAttribute("aria-expanded", String(!isOpen));
  menuToggle?.setAttribute("aria-label", isOpen ? "Open navigation menu" : "Close navigation menu");
}

function updateScrollTopButton() {
  scrollTopButton?.classList.toggle("is-visible", window.scrollY > 520);
}

function updateActiveNavLink() {
  const currentSection = [...sections]
    .reverse()
    .find((section) => window.scrollY >= section.offsetTop - 120);

  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${currentSection?.id}`);
  });
}

function setupRevealObserver() {
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

function setupNavObserver() {
  if (!("IntersectionObserver" in window)) {
    window.addEventListener("scroll", updateActiveNavLink, { passive: true });
    updateActiveNavLink();
    return;
  }

  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        navLinks.forEach((link) => {
          link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
        });
      });
    },
    {
      rootMargin: "-35% 0px -55% 0px",
      threshold: 0,
    }
  );

  sections.forEach((section) => navObserver.observe(section));
}

// To switch this form to Formspree or Web3Forms later, keep contactConfig and replace only this function's submit branch.
function handleContactSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const fields = {
    name: form.elements.name,
    email: form.elements.email,
    message: form.elements.message,
  };
  const errors = {
    name: document.querySelector("#name-error"),
    email: document.querySelector("#email-error"),
    message: document.querySelector("#message-error"),
  };
  const values = {
    name: fields.name.value.trim(),
    email: fields.email.value.trim(),
    message: fields.message.value.trim(),
  };
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let isValid = true;

  Object.values(fields).forEach((field) => field.setAttribute("aria-invalid", "false"));
  Object.values(errors).forEach((error) => {
    if (error) error.textContent = "";
  });

  if (!values.name) {
    isValid = false;
    fields.name.setAttribute("aria-invalid", "true");
    errors.name.textContent = "Please enter your name.";
  }

  if (!values.email) {
    isValid = false;
    fields.email.setAttribute("aria-invalid", "true");
    errors.email.textContent = "Please enter your email.";
  } else if (!emailPattern.test(values.email)) {
    isValid = false;
    fields.email.setAttribute("aria-invalid", "true");
    errors.email.textContent = "Please enter a valid email address.";
  }

  if (!values.message) {
    isValid = false;
    fields.message.setAttribute("aria-invalid", "true");
    errors.message.textContent = "Please enter a message.";
  }

  if (!isValid) {
    const firstInvalidField = Object.values(fields).find((field) => field.getAttribute("aria-invalid") === "true");
    firstInvalidField?.focus();
    return;
  }

  if (contactConfig.mode === "mailto") {
    const subject = encodeURIComponent(`Portfolio contact from ${values.name}`);
    const body = encodeURIComponent(`Name: ${values.name}\nEmail: ${values.email}\n\n${values.message}`);
    window.location.href = `mailto:${contactConfig.recipientEmail}?subject=${subject}&body=${body}`;
  }
}

function setupOverlayNavigation() {
  if (!window.jQuery) return;

  const $ = window.jQuery;

  $(".open-overlay").click(function () {
    var overlay_navigation = $(".overlay-navigation"),
      nav_item_1 = $(".overlay-navigation nav li:nth-of-type(1)"),
      nav_item_2 = $(".overlay-navigation nav li:nth-of-type(2)"),
      nav_item_3 = $(".overlay-navigation nav li:nth-of-type(3)"),
      nav_item_4 = $(".overlay-navigation nav li:nth-of-type(4)"),
      nav_item_5 = $(".overlay-navigation nav li:nth-of-type(5)"),
      top_bar = $(".bar-top"),
      middle_bar = $(".bar-middle"),
      bottom_bar = $(".bar-bottom");

    overlay_navigation.toggleClass("overlay-active");
    if (overlay_navigation.hasClass("overlay-active")) {
      top_bar.removeClass("animate-out-top-bar").addClass("animate-top-bar");
      middle_bar.removeClass("animate-out-middle-bar").addClass("animate-middle-bar");
      bottom_bar.removeClass("animate-out-bottom-bar").addClass("animate-bottom-bar");
      overlay_navigation.removeClass("overlay-slide-up").addClass("overlay-slide-down");
      nav_item_1.removeClass("slide-in-nav-item-reverse").addClass("slide-in-nav-item");
      nav_item_2.removeClass("slide-in-nav-item-delay-1-reverse").addClass("slide-in-nav-item-delay-1");
      nav_item_3.removeClass("slide-in-nav-item-delay-2-reverse").addClass("slide-in-nav-item-delay-2");
      nav_item_4.removeClass("slide-in-nav-item-delay-3-reverse").addClass("slide-in-nav-item-delay-3");
      nav_item_5.removeClass("slide-in-nav-item-delay-4-reverse").addClass("slide-in-nav-item-delay-4");
    } else {
      top_bar.removeClass("animate-top-bar").addClass("animate-out-top-bar");
      middle_bar.removeClass("animate-middle-bar").addClass("animate-out-middle-bar");
      bottom_bar.removeClass("animate-bottom-bar").addClass("animate-out-bottom-bar");
      overlay_navigation.removeClass("overlay-slide-down").addClass("overlay-slide-up");
      nav_item_1.removeClass("slide-in-nav-item").addClass("slide-in-nav-item-reverse");
      nav_item_2.removeClass("slide-in-nav-item-delay-1").addClass("slide-in-nav-item-delay-1-reverse");
      nav_item_3.removeClass("slide-in-nav-item-delay-2").addClass("slide-in-nav-item-delay-2-reverse");
      nav_item_4.removeClass("slide-in-nav-item-delay-3").addClass("slide-in-nav-item-delay-3-reverse");
      nav_item_5.removeClass("slide-in-nav-item-delay-4").addClass("slide-in-nav-item-delay-4-reverse");
    }

    $("body").toggleClass("overlay-open", overlay_navigation.hasClass("overlay-active"));
    $(".open-overlay")
      .attr("aria-expanded", overlay_navigation.hasClass("overlay-active"))
      .attr("aria-label", overlay_navigation.hasClass("overlay-active") ? "Close navigation menu" : "Open navigation menu");
    overlay_navigation.attr("aria-hidden", !overlay_navigation.hasClass("overlay-active"));
  });

  $(".open-overlay").keydown(function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      $(this).trigger("click");
    }
  });

  $(".overlay-navigation nav a").click(function () {
    if ($(".overlay-navigation").hasClass("overlay-active")) {
      $(".open-overlay").trigger("click");
    }
  });
}

const savedTheme = localStorage.getItem("theme") || "light";
setTheme(savedTheme);

if (footerYear) {
  footerYear.textContent = String(new Date().getFullYear());
}

themeToggle?.addEventListener("click", () => {
  setTheme(root.dataset.theme === "dark" ? "light" : "dark");
});

menuToggle?.addEventListener("click", toggleMobileMenu);

navLinks.forEach((link) => {
  link.addEventListener("click", closeMobileMenu);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMobileMenu();
});

window.addEventListener(
  "resize",
  () => {
    if (window.innerWidth >= 768) closeMobileMenu();
  },
  { passive: true }
);

window.addEventListener(
  "scroll",
  () => {
    updateScrollTopButton();
    if (!("IntersectionObserver" in window)) updateActiveNavLink();
  },
  { passive: true }
);

scrollTopButton?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
});

contactForm?.addEventListener("submit", handleContactSubmit);

setupRevealObserver();
setupNavObserver();
setupScene();
setupOverlayNavigation();
updateScrollTopButton();
updateActiveNavLink();
