(function () {
  const SITE_ORIGIN = "https://herti.qqwsh.top";
  const LOCALE_OG_IMAGE = {
    "zh-Hans": "herti-en.png",
    en: "herti-en.png",
    ja: "herti-ja.png",
    ko: "herti-ko.png",
    ru: "herti-en.png",
    fr: "herti-en.png",
    es: "herti-en.png",
  };

  const OG_LOCALE = {
    "zh-Hans": "zh_CN",
    en: "en_US",
    ja: "ja_JP",
    ko: "ko_KR",
    ru: "ru_RU",
    fr: "fr_FR",
    es: "es_ES",
  };

  const HREFLANG_MAP = {
    "zh-Hans": "zh-Hans",
    en: "en",
    ja: "ja",
    ko: "ko",
    ru: "ru",
    fr: "fr",
    es: "es",
  };

  function setMetaByName(name, content) {
    if (content == null || content === "") return;
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }

  function setMetaByProperty(prop, content) {
    if (content == null || content === "") return;
    let el = document.querySelector(`meta[property="${prop}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("property", prop);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }

  function setCanonical(href) {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", href);
  }

  function refreshHreflang(origin, pathname) {
    document.querySelectorAll("link[data-herti-hreflang]").forEach((n) => n.remove());
    const basePath = pathname || "/";
    const codes = window.HERTI_I18N.SUPPORTED;
    codes.forEach((locale) => {
      const link = document.createElement("link");
      link.setAttribute("rel", "alternate");
      link.setAttribute("hreflang", HREFLANG_MAP[locale] || locale);
      link.href = `${origin}${basePath}?lang=${encodeURIComponent(locale)}`;
      link.setAttribute("data-herti-hreflang", "1");
      document.head.appendChild(link);
    });
    const xd = document.createElement("link");
    xd.setAttribute("rel", "alternate");
    xd.setAttribute("hreflang", "x-default");
    xd.href = `${origin}${basePath}`;
    xd.setAttribute("data-herti-hreflang", "1");
    document.head.appendChild(xd);
  }

  function buildJsonLd(t, description, origin, pathname) {
    const title = t("ui.title", "HERTI");
    const pageUrl = `${origin}${pathname || "/"}`;
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebApplication",
          name: "HERTI",
          alternateName: ["她的人格地图", "Her Personality Map"],
          description,
          url: pageUrl,
          applicationCategory: "LifestyleApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript. No account; answers stay in your browser.",
          inLanguage: ["zh-CN", "en", "ja", "ko", "ru", "fr", "es"],
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          author: {
            "@type": "Person",
            name: "嬴知微",
            url: "https://x.com/ying_zhiwei",
            sameAs: ["https://qqwsh.top", "https://tihub.qqwsh.top"],
          },
        },
        {
          "@type": "WebSite",
          "@id": `${pageUrl}#website`,
          name: title,
          description,
          url: pageUrl,
          inLanguage: OG_LOCALE[window.HERTI_I18N.getCurrentLocale()] || "zh_CN",
          publisher: {
            "@type": "Organization",
            name: "qqwsh",
            url: "https://qqwsh.top",
          },
        },
      ],
    };
  }

  function applyJsonLd(t, description, origin, pathname) {
    const data = buildJsonLd(t, description, origin, pathname);
    let script = document.getElementById("herti-jsonld");
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = "herti-jsonld";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }

  function apply() {
    const t = window.HERTI_I18N.t.bind(window.HERTI_I18N);
    const locale = window.HERTI_I18N.getCurrentLocale();
    const title = t("ui.title", "HERTI");
    const description = t("ui.seo.description", t("ui.cover.meta", ""));
    const keywords = t("ui.seo.keywords", "");

    document.title = title;

    setMetaByName("description", description);
    setMetaByName("keywords", keywords);

    const origin = SITE_ORIGIN;
    const pathname = window.location.pathname || "/";
    const search = window.location.search || "";
    const canonical =
      search.indexOf("lang=") >= 0
        ? `${origin}${pathname}${search}`
        : `${origin}${pathname}?lang=${encodeURIComponent(locale)}`;

    setCanonical(canonical);

    setMetaByProperty("og:title", title);
    setMetaByProperty("og:description", description);
    setMetaByProperty("og:type", "website");
    setMetaByProperty("og:url", canonical);
    setMetaByProperty("og:site_name", "HERTI");
    setMetaByProperty("og:locale", OG_LOCALE[locale] || "zh_CN");

    const others = Object.keys(OG_LOCALE).filter((k) => k !== locale);
    document.querySelectorAll('meta[property^="og:locale:alternate"]').forEach((n) => n.remove());
    others.forEach((loc) => {
      const el = document.createElement("meta");
      el.setAttribute("property", "og:locale:alternate");
      el.setAttribute("content", OG_LOCALE[loc]);
      document.head.appendChild(el);
    });

    const imgFile = LOCALE_OG_IMAGE[locale] || "herti-en.png";
    setMetaByProperty("og:image", `${origin}/${imgFile.replace(/^\//, "")}`);
    setMetaByProperty("og:image:alt", `${title} — HERTI`);

    setMetaByName("twitter:card", "summary_large_image");
    setMetaByName("twitter:title", title);
    setMetaByName("twitter:description", description);
    setMetaByName("twitter:image", `${origin}/${imgFile.replace(/^\//, "")}`);

    refreshHreflang(origin, pathname);
    applyJsonLd(t, description, origin, pathname);
  }

  window.HERTI_SEO = { apply };
})();
