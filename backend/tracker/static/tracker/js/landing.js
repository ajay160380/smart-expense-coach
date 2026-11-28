(function () {
    'use strict';
    document.documentElement.classList.add('anim');
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── 1. Subtle Blue Noir Horizon Mesh & Rising Packets Canvas ── */
    const canvas = document.getElementById('noirBlueCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let w = 0;
        let h = 0;
        let dpr = Math.min(window.devicePixelRatio || 1, 2);
        let pointer = { x: 0.5, y: 0.35, tx: 0.5, ty: 0.35 };
        const beams = Array.from({ length: 18 }, (_, i) => ({
            x: (i + 0.5) / 18,
            offset: (i * 0.17) % 1,
            speed: 0.08 + (i % 5) * 0.025,
            len: 90 + (i % 3) * 50,
            alpha: 0.18 + (i % 4) * 0.07
        }));

        function resizeCanvas() {
            w = window.innerWidth;
            h = window.innerHeight;
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        window.addEventListener('pointermove', (e) => {
            pointer.tx = Math.max(0, Math.min(1, e.clientX / Math.max(1, w)));
            pointer.ty = Math.max(0, Math.min(1, e.clientY / Math.max(1, h)));
        }, { passive: true });

        function draw(nowMs) {
            const t = nowMs * 0.001;
            pointer.x += (pointer.tx - pointer.x) * 0.05;
            pointer.y += (pointer.ty - pointer.y) * 0.05;

            ctx.clearRect(0, 0, w, h);

            const pGlow = ctx.createRadialGradient(
                pointer.x * w,
                pointer.y * h,
                10,
                pointer.x * w,
                pointer.y * h,
                Math.min(480, w * 0.45)
            );
            pGlow.addColorStop(0, 'rgba(59, 130, 246, 0.11)');
            pGlow.addColorStop(0.55, 'rgba(59, 130, 246, 0.03)');
            pGlow.addColorStop(1, 'rgba(59, 130, 246, 0)');
            ctx.fillStyle = pGlow;
            ctx.fillRect(0, 0, w, h);

            beams.forEach((b) => {
                const bx = b.x * w + (pointer.x - 0.5) * 28;
                const progress = (b.offset + t * b.speed) % 1.25;
                const headY = h - progress * h;
                const tailY = headY + b.len;
                const grad = ctx.createLinearGradient(bx, headY, bx, tailY);
                grad.addColorStop(0, `rgba(96, 165, 250, ${b.alpha.toFixed(2)})`);
                grad.addColorStop(1, 'rgba(59, 130, 246, 0)');

                ctx.beginPath();
                ctx.moveTo(bx, headY);
                ctx.lineTo(bx, tailY);
                ctx.strokeStyle = grad;
                ctx.lineWidth = 1.2;
                ctx.stroke();

                ctx.fillStyle = 'rgba(96, 165, 250, 0.85)';
                ctx.fillRect(bx - 1, headY - 1, 2, 2);
            });
        }

        resizeCanvas();
        window.addEventListener('resize', () => {
            resizeCanvas();
            if (prefersReduced) draw(1200);
        });

        if (prefersReduced) {
            draw(1200);
        } else {
            const loop = (now) => {
                draw(now);
                requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
        }
    }

    /* ── 2. Mobile Fullscreen Drawer ── */
    const drawer = document.getElementById('mobileDrawer');
    const openNav = document.getElementById('openMobileNav');
    const closeNav = document.getElementById('closeMobileNav');
    if (drawer && openNav && closeNav) {
        const setDrawer = (open) => {
            drawer.classList.toggle('open', open);
            drawer.setAttribute('aria-hidden', String(!open));
            openNav.setAttribute('aria-expanded', String(open));
            document.body.style.overflow = open ? 'hidden' : '';
        };
        openNav.addEventListener('click', () => setDrawer(true));
        closeNav.addEventListener('click', () => setDrawer(false));
        document.querySelectorAll('.mob-nav-link').forEach((link) => {
            link.addEventListener('click', () => setDrawer(false));
        });
    }

    /* ── 3. Reveal Observer + Safety Net ── */
    const reveals = Array.from(document.querySelectorAll('.reveal'));
    const checkReveals = () => {
        const limit = window.innerHeight + 140;
        reveals.forEach((el) => {
            if (!el.classList.contains('is-in') && el.getBoundingClientRect().top <= limit) {
                el.classList.add('is-in');
            }
        });
    };
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (e.isIntersecting) {
                    e.target.classList.add('is-in');
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.01, rootMargin: '120px 0px' });
        reveals.forEach((el) => io.observe(el));
        window.addEventListener('scroll', checkReveals, { passive: true });
        checkReveals();
        setTimeout(() => reveals.forEach((el) => el.classList.add('is-in')), 800);
    } else {
        reveals.forEach((el) => el.classList.add('is-in'));
    }

    /* ── 4. Card Spotlight Mouse Track ── */
    document.querySelectorAll('[data-spotlight]').forEach((card) => {
        card.addEventListener('mousemove', (e) => {
            const r = card.getBoundingClientRect();
            card.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
            card.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
        });
    });

    /* ── 5. Interactive Live Parse Preview + Ecosystem Jump Triggers ── */
    const parseSamples = {
        fuel: {
            msg: '"Bhai 250 ka petrol dalwaya"',
            cat: 'Fuel · Necessary',
            amt: '₹250.00',
            rem: '₹14,022 left · +20 XP'
        },
        split: {
            msg: '"Swiggy dinner 420 with friends"',
            cat: 'Food · Goa Split (3)',
            amt: '₹140.00 / pp',
            rem: 'Group link synced'
        },
        voice: {
            msg: '[Voice 2.8s] "50 masala chai"',
            cat: 'Food · Transcribed',
            amt: '₹50.00',
            rem: '14-Day Streak +1'
        }
    };
    const parseTabs = document.querySelectorAll('.parse-tab');
    const parseMsgEl = document.getElementById('parseSampleMsg');
    const parseCatEl = document.getElementById('parseSampleCat');
    const parseAmtEl = document.getElementById('parseSampleAmt');
    const parseRemEl = document.getElementById('parseSampleRem');

    function activateSample(key) {
        const s = parseSamples[key];
        if (!s) return;
        parseTabs.forEach((t) => {
            const isAct = t.dataset.sample === key;
            t.classList.toggle('active', isAct);
            t.setAttribute('aria-selected', String(isAct));
        });
        if (parseMsgEl) parseMsgEl.textContent = s.msg;
        if (parseCatEl) parseCatEl.textContent = s.cat;
        if (parseAmtEl) parseAmtEl.textContent = s.amt;
        if (parseRemEl) parseRemEl.textContent = s.rem;
    }

    parseTabs.forEach((tab) => {
        tab.addEventListener('click', () => activateSample(tab.dataset.sample));
    });

    document.querySelectorAll('[data-jump-sample]').forEach((el) => {
        el.addEventListener('click', () => activateSample(el.dataset.jumpSample));
    });

    /* ── 6. Interactive Community Review Banner Selection ── */
    const bannerQuoteEl = document.getElementById('bannerQuote');
    const bannerAvatarEl = document.getElementById('bannerAvatar');
    const bannerNameEl = document.getElementById('bannerName');
    const bannerRoleEl = document.getElementById('bannerRole');
    const reviewCards = document.querySelectorAll('.review-mini-card[data-quote]');

    reviewCards.forEach((card) => {
        card.addEventListener('click', () => {
            reviewCards.forEach((c) => c.classList.remove('active'));
            card.classList.add('active');
            if (bannerQuoteEl) bannerQuoteEl.textContent = card.dataset.quote;
            if (bannerAvatarEl) bannerAvatarEl.textContent = card.dataset.initials;
            if (bannerNameEl) bannerNameEl.textContent = card.dataset.author;
            if (bannerRoleEl) bannerRoleEl.textContent = card.dataset.role;
        });
    });

    /* ── 7. Demo Walkthrough Video & Feedback Dialogs ── */
    const demoModal = document.getElementById('demoVideoModal');
    const openDemo = document.getElementById('openDemoBtn');
    const openDemoFooter = document.getElementById('openDemoBtnFooter');
    const closeDemo = document.getElementById('closeDemoBtn');
    const videoEl = document.getElementById('demoVideoEl');
    const showDemo = () => {
        if (!demoModal) return;
        demoModal.showModal();
        if (videoEl) videoEl.play().catch(() => { });
    };
    if (openDemo) openDemo.addEventListener('click', showDemo);
    if (openDemoFooter) openDemoFooter.addEventListener('click', showDemo);
    if (demoModal && closeDemo) {
        closeDemo.addEventListener('click', () => {
            if (videoEl) videoEl.pause();
            demoModal.close();
        });
        demoModal.addEventListener('click', (e) => {
            if (e.target === demoModal) {
                if (videoEl) videoEl.pause();
                demoModal.close();
            }
        });
    }

    const fbModal = document.getElementById('feedbackModal');
    const openFb = document.getElementById('openFeedbackBtn');
    const closeFb = document.getElementById('closeFeedbackBtn');
    const fbForm = document.getElementById('feedbackForm');
    const fbStatus = document.getElementById('feedbackStatus');
    if (fbModal && openFb && closeFb) {
        openFb.addEventListener('click', () => fbModal.showModal());
        closeFb.addEventListener('click', () => fbModal.close());
        fbModal.addEventListener('click', (e) => {
            if (e.target === fbModal) fbModal.close();
        });
    }
    if (fbForm) {
        fbForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const txt = document.getElementById('feedbackText');
            if (!txt || !txt.value.trim()) return;
            try {
                const res = await fetch('/api/submit-feedback/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: txt.value.trim(), source: 'web' })
                });
                if (res.ok) {
                    fbStatus.textContent = 'Feedback logged. Thank you.';
                    txt.value = '';
                } else {
                    fbStatus.textContent = 'Sign in first to submit feedback directly.';
                }
            } catch {
                fbStatus.textContent = 'Network unreachable.';
            }
        });
    }
})();
