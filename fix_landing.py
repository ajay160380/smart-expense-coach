import re

with open('tracker/templates/tracker/landing.html', 'r') as f:
    content = f.read()

# Replace the style block
style_pattern = re.compile(r'<style>.*?</style>', re.DOTALL)

new_style = """<style>
    /* 🌌 PREMIUM STYLING (THEME ADAPTIVE) */
    
    @property --angle {
        syntax: '<angle>';
        initial-value: 0deg;
        inherits: false;
    }

    body {
        overflow-x: hidden;
    }

    .landing-wrapper {
        position: relative;
        width: 100%;
        padding-bottom: 100px;
        background-color: var(--bg-base);
    }

    /* SVG Grain/Noise Texture */
    .noise-overlay {
        position: fixed;
        inset: 0;
        z-index: 1000;
        pointer-events: none;
        opacity: 0.04;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    }

    /* Abstract Background & Orbs */
    .hero-bg-grid {
        position: absolute;
        inset: 0;
        background-image: 
            linear-gradient(to right, var(--border-light) 1px, transparent 1px),
            linear-gradient(to bottom, var(--border-light) 1px, transparent 1px);
        background-size: 60px 60px;
        opacity: 0.4;
        z-index: -2;
    }

    .orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(140px);
        z-index: -1;
        pointer-events: none;
    }

    .orb-1 { width: 700px; height: 700px; background: rgba(37, 211, 102, 0.12); top: -250px; left: -10%; }
    .orb-2 { width: 800px; height: 800px; background: rgba(99, 102, 241, 0.12); top: 5%; right: -25%; animation-delay: -7s; }
    .orb-3 { width: 600px; height: 600px; background: rgba(236, 72, 153, 0.1); bottom: -150px; left: 15%; animation-delay: -11s; }

    @keyframes float-orb {
        0% { transform: translate(0, 0) scale(1) rotate(0deg); }
        100% { transform: translate(80px, 100px) scale(1.3) rotate(90deg); }
    }

    /* Hero Section */
    .hero-section {
        position: relative;
        text-align: center;
        padding: 160px 20px 80px;
        max-width: 1000px;
        margin: 0 auto;
        z-index: 10;
    }

    .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        background: var(--bg-glass);
        border: 1px solid var(--border-glass);
        backdrop-filter: blur(24px);
        padding: 8px 26px;
        border-radius: 100px;
        color: var(--text-main);
        font-weight: 500;
        font-size: 0.95rem;
        margin-bottom: 40px;
        box-shadow: var(--shadow-soft);
        animation: fade-down 1s ease-out backwards;
    }

    .hero-badge span.pulse {
        width: 10px; height: 10px; border-radius: 50%; background: var(--whatsapp-green);
        box-shadow: 0 0 15px var(--whatsapp-green);
        animation: pulse-dot 2s infinite;
    }

    .hero-title {
        font-family: 'Outfit', sans-serif;
        font-size: clamp(3.5rem, 8vw, 7rem);
        font-weight: 900;
        line-height: 1.05;
        letter-spacing: -0.04em;
        margin-bottom: 35px;
        color: var(--text-main);
        animation: fade-up 1s ease-out 0.1s backwards;
    }

    .text-gradient {
        background: linear-gradient(270deg, #25D366, #128C7E, var(--primary), var(--secondary), #25D366);
        background-size: 400% 400%;
        color: transparent;
        -webkit-background-clip: text;
        background-clip: text;
        animation: shine-gradient 8s ease infinite;
    }

    .hero-subtitle {
        font-size: clamp(1.1rem, 2vw, 1.4rem);
        color: var(--text-muted);
        max-width: 800px;
        margin: 0 auto 50px;
        line-height: 1.7;
        animation: fade-up 1s ease-out 0.3s backwards;
    }

    .hero-ctas {
        display: flex;
        justify-content: center;
        gap: 24px;
        flex-wrap: wrap;
        animation: fade-up 1s ease-out 0.5s backwards;
    }

    .btn-ultra {
        padding: 18px 40px;
        font-size: 1.15rem;
        border-radius: 100px;
        font-weight: 800;
        font-family: 'Outfit', sans-serif;
        text-decoration: none;
        transition: all 0.4s ease;
        display: inline-flex;
        align-items: center;
        gap: 12px;
        position: relative;
        overflow: hidden;
    }

    .btn-green-glow {
        background: linear-gradient(135deg, #25D366, #128C7E);
        color: #fff;
        box-shadow: 0 15px 35px rgba(37, 211, 102, 0.3);
    }

    .btn-green-glow:hover {
        transform: translateY(-3px);
        box-shadow: 0 20px 45px rgba(37, 211, 102, 0.5);
    }

    .btn-glass {
        background: var(--bg-glass);
        border: 1px solid var(--border-glass);
        color: var(--text-main);
        backdrop-filter: blur(20px);
        box-shadow: var(--shadow-soft);
    }

    .btn-glass:hover {
        background: var(--bg-card);
        transform: translateY(-3px);
        border-color: var(--primary);
    }

    /* Social Proof Avatars */
    .social-proof {
        margin-top: 50px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        animation: fade-up 1s ease-out 0.7s backwards;
    }
    .avatars { display: flex; }
    .avatar {
        width: 48px; height: 48px;
        border-radius: 50%;
        border: 3px solid var(--bg-base);
        background: var(--bg-card);
        margin-left: -16px;
        display: flex; align-items: center; justify-content: center;
        overflow: hidden;
        box-shadow: var(--shadow-soft);
    }
    .avatars .avatar:first-child { margin-left: 0; }
    .social-proof p { color: var(--text-muted); font-size: 1rem; font-weight: 500; }
    .social-proof strong { color: var(--text-main); }

    /* Epic Showcase Area */
    .showcase-container {
        position: relative;
        max-width: 1200px;
        margin: 80px auto 120px;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 800px;
        animation: fade-up 1.2s ease-out 0.9s backwards;
        z-index: 5;
    }

    /* Floating Elements */
    .float-item {
        position: absolute;
        background: var(--bg-glass);
        backdrop-filter: blur(20px);
        border: 1px solid var(--border-glass);
        border-radius: 20px;
        padding: 16px 24px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: var(--shadow-soft);
        z-index: 20;
        font-family: 'Outfit', sans-serif;
        animation: float-card 6s ease-in-out infinite alternate;
        transition: transform 0.3s, border-color 0.3s;
    }
    .float-item:hover { transform: scale(1.05) !important; z-index: 30; border-color: var(--primary); }

    .float-1 { top: 15%; left: 5%; animation-delay: 0s; transform: rotate(-5deg); }
    .float-2 { bottom: 20%; left: 0%; animation-delay: -2s; transform: rotate(5deg); }
    .float-3 { top: 30%; right: 5%; animation-delay: -4s; transform: rotate(8deg); }
    .float-4 { bottom: 25%; right: 0%; animation-delay: -1s; transform: rotate(-3deg); }

    .float-icon {
        width: 50px; height: 50px;
        border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.6rem;
    }
    .fi-1 { background: linear-gradient(135deg, #FB7185, #E11D48); }
    .fi-2 { background: linear-gradient(135deg, #38BDF8, #0284C7); }
    .fi-3 { background: linear-gradient(135deg, #34D399, #059669); }
    .fi-4 { background: linear-gradient(135deg, #C084FC, #9333EA); }

    .float-text h4 { margin: 0 0 4px 0; font-size: 1.1rem; color: var(--text-main); }
    .float-text p { margin: 0; font-size: 0.9rem; color: var(--text-muted); }

    /* The Phone */
    .phone-wrapper {
        perspective: 1500px;
        z-index: 10;
        position: relative;
    }
    
    .phone-aura {
        position: absolute;
        inset: -10px;
        background: conic-gradient(from var(--angle), transparent 0%, rgba(99, 102, 241, 0.2) 20%, rgba(37, 211, 102, 0.2) 40%, transparent 60%);
        border-radius: 65px;
        filter: blur(20px);
        animation: spin-aura 6s linear infinite;
        z-index: -1;
    }

    @keyframes spin-aura { 0% { --angle: 0deg; } 100% { --angle: 360deg; } }
    
    .phone-frame {
        width: 360px;
        height: 720px;
        background: var(--bg-base);
        border: 14px solid var(--bg-card);
        border-radius: 50px;
        box-shadow: 0 30px 60px rgba(0, 0, 0, 0.15), inset 0 0 0 2px var(--border-glass);
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition: transform 0.2s ease-out;
    }

    .dynamic-island {
        position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
        width: 110px; height: 32px; background: var(--text-main); border-radius: 20px; z-index: 30;
    }

    .phone-header {
        background: var(--bg-glass);
        padding: 55px 20px 15px;
        display: flex; align-items: center; gap: 14px;
        border-bottom: 1px solid var(--border-glass);
        z-index: 10;
    }

    .wa-avatar {
        width: 42px; height: 42px; border-radius: 50%;
        background: linear-gradient(135deg, #25D366, #128C7E);
        display: flex; align-items: center; justify-content: center;
        font-size: 1.2rem;
    }

    .wa-contact h3 { margin: 0; font-size: 1.05rem; color: var(--text-main); font-weight: 700; }
    .wa-contact p { margin: 0; font-size: 0.8rem; color: var(--whatsapp-green); font-weight: 600; }

    .phone-body {
        flex: 1;
        background: var(--bg-base);
        position: relative;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow: hidden;
    }

    .chat-bubble {
        max-width: 85%; padding: 14px 18px; border-radius: 18px;
        font-size: 0.95rem; line-height: 1.5; position: relative; z-index: 5;
        box-shadow: 0 4px 15px rgba(0,0,0,0.08);
        animation: popIn 0.5s ease-out backwards;
    }
    
    .chat-sent {
        background: linear-gradient(135deg, #005C4B, #004d3e); color: white;
        align-self: flex-end; border-bottom-right-radius: 4px;
    }
    .chat-received {
        background: var(--bg-card); color: var(--text-main);
        align-self: flex-start; border-bottom-left-radius: 4px;
        border: 1px solid var(--border-glass);
    }
    .chat-time { display: block; text-align: right; font-size: 0.7rem; margin-top: 6px; opacity: 0.6; }

    /* Bento Grid Features */
    .bento-section { max-width: 1200px; margin: 0 auto 100px; padding: 0 20px; }
    .section-title {
        text-align: center; font-family: 'Outfit', sans-serif;
        font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 800; margin-bottom: 60px;
        color: var(--text-main);
    }

    .bento-grid {
        display: grid; grid-template-columns: repeat(3, 1fr);
        grid-auto-rows: minmax(320px, auto); gap: 24px;
    }

    .bento-card {
        background: var(--bg-glass);
        border: 1px solid var(--border-glass);
        border-radius: 28px; padding: 40px;
        position: relative; overflow: hidden;
        transition: all 0.3s ease;
        display: flex; flex-direction: column;
        box-shadow: var(--shadow-soft);
    }
    
    .bento-card:hover {
        border-color: var(--primary); transform: translateY(-5px);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    }

    .bento-card::before {
        content: ''; position: absolute; top: 0; left: 0; right: 0; height: 100%;
        background: radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 0%), var(--primary-glow), transparent 40%);
        z-index: 0; opacity: 0; transition: opacity 0.3s;
    }
    .bento-card:hover::before { opacity: 1; }

    .bento-wide { grid-column: span 2; }
    .bento-tall { grid-row: span 2; background: linear-gradient(180deg, var(--bg-glass) 0%, var(--primary-glow) 200%); }

    .bento-content { position: relative; z-index: 1; }
    .bento-icon {
        width: 60px; height: 60px; border-radius: 16px;
        background: var(--bg-card); display: flex; align-items: center; justify-content: center;
        font-size: 1.8rem; margin-bottom: 24px; border: 1px solid var(--border-glass);
    }
    .bento-title { font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 700; margin-bottom: 16px; color: var(--text-main); }
    .bento-desc { color: var(--text-muted); font-size: 1.1rem; line-height: 1.6; }

    /* Animations Keyframes */
    @keyframes fade-up { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
    @keyframes fade-down { 0% { opacity: 0; transform: translateY(-20px); } 100% { opacity: 1; transform: translateY(0); } }
    @keyframes pulse-dot { 0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.6); } 70% { box-shadow: 0 0 0 10px rgba(37, 211, 102, 0); } 100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); } }
    @keyframes shine-gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
    @keyframes float-card { 0% { transform: translateY(0) rotate(var(--rot, 0deg)); } 100% { transform: translateY(-20px) rotate(calc(var(--rot) * 1.5)); } }
    @keyframes popIn { 0% { opacity: 0; transform: scale(0.8) translateY(20px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }

    /* Responsive */
    @media (max-width: 1024px) { .bento-grid { grid-template-columns: repeat(2, 1fr); } .float-item { display: none; } }
    @media (max-width: 768px) {
        .bento-grid { grid-template-columns: 1fr; }
        .bento-wide, .bento-tall { grid-column: span 1; grid-row: span 1; }
        .hero-title { font-size: 3rem; }
        .btn-ultra { width: 100%; justify-content: center; }
        .phone-frame { width: 100%; max-width: 340px; height: 650px; }
    }
</style>"""

content = style_pattern.sub(new_style, content)

# Fix Footer Border
content = content.replace('border-top: 1px solid rgba(255,255,255,0.05);', 'border-top: 1px solid var(--border-glass);')
content = content.replace('style="color: rgba(255,255,255,0.2);"', 'style="color: var(--border-light);"')

with open('tracker/templates/tracker/landing.html', 'w') as f:
    f.write(content)

print("Done fixing landing.html!")
