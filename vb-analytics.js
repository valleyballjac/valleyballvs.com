/* =========================================================================
   VALLEYBALL UNIFIED ANALYTICS HELPER (GA4 Stream G-5J14GD29XW)
   Zero dependencies, privacy-safe (zero PII), feature-detected.
   ========================================================================= */
(function () {
  'use strict';

  function vbTrack(eventName, params) {
    if (window.__vbAnalyticsDisabled || typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, params || {});
  }
  window.vbTrack = vbTrack;

  function inferLocation(el) {
    var explicit = el.getAttribute('data-cta-loc');
    if (explicit) return explicit;
    if (el.closest('.nav-bar, header.nav-bar')) return 'nav_bar';
    if (el.closest('.hero, header.hero')) return 'hero';
    if (el.closest('#playtests')) return 'playtests';
    if (el.closest('#championship')) return 'championship';
    if (el.closest('#roster')) return 'roster';
    if (el.closest('#roadmap')) return 'org_roadmap';
    if (el.closest('.links')) return 'links_hub';
    if (el.closest('footer')) return 'footer';
    if (location.pathname.indexOf('how-to-play') !== -1) return 'how_to_play';
    if (location.pathname.indexOf('athletes') !== -1) return 'athletes_page';
    return 'page_body';
  }

  function detectSocialTarget(href) {
    var h = (href || '').toLowerCase();
    if (h.indexOf('twitch.tv') !== -1) return 'twitch';
    if (h.indexOf('youtube.com') !== -1 || h.indexOf('youtu.be') !== -1) return 'youtube';
    if (h.indexOf('tiktok.com') !== -1) return 'tiktok';
    if (h.indexOf('reddit.com') !== -1) return 'reddit';
    if (h.indexOf('discord.gg') !== -1 || h.indexOf('discord.com') !== -1) return 'discord';
    if (h.indexOf('instagram.com') !== -1) return 'instagram';
    return null;
  }

  function preserveUtmsAcrossOwnedDomains() {
    var currentParams;
    try {
      currentParams = new URLSearchParams(location.search);
    } catch (_) {
      return;
    }
    var utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    var incoming = [];
    utmKeys.forEach(function (k) {
      var v = currentParams.get(k);
      if (v) incoming.push([k, v]);
    });
    if (!incoming.length) return;

    document.querySelectorAll('a[href]').forEach(function (a) {
      var raw = a.getAttribute('href');
      if (!raw || raw.charAt(0) === '#' || raw.indexOf('mailto:') === 0) return;
      var url;
      try {
        url = new URL(a.href, location.href);
      } catch (_) {
        return;
      }
      var host = url.hostname.toLowerCase();
      if (host !== 'valleyballvs.com' && host !== 'www.valleyballvs.com' &&
          host !== 'valleyball.org' && host !== 'www.valleyball.org') {
        return;
      }
      if (url.searchParams.has('utm_source')) return;
      incoming.forEach(function (pair) {
        url.searchParams.set(pair[0], pair[1]);
      });
      a.href = url.toString();
    });
  }

  function initClickTracking() {
    document.querySelectorAll('a[href]').forEach(function (link) {
      if (link.hasAttribute('data-link')) return; // Handled by links_click on valleyball.org/links

      var href = link.href || '';
      var isItch = href.toLowerCase().indexOf('itch.io') !== -1;
      var explicitCta = link.getAttribute('data-cta');
      var socialTarget = detectSocialTarget(href);

      if (isItch) {
        link.addEventListener('click', function () {
          vbTrack('play_game_click', {
            cta_location: inferLocation(link),
            link_url: link.href,
            transport_type: 'beacon'
          });
        });
        return;
      }

      if (explicitCta || socialTarget) {
        link.addEventListener('click', function () {
          vbTrack('cta_click', {
            cta_location: inferLocation(link),
            cta_target: explicitCta || socialTarget,
            link_url: link.href,
            transport_type: 'beacon'
          });
        });
      }
    });
  }

  function initScrollDepth() {
    var milestones = [25, 50, 75, 90];
    var fired = {};
    var ticking = false;

    function measure() {
      ticking = false;
      var doc = document.documentElement;
      var maxScroll = Math.max(doc.scrollHeight - window.innerHeight, 0);
      if (maxScroll <= 0) return;
      var pct = Math.min(100, Math.round((window.scrollY / maxScroll) * 100));
      for (var i = 0; i < milestones.length; i++) {
        var m = milestones[i];
        if (pct >= m && !fired[m]) {
          fired[m] = true;
          vbTrack('scroll_depth', { scroll_percent: m });
        }
      }
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(measure);
      }
    }, { passive: true });
  }

  function initSectionVisibility() {
    if (!('IntersectionObserver' in window)) return;
    var defaultIds = [
      'championship', 'playtests', 'rsvp', 'the-game', 'roster',
      'dispatch', 'customization', 'gameplay', 'broadcast-console',
      'principles', 'arena', 'equipment', 'athletes', 'roadmap',
      'gamepad', 'keyboard', 'matrix', 'team-play', 'combat', 'balls', 'strategy'
    ];
    var targets = [];
    var seenEl = [];

    document.querySelectorAll('[data-track-section]').forEach(function (el) {
      targets.push({ el: el, id: el.getAttribute('data-track-section') });
      seenEl.push(el);
    });

    defaultIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && seenEl.indexOf(el) === -1) {
        targets.push({ el: el, id: id });
        seenEl.push(el);
      }
    });

    if (!targets.length) return;

    var fired = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.getAttribute('data-track-section') || entry.target.id;
        if (!id || fired[id]) return;
        fired[id] = true;
        vbTrack('section_view', { section_id: id });
        io.unobserve(entry.target);
      });
    }, { threshold: 0.25 });

    targets.forEach(function (item) {
      io.observe(item.el);
    });
  }

  function boot() {
    preserveUtmsAcrossOwnedDomains();
    initClickTracking();
    initScrollDepth();
    initSectionVisibility();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
