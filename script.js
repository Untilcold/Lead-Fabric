(() => {
  const header = document.querySelector(".top");
  const toggle = document.querySelector(".nav-toggle");
  const year = document.getElementById("year");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  /* ------------------------------------------------------------------
     Шапка и плавающая кнопка Telegram на телефоне.
     Близость блока контактов считает наблюдатель, а не замер на каждом кадре:
     getBoundingClientRect во время прокрутки заставляет браузер пересчитывать
     вёрстку. Классы трогаем только когда состояние реально поменялось.
     ------------------------------------------------------------------ */
  const mobileCta = document.getElementById("mobile-cta");
  const contactSection = document.getElementById("contact");
  let nearContact = false;
  let wasScrolled = null;
  let wasVisible = null;
  let wasNear = null;

  const onScroll = () => {
    const scrolled = window.scrollY > 8;
    if (header && scrolled !== wasScrolled) {
      header.classList.toggle("is-scrolled", scrolled);
      wasScrolled = scrolled;
    }
    if (!mobileCta) return;
    const showAfterHero = window.scrollY > 280;
    if (showAfterHero !== wasVisible) {
      mobileCta.classList.toggle("is-visible", showAfterHero);
      wasVisible = showAfterHero;
    }
    if (nearContact !== wasNear) {
      mobileCta.classList.toggle("is-hidden-near-contact", nearContact);
      wasNear = nearContact;
    }
  };

  if (contactSection && mobileCta && "IntersectionObserver" in window) {
    const contactObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          nearContact = entry.isIntersecting;
        });
        onScroll();
      },
      { rootMargin: "0px 0px -30% 0px" }
    );
    contactObserver.observe(contactSection);
  }

  // Не чаще одного раза на кадр — во встроенном браузере Telegram
  // обработчик на каждое событие прокрутки заметно тормозил скролл.
  let scrollQueued = false;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollQueued) return;
      scrollQueued = true;
      requestAnimationFrame(() => {
        scrollQueued = false;
        onScroll();
      });
    },
    { passive: true }
  );
  onScroll();

  if (toggle && header) {
    toggle.addEventListener("click", () => {
      const open = header.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    });
    header.querySelectorAll(".nav a").forEach((link) => {
      link.addEventListener("click", () => {
        header.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Открыть меню");
      });
    });
  }

  const calmMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ------------------------------------------------------------------
     Появление блоков при прокрутке: класс is-in ставится один раз,
     когда блок доходит до экрана.
     ------------------------------------------------------------------ */
  const revealItems = document.querySelectorAll(".rv");
  if ("IntersectionObserver" in window) {
    const revealer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          revealer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealItems.forEach((item) => revealer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-in"));
  }

  /* ------------------------------------------------------------------
     «Как работает»: остановки маршрута — вкладки. Утка идёт к выбранной
     остановке, назад — разворачивается. Пока блок на экране и его не трогали,
     маршрут идёт сам: следующая остановка — когда дорисуется полоска отсчёта
     под текущей. Нажатие, касание или клавиши выключают это насовсем.
     ------------------------------------------------------------------ */
  const way = document.getElementById("way");
  if (way) {
    const stops = Array.from(way.querySelectorAll(".way-stop"));
    const panels = Array.from(way.querySelectorAll(".way-panel"));
    let current = stops.findIndex((stop) => stop.classList.contains("is-active"));
    let walkTimer = null;
    if (current < 0) current = 0;

    const show = (index, focus) => {
      if (index === current) return;
      way.classList.toggle("is-back", index < current);
      way.classList.add("is-walking");
      window.clearTimeout(walkTimer);
      walkTimer = window.setTimeout(() => way.classList.remove("is-walking", "is-back"), 820);
      current = index;
      way.style.setProperty("--i", String(index));
      stops.forEach((stop, i) => {
        const active = i === index;
        stop.classList.toggle("is-active", active);
        stop.classList.toggle("is-done", i < index);
        stop.setAttribute("aria-selected", active ? "true" : "false");
        stop.tabIndex = active ? 0 : -1;
      });
      panels.forEach((panel, i) => panel.classList.toggle("is-active", i === index));
      if (focus) stops[index].focus();
    };

    const stopAuto = () => way.classList.remove("is-auto");

    // На телефоне карточка открытой остановки должна быть видна целиком: если она
    // уходит под нижнюю кнопку Telegram, страница чуть подъезжает, ровно на нехватку.
    // Остановки при этом не должны уехать под шапку.
    const panelsBox = way.querySelector(".way-panels");
    const lineBox = way.querySelector(".way-line");
    const keepPanelInView = () => {
      if (!panelsBox || !lineBox || window.innerWidth >= 900) return;
      const bottom = panelsBox.getBoundingClientRect().bottom;
      const limit = window.innerHeight - 96;
      const headerH = header ? header.getBoundingClientRect().height : 72;
      const room = lineBox.getBoundingClientRect().top - headerH - 4;
      const by = Math.min(bottom - limit, room);
      if (by > 0) window.scrollBy({ top: by, behavior: calmMotion.matches ? "auto" : "smooth" });
    };

    stops.forEach((stop, i) => {
      stop.addEventListener("click", () => {
        stopAuto();
        show(i, false);
        keepPanelInView();
      });
    });

    // Стрелки, Home и End — как в любых вкладках
    way.querySelector(".way-line").addEventListener("keydown", (event) => {
      const last = stops.length - 1;
      let next = null;
      if (event.key === "ArrowRight") next = current === last ? 0 : current + 1;
      else if (event.key === "ArrowLeft") next = current === 0 ? last : current - 1;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = last;
      if (next === null) return;
      event.preventDefault();
      stopAuto();
      show(next, true);
    });

    way.querySelector(".way-line").addEventListener("touchstart", stopAuto, { passive: true });

    // Полоска отсчёта дорисовалась — идём к следующей остановке
    way.addEventListener("animationend", (event) => {
      if (!event.target.classList.contains("way-bar")) return;
      if (!way.classList.contains("is-auto")) return;
      show((current + 1) % stops.length, false);
    });

    if (!calmMotion.matches && "IntersectionObserver" in window) {
      way.classList.add("is-auto", "is-paused");
      const wayWatcher = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => way.classList.toggle("is-paused", !entry.isIntersecting));
        },
        { threshold: 0.35 }
      );
      wayWatcher.observe(way);
    }
  }

  /* ------------------------------------------------------------------
     Карточки «Почему удобно»: поднимаются по очереди, когда блок доходит
     до экрана. С мышью поворачиваются при наведении (это делает CSS),
     на тач-экране — по нажатию.
     ------------------------------------------------------------------ */
  const flips = document.getElementById("flips");
  if (flips) {
    const settle = () => window.setTimeout(() => flips.classList.add("is-settled"), 1200);
    if ("IntersectionObserver" in window) {
      const flipsWatcher = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            flips.classList.add("is-in");
            settle();
            flipsWatcher.disconnect();
          });
        },
        { threshold: 0.2 }
      );
      flipsWatcher.observe(flips);
    } else {
      flips.classList.add("is-in", "is-settled");
    }

    // Смотрим, чем нажали: у ноутбуков с сенсорным экраном есть и мышь,
    // и палец, одного медиазапроса для них мало.
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    flips.querySelectorAll(".flip").forEach((card) => {
      let pointer = "";
      card.addEventListener("pointerdown", (event) => { pointer = event.pointerType; });
      card.addEventListener("click", () => {
        const byMouse = pointer ? pointer === "mouse" : finePointer.matches;
        pointer = "";
        if (byMouse) return;
        const flipped = card.classList.toggle("is-flipped");
        card.setAttribute("aria-pressed", flipped ? "true" : "false");
      });
    });
  }

  /* ==================================================================
     ПРИЁМЫ (04.10.2026): живой фон из точек, набегающие цифры, бегущие
     ленты, фраза с заливкой, плавающая панель. При «меньше движения»
     в настройках телефона всё стоит на месте.
     ================================================================== */

  // 1. Живой фон из точек: сетка точек медленно «дышит» волной,
  //    возле мыши точки крупнеют и светлеют. Холст рисуется, только пока виден.
  document.querySelectorAll(".fx-dots").forEach((cv) => {
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const STEP = 26;
    let w = 0, h = 0, dpr = 1, visible = true, raf = 0;
    let mx = -9999, my = -9999;
    const host = cv.parentElement;
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = host.clientWidth; h = host.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = (time) => {
      ctx.clearRect(0, 0, w, h);
      const t = time / 1000;
      for (let y = STEP / 2; y < h; y += STEP) {
        for (let x = STEP / 2; x < w; x += STEP) {
          const wave = 0.5 + 0.5 * Math.sin(x * 0.012 + y * 0.018 - t * 0.9);
          const d = Math.hypot(x - mx, y - my);
          const near = d < 160 ? 1 - d / 160 : 0;
          const r = 1 + wave * 0.6 + near * 2.2;
          ctx.fillStyle = `rgba(255,255,255,${(0.08 + wave * 0.1 + near * 0.55).toFixed(3)})`;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
    };
    const loop = (time) => { draw(time); raf = visible ? requestAnimationFrame(loop) : 0; };
    size();
    window.addEventListener("resize", () => { size(); if (calmMotion.matches) draw(0); });
    host.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top;
    });
    host.addEventListener("pointerleave", () => { mx = my = -9999; });
    if (calmMotion.matches) { draw(0); return; }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(loop);
      }).observe(host);
    }
    raf = requestAnimationFrame(loop);
  });

  // 2. Набегающие цифры: 0 → число, когда блок появился на экране. Хвост («+», « лет») остаётся.
  const counters = document.querySelectorAll("[data-count]");
  const runCount = (el) => {
    const target = Number(el.dataset.count);
    const tail = el.textContent.replace(/^[\d\s  ]*\d/, "");   // «+», « лет» — с пробелом
    const fmt = (n) => Math.round(n).toLocaleString("ru-RU");
    if (calmMotion.matches || !target) { el.textContent = fmt(target) + tail; return; }
    const t0 = performance.now(), dur = 1400;
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(target * (1 - Math.pow(1 - k, 3))) + tail;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ("IntersectionObserver" in window) {
    const countWatch = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { runCount(en.target); countWatch.unobserve(en.target); } });
    }, { threshold: 0.6 });
    counters.forEach((el) => countWatch.observe(el));
  }

  // 3. Бегущие ленты: содержимое повторяется дважды — лента бесшовная.
  document.querySelectorAll(".fx-row").forEach((row) => {
    const track = row.querySelector(".fx-track");
    if (!track) return;
    const copy = track.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    row.appendChild(copy);
  });

  // 4. Фраза с заливкой: каждое слово — в отдельной обёртке, светлеет по мере прокрутки.
  document.querySelectorAll(".fx-fill").forEach((box) => {
    const words = [];
    const split = (node) => {
      [...node.childNodes].forEach((ch) => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const s = document.createElement("span");
            s.className = "w"; s.textContent = part;
            frag.appendChild(s); words.push(s);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1) split(ch);
      });
    };
    split(box);
    if (calmMotion.matches) return;
    let queued = false;
    const paint = () => {
      queued = false;
      const r = box.getBoundingClientRect();
      // 0 — когда фраза входит снизу, 1 — когда она поднялась до середины экрана
      const p = Math.min(1, Math.max(0, (window.innerHeight * 0.9 - r.top) / (window.innerHeight * 0.5)));
      const lit = p * words.length;
      words.forEach((wd, i) => wd.style.setProperty("--p", String(Math.min(1, Math.max(0, lit - i)))));
    };
    window.addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(paint); } }, { passive: true });
    paint();
  });

  // 5. Плавающая панель на компьютере: после первого экрана, без контактов на экране, пока не закрыли.
  const bar = document.getElementById("fx-bar");
  if (bar && window.matchMedia("(min-width: 900px)").matches) {
    let closed = false;
    try { closed = sessionStorage.getItem("fx-bar-closed") === "1"; } catch (e) { /* без хранилища — просто показываем */ }
    if (!closed) {
      bar.hidden = false;
      let nearEnd = false;
      const contact = document.getElementById("contact");
      const upd = () => bar.classList.toggle("is-on", window.scrollY > window.innerHeight * 0.9 && !nearEnd);
      if (contact && "IntersectionObserver" in window) {
        new IntersectionObserver((en) => { nearEnd = en[0].isIntersecting; upd(); }).observe(contact);
      }
      window.addEventListener("scroll", upd, { passive: true });
      upd();
      bar.querySelector(".fx-bar-x").addEventListener("click", () => {
        bar.classList.remove("is-on");
        try { sessionStorage.setItem("fx-bar-closed", "1"); } catch (e) { /* ничего */ }
        window.setTimeout(() => { bar.hidden = true; }, 450);
      });
    }
  }

  /* ------------------------------------------------------------------
     Калькулятор окупаемости партии
     ------------------------------------------------------------------ */
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
      percent: document.getElementById("calc-percent"),
      cta: document.getElementById("calc-cta"),
    };

    const rub = (value) => `${Math.round(value).toLocaleString("ru-RU")} <span class="rub">₽</span>`;
    const read = (el, fallback) => {
      const value = Number(el && el.value);
      return Number.isFinite(value) && value > 0 ? value : fallback;
    };

    /** «1 ученик», «2 ученика», «5 учеников» — счётная форма для подписи. */
    const studentsWord = (n) => {
      const tail = n % 100;
      if (tail >= 11 && tail <= 14) return "учеников окупают";
      switch (n % 10) {
        case 1: return "ученик окупает";
        case 2: case 3: case 4: return "ученика окупают";
        default: return "учеников окупают";
      }
    };

    /** «1 контакт», «2 контакта», «50 контактов» — для кнопки под расчётом. */
    const contactsWord = (n) => {
      const tail = n % 100;
      if (tail >= 11 && tail <= 14) return "контактов";
      switch (n % 10) {
        case 1: return "контакт";
        case 2: case 3: case 4: return "контакта";
        default: return "контактов";
      }
    };

    const recalc = () => {
      const contacts = read(inputs.contacts, 50);
      const price = read(inputs.price, 700);
      const fee = read(inputs.fee, 6000);
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
      if (out.percent) {
        // «1 ученик» звучит как рекламный трюк, а «2% от партии» — как
        // выполнимая задача. Показываем одно и то же двумя способами.
        const share = (breakEven / contacts) * 100;
        const rounded = share < 10 ? Math.round(share * 10) / 10 : Math.round(share);
        out.percent.textContent = `${String(rounded).replace(".", ",")}%`;
      }
      if (out.cta) out.cta.textContent = `Обсудить партию на ${contacts} ${contactsWord(contacts)}`;
    };

    Object.values(inputs).forEach((el) => {
      if (el) el.addEventListener("input", recalc);
    });
    recalc();
  }

  /* ------------------------------------------------------------------
     Заявка: отправка в Formspree без перехода со страницы
     ------------------------------------------------------------------ */
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
          ymGoal("form_send");
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

  /* ------------------------------------------------------------------
     Панель «Как проходит работа» поверх блока цены.
     Отдельной секции нет — она открывается кнопкой и пунктом меню.
     ------------------------------------------------------------------ */
  const processPop = document.getElementById("process-pop");
  const processOpen = document.getElementById("process-open");
  if (processPop && processOpen) {
    const closeBtn = processPop.querySelector(".process-pop-close");
    let processOpened = false;

    const openPop = () => {
      if (!processPop.hidden) return;
      processPop.hidden = false;
      processOpen.setAttribute("aria-expanded", "true");
      if (closeBtn) closeBtn.focus({ preventScroll: true });
      if (!processOpened) {
        processOpened = true;
        ymGoal("process_open");
      }
    };
    const closePop = (returnFocus) => {
      if (processPop.hidden) return;
      processPop.hidden = true;
      processOpen.setAttribute("aria-expanded", "false");
      if (returnFocus) processOpen.focus({ preventScroll: true });
    };

    processOpen.addEventListener("click", openPop);
    if (closeBtn) closeBtn.addEventListener("click", () => closePop(true));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closePop(true);
    });
    // Клик мимо панели закрывает её — привычное поведение всплывающего окна
    document.addEventListener("click", (event) => {
      if (processPop.hidden) return;
      if (processPop.contains(event.target) || processOpen.contains(event.target)) return;
      if (event.target.closest && event.target.closest("[data-open-process]")) return;
      closePop(false);
    });
    // Пункт меню «Сотрудничество» ведёт к цене и сразу раскрывает панель
    document.querySelectorAll("[data-open-process]").forEach((link) => {
      link.addEventListener("click", () => window.setTimeout(openPop, 420));
    });
  }

  /* ------------------------------------------------------------------
     Цели Метрики. Счётчик сам по себе показывает только визиты — сколько
     человек написали в Telegram или отправили заявку, без целей не видно.
     Объявлено функцией, а не константой: вызов из формы стоит выше по файлу.
     ------------------------------------------------------------------ */
  function ymGoal(name) {
    if (typeof window.ym === "function") window.ym(111234585, "reachGoal", name);
  }

  // Клики по мессенджерам ловим делегированием: ссылок несколько и они
  // разбросаны по странице, включая плавающую кнопку и кнопку под расчётом.
  document.addEventListener("click", (event) => {
    const link = event.target.closest && event.target.closest("a[href]");
    if (!link) return;
    const href = link.getAttribute("href") || "";
    if (href.indexOf("t.me/") !== -1) ymGoal("tg_click");
    else if (href.indexOf("wa.me/") !== -1) ymGoal("wa_click");
  });

  // Калькулятор: сам факт подстановки своих цифр — сильный признак интереса
  let calcTouched = false;
  ["calc-contacts", "calc-price", "calc-fee", "calc-months"].forEach((id) => {
    const field = document.getElementById(id);
    if (!field) return;
    field.addEventListener("change", () => {
      if (calcTouched) return;
      calcTouched = true;
      ymGoal("calc_use");
    });
  });

  // Долистал до цены — граница между «посмотрел» и «выбирает»
  const priceSection = document.getElementById("price");
  if (priceSection && "IntersectionObserver" in window) {
    const priceWatcher = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          ymGoal("price_view");
          priceWatcher.disconnect();
        });
      },
      { threshold: 0.3 }
    );
    priceWatcher.observe(priceSection);
  }
})();
