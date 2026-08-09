(() => {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const year = document.getElementById("year");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  const mobileCta = document.getElementById("mobile-cta");
  const contactSection = document.getElementById("contact");

  const onScroll = () => {
    if (header) {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    }

    if (mobileCta) {
      const showAfterHero = window.scrollY > 280;
      mobileCta.classList.toggle("is-visible", showAfterHero);

      if (contactSection) {
        const contactTop = contactSection.getBoundingClientRect().top;
        const nearContact = contactTop < window.innerHeight * 0.7;
        mobileCta.classList.toggle("is-hidden-near-contact", nearContact);
      }
    }
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (toggle && header) {
    toggle.addEventListener("click", () => {
      const open = header.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    header.querySelectorAll(".nav a").forEach((link) => {
      link.addEventListener("click", () => {
        header.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -40px 0px" }
    );
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  /* Channel tabs */
  const tabsList = document.querySelector(".channel-tabs");
  const tabs = Array.from(document.querySelectorAll(".channel-tab"));
  const panels = Array.from(document.querySelectorAll(".channel-panel"));

  /** Держит активную вкладку в видимой части ленты, не двигая саму страницу. */
  const centerTab = (tab) => {
    if (!tabsList || tabsList.scrollWidth <= tabsList.clientWidth) return;
    const left = tab.offsetLeft - (tabsList.clientWidth - tab.offsetWidth) / 2;
    tabsList.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  };

  const activateTab = (tab) => {
    const id = tab.getAttribute("data-tab");
    tabs.forEach((t) => {
      t.classList.toggle("is-active", t === tab);
      t.setAttribute("aria-selected", t === tab ? "true" : "false");
    });
    panels.forEach((panel) => {
      const active = panel.getAttribute("data-panel") === id;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
    centerTab(tab);
  };

  /* Автопрокрутка вкладок на узких экранах: пять этапов показываются сами,
     листать страницу вверх-вниз не нужно. Первое касание её выключает. */
  if (tabsList && tabs.length) {
    const DWELL = 5200;
    const narrow = window.matchMedia("(max-width: 900px)");
    const calmMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer = null;
    let inView = false;
    let userTook = false;

    const stopAuto = () => {
      if (timer) clearInterval(timer);
      timer = null;
      tabsList.classList.remove("is-auto");
    };

    const startAuto = () => {
      if (timer || userTook || !inView || !narrow.matches || calmMotion.matches) return;
      tabsList.classList.add("is-auto");
      timer = setInterval(() => {
        const current = tabs.findIndex((t) => t.classList.contains("is-active"));
        activateTab(tabs[(current + 1) % tabs.length]);
      }, DWELL);
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        userTook = true;
        stopAuto();
        activateTab(tab);
      });
    });

    tabsList.addEventListener("touchstart", () => {
      userTook = true;
      stopAuto();
    }, { passive: true });

    if ("IntersectionObserver" in window) {
      const tabsObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            inView = entry.isIntersecting;
            if (inView) startAuto();
            else stopAuto();
          });
        },
        { threshold: 0.3 }
      );
      tabsObserver.observe(tabsList);
    }

    narrow.addEventListener("change", () => {
      stopAuto();
      startAuto();
    });
  } else {
    tabs.forEach((tab) => tab.addEventListener("click", () => activateTab(tab)));
  }

  /* Benefits split-in + flip cards */
  const benefitsSection = document.getElementById("benefits");
  if (benefitsSection) {
    if ("IntersectionObserver" in window) {
      const splitObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              benefitsSection.classList.add("is-split");
              splitObserver.disconnect();
            }
          });
        },
        { threshold: 0.28 }
      );
      splitObserver.observe(benefitsSection);
    } else {
      benefitsSection.classList.add("is-split");
    }
  }

  document.querySelectorAll(".flip-card").forEach((card) => {
    card.addEventListener("click", () => {
      const fineHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      if (fineHover) return;
      card.classList.toggle("is-flipped");
    });
  });

  /* Точки под каруселями преимуществ и отзывов (видны только на узких экранах) */
  const buildDots = (gridId, dotsId, itemSelector, label) => {
    const grid = document.getElementById(gridId);
    const dotsBox = document.getElementById(dotsId);
    if (!grid || !dotsBox) return;

    const cards = Array.from(grid.querySelectorAll(itemSelector));
    const dots = cards.map((card, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "flip-dot" + (index === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", `${label} ${index + 1}`);
      dot.addEventListener("click", () => {
        const shift = card.getBoundingClientRect().left - grid.getBoundingClientRect().left;
        grid.scrollTo({ left: grid.scrollLeft + shift - 16, behavior: "smooth" });
      });
      dotsBox.appendChild(dot);
      return dot;
    });

    const syncDots = () => {
      const box = grid.getBoundingClientRect();
      const middle = box.left + box.width / 2;
      let nearest = 0;
      let best = Infinity;
      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const distance = Math.abs(rect.left + rect.width / 2 - middle);
        if (distance < best) {
          best = distance;
          nearest = index;
        }
      });
      dots.forEach((dot, index) => dot.classList.toggle("is-active", index === nearest));
    };

    grid.addEventListener("scroll", syncDots, { passive: true });
  };

  buildDots("benefits-grid", "benefits-dots", ".flip-card", "Преимущество");
  buildDots("review-grid", "review-dots", ".review-card", "Отзыв");

  /* Rolling odometers — real site stats only */
  function buildOdometer(el) {
    const target = Number(el.getAttribute("data-value") || "0");
    const suffix = el.getAttribute("data-suffix") || "";
    const formatted = target.toLocaleString("ru-RU").replace(/\u00A0/g, " ");
    const digits = "0123456789";

    el.textContent = "";
    const reels = [];

    formatted.split("").forEach((ch) => {
      if (ch === " ") {
        const space = document.createElement("span");
        space.className = "odo-digit is-space";
        space.textContent = " ";
        el.appendChild(space);
        return;
      }

      const digit = document.createElement("span");
      digit.className = "odo-digit";
      const reel = document.createElement("span");
      reel.className = "odo-reel";
      for (let i = 0; i < 10; i += 1) {
        const s = document.createElement("span");
        s.textContent = digits[i];
        reel.appendChild(s);
      }
      digit.appendChild(reel);
      el.appendChild(digit);
      reels.push({ reel, value: Number(ch) });
    });

    if (suffix) {
      const suf = document.createElement("span");
      suf.className = "odo-suffix";
      suf.textContent = suffix;
      el.appendChild(suf);
    }

    return reels;
  }

  function runReels(reels) {
    reels.forEach((item, index) => {
      setTimeout(() => {
        item.reel.style.transform = `translateY(-${item.value * 1.15}em)`;
      }, index * 60);
    });
  }

  const odometers = Array.from(document.querySelectorAll(".odometer"));
  if (odometers.length) {
    const allReels = odometers.map((el) => buildOdometer(el));
    const section = document.getElementById("stats") || odometers[0];

    const startAll = () => {
      allReels.forEach((reels, i) => {
        setTimeout(() => runReels(reels), i * 120);
      });
    };

    if ("IntersectionObserver" in window) {
      const odoObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              startAll();
              odoObserver.disconnect();
            }
          });
        },
        { threshold: 0.35 }
      );
      odoObserver.observe(section);
    } else {
      startAll();
    }
  }

  /* Калькулятор окупаемости партии */
  const calc = document.getElementById("calc");
  if (calc) {
    const inputs = {
      contacts: document.getElementById("calc-contacts"),
      price: document.getElementById("calc-price"),
      fee: document.getElementById("calc-fee"),
      months: document.getElementById("calc-months"),
    };
    const out = {
      cost: document.getElementById("calc-cost"),
      student: document.getElementById("calc-student"),
      be: document.getElementById("calc-be"),
      beLabel: document.getElementById("calc-be-label"),
      cta: document.getElementById("calc-cta"),
    };

    const rub = (value) =>
      `${Math.round(value).toLocaleString("ru-RU")} <span class="rub">₽</span>`;

    const read = (el, fallback) => {
      const value = Number(el && el.value);
      return Number.isFinite(value) && value > 0 ? value : fallback;
    };

    /** «1 ученик», «2 ученика», «5 учеников» — счётная форма для подписи. */
    const studentsWord = (n) => {
      const tail = n % 100;
      if (tail >= 11 && tail <= 14) return "учеников окупают";
      switch (n % 10) {
        case 1:
          return "ученик окупает";
        case 2:
        case 3:
        case 4:
          return "ученика окупают";
        default:
          return "учеников окупают";
      }
    };

    /** «1 контакт», «2 контакта», «50 контактов» — для кнопки под расчётом. */
    const contactsWord = (n) => {
      const tail = n % 100;
      if (tail >= 11 && tail <= 14) return "контактов";
      switch (n % 10) {
        case 1:
          return "контакт";
        case 2:
        case 3:
        case 4:
          return "контакта";
        default:
          return "контактов";
      }
    };

    const recalc = () => {
      const contacts = read(inputs.contacts, 50);
      const price = read(inputs.price, 600);
      const fee = read(inputs.fee, 5000);
      const months = read(inputs.months, 6);

      const batchCost = contacts * price;
      const studentValue = fee * months;
      const breakEven = Math.ceil(batchCost / studentValue);

      // innerHTML — из-за <span class="rub"> вокруг знака рубля. Внутрь
      // подставляются только числа, посторонней разметке взяться неоткуда.
      if (out.cost) out.cost.innerHTML = rub(batchCost);
      if (out.student) out.student.innerHTML = rub(studentValue);
      if (out.be) out.be.textContent = String(breakEven);
      if (out.beLabel) out.beLabel.textContent = `${studentsWord(breakEven)} партию`;
      if (out.cta) {
        out.cta.textContent = `Обсудить партию на ${contacts} ${contactsWord(contacts)}`;
      }
    };

    Object.values(inputs).forEach((el) => {
      if (el) el.addEventListener("input", recalc);
    });
    recalc();
  }

  /* Form */
  const form = document.getElementById("lead-form");
  const status = document.getElementById("form-status");
  if (form && status) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      status.hidden = false;
      status.className = "form-status";
      status.textContent = "Отправляем…";

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const response = await fetch(form.getAttribute("action") || "", {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
        });

        if (response.ok) {
          form.reset();
          status.classList.add("is-ok");
          status.textContent = "Спасибо! Заявка отправлена — скоро свяжусь.";
        } else {
          status.classList.add("is-error");
          status.textContent = "Не удалось отправить. Напишите в Telegram или WhatsApp.";
        }
      } catch (error) {
        status.classList.add("is-error");
        status.textContent = "Ошибка сети. Попробуйте ещё раз или напишите в мессенджер.";
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
})();
