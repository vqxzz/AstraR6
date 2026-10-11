/* ============================================
   AstraR6 — Interactive behavior
   ============================================ */

(function () {
    'use strict';

    /* ---------- Mobile nav toggle ---------- */
    const navToggle = document.getElementById('navToggle');
    const mainNav = document.querySelector('.main-nav');

    if (navToggle && mainNav) {
        navToggle.addEventListener('click', () => {
            const open = mainNav.classList.toggle('open');
            navToggle.classList.toggle('active', open);
            navToggle.setAttribute('aria-expanded', String(open));
        });

        // close nav when a link is clicked (mobile)
        mainNav.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                mainNav.classList.remove('open');
                navToggle.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    /* ---------- Direct download for Windows button ---------- */
    // Pulls AstraR6.exe straight from the local downloads/ folder.
    const DOWNLOAD_URL = 'downloads/AstraR6.exe';
    const DOWNLOAD_FILENAME = 'AstraR6.exe';

    function triggerDownload() {
        const a = document.createElement('a');
        a.href = DOWNLOAD_URL;
        a.download = DOWNLOAD_FILENAME;
        // helps some browsers treat it as a forced download rather than navigation
        a.rel = 'noopener';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        // cleanup
        setTimeout(() => a.remove(), 1000);
    }

    const winBtn = document.getElementById('downloadWindows');
    if (winBtn) {
        winBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const original = winBtn.innerHTML;
            winBtn.disabled = true;
            winBtn.textContent = 'Starting download...';

            triggerDownload();

            // restore button after a short delay
            setTimeout(() => {
                winBtn.innerHTML = original;
                winBtn.disabled = false;
            }, 1200);
        });
    }

    /* ---------- Hero window sidebar interaction ---------- */
    const sidebarItems = document.querySelectorAll('.win-sidebar li');
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });

    /* ---------- Subtle reveal-on-scroll ---------- */
    const revealEls = document.querySelectorAll('.feature-card, .media-card');
    if ('IntersectionObserver' in window && revealEls.length) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        revealEls.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s cubic-bezier(0.4,0,0.2,1), transform 0.6s cubic-bezier(0.4,0,0.2,1)';
            io.observe(el);
        });
    }

    /* ---------- Subtle glow follow on hero ---------- */
    const hero = document.querySelector('.hero');
    if (hero && window.matchMedia('(pointer:fine)').matches) {
        hero.addEventListener('mousemove', (e) => {
            const rect = hero.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            hero.style.setProperty('--mx', x + '%');
            hero.style.setProperty('--my', y + '%');
        });
    }

    /* ============================================
       BACKGROUND PARTICLE NETWORK
       Floating dots drifting endlessly left → right.
       When a dot exits the right edge, it re-enters
       from the left edge. Proximity-based connecting
       lines form and break as dots drift past each other.
       Colors stay white-on-black to match the theme.
       ============================================ */
    (function initParticleNetwork() {
        const canvas = document.getElementById('bg-network');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // ---- Tunable parameters ----
        const CONFIG = {
            particleCount: Math.min(110, Math.floor((window.innerWidth * window.innerHeight) / 14000)),
            minParticles: 30,
            driftSpeedMin: 0.12,    // px/frame, slowest rightward drift
            driftSpeedMax: 0.3,     // px/frame, fastest rightward drift
            verticalWobble: 0.02,   // per-frame vertical kick (Brownian)
            verticalDamping: 0.95, // vy decay per frame
            particleRadius: 1.7,
            linkDistance: 130,       // px threshold for drawing a line between two particles
            colorParticle: 'rgba(255, 255, 255, 0.9)',
            colorLineBase: 'rgba(255, 255, 255, ',  // opacity appended at draw time
            lineOpacityMax: 0.5,
            lineWidth: 0.6,
        };

        let width = 0, height = 0;
        let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        let particles = [];

        function resize() {
            width = window.innerWidth;
            height = window.innerHeight;
            dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function randomDriftSpeed() {
            return CONFIG.driftSpeedMin + Math.random() * (CONFIG.driftSpeedMax - CONFIG.driftSpeedMin);
        }

        function makeParticle() {
            return {
                x: Math.random() * width,
                y: Math.random() * height,
                vx: randomDriftSpeed(),    // constant rightward drift
                vy: (Math.random() - 0.5) * 0.5,
                r: CONFIG.particleRadius * (0.7 + Math.random() * 0.6),
            };
        }

        function seedParticles() {
            const count = Math.max(CONFIG.minParticles, CONFIG.particleCount);
            particles = [];
            for (let i = 0; i < count; i++) particles.push(makeParticle());
        }

        function step() {
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                // Tiny vertical wobble so dots don't drift in perfect horizontal lines
                p.vy += (Math.random() - 0.5) * CONFIG.verticalWobble;
                p.vy *= CONFIG.verticalDamping;

                // Move
                p.x += p.vx;
                p.y += p.vy;

                // Endless left→right loop:
                // when a dot leaves the right edge, respawn at the left with a fresh y
                if (p.x > width + 10) {
                    p.x = -10;
                    p.y = Math.random() * height;
                    p.vy = (Math.random() - 0.5) * 0.5;
                    p.vx = randomDriftSpeed();   // reroll speed for variety
                }
                // Defensive vertical wrap (rare with damping, but keeps dots on-screen)
                if (p.y > height + 10) p.y = -10;
                if (p.y < -10) p.y = height + 10;
            }
        }

        function draw() {
            ctx.clearRect(0, 0, width, height);

            // ---- Draw connecting lines between nearby particles ----
            const ld = CONFIG.linkDistance;
            const ld2 = ld * ld;
            for (let i = 0; i < particles.length; i++) {
                const a = particles[i];
                for (let j = i + 1; j < particles.length; j++) {
                    const b = particles[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < ld2) {
                        const dist = Math.sqrt(d2);
                        const alpha = (1 - dist / ld) * CONFIG.lineOpacityMax;
                        ctx.strokeStyle = CONFIG.colorLineBase + alpha.toFixed(3) + ')';
                        ctx.lineWidth = CONFIG.lineWidth;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }
            }

            // ---- Draw particles ----
            ctx.fillStyle = CONFIG.colorParticle;
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        let rafId = null;
        let lastFrameTs = performance.now();
        function loop() {
            // Wrap step+draw so an unexpected error in one frame
            // doesn't kill the entire animation loop.
            try {
                step();
                draw();
            } catch (err) {
                // Log once per failure burst so the console isn't spammed.
                if (!loop._errored) {
                    console.error('[bg-network] frame error:', err);
                    loop._errored = true;
                    setTimeout(() => { loop._errored = false; }, 2000);
                }
            }
            lastFrameTs = performance.now();
            rafId = requestAnimationFrame(loop);
        }

        function start() {
            if (rafId == null) loop();
        }
        function stop() {
            if (rafId != null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        }

        let resizeTimer = null;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                resize();
                seedParticles();
            }, 150);
        });

        // Pause animation when tab is hidden (saves CPU), resume when visible
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) stop();
            else start();
        });

        // ---- Boot ----
        // Always start the animation loop — even if the OS has
        // "reduce motion" enabled, the user explicitly wants the drift.
        resize();
        seedParticles();
        // Draw one frame immediately so the user sees particles before rAF fires
        try { step(); draw(); } catch (e) { console.error('[bg-network] initial draw:', e); }
        start();
    })();
})();
