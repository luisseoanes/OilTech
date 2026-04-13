import os
import re

html_path = "c:\\Users\\Luis Seoanes\\Documents\\oilTech\\index.html"
css_path = "c:\\Users\\Luis Seoanes\\Documents\\oilTech\\index.css"

with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()


# 1. Update CSS variables
css = re.sub(
    r':root \{(.*?)\}',
    r''':root {
    --red: #E30613;
    --red-light: #fdeced;
    --red-mid: #f9b0b3;
    --orange: #FFA200;
    --yellow: #FFD400;
    --orange-lt: #fff8ec;
    --black: #0A0A0A;
    --dark: #1F1F1F;
    --mid: #4A4A4A;
    --soft: #808080;
    --border: #E5E7EB;
    --bg: #ffffff;
    --bg2: #F9FAFB;
    --bg3: #F3F4F6;
    --glass-bg: rgba(255, 255, 255, 0.85);
    --glass-border: rgba(255, 255, 255, 0.4);
    --shadow-sm: 0 4px 6px rgba(0,0,0,0.05);
    --shadow-md: 0 8px 24px rgba(227, 6, 19, 0.08);
    --shadow-lg: 0 20px 40px rgba(227, 6, 19, 0.15);
}''', css, flags=re.DOTALL)


# 2. Update Hero HTML
old_hero = re.search(r'<!-- HERO -->(.*?)<!-- MARQUEE -->', html, re.DOTALL).group(1)

new_hero = """
    <section class="hero" style="background: linear-gradient(rgba(10, 10, 10, 0.6), rgba(10, 10, 10, 0.3)), url('imagenes/hero_industrial.png') center/cover no-repeat; display: flex; align-items: center; justify-content: center; min-height: 90vh;">
        <div class="hero-left glass-card" style="max-width: 800px; text-align: center; margin: 0 auto; color: white;">
            <div class="hero-label" style="justify-content: center; color: var(--yellow); margin-bottom: 24px;">Oil Tech de Colombia S.A.S.</div>
            <h1 class="hero-h1" style="color: white; font-size: clamp(3rem, 5vw, 5rem);">
                Soluciones de<br>lubricación para<br>la <em style="color: var(--yellow);">industria</em>
            </h1>
            <p class="hero-sub" style="color: rgba(255,255,255,0.9); max-width: 600px; margin: 0 auto 40px auto; font-size: 1.3rem;">
                Distribuimos lubricantes, grasas, EPP y productos de mantenimiento industrial en todo el territorio nacional, respaldados por más de 13 años de experiencia.
            </p>
            <div class="hero-actions" style="justify-content: center;">
                <a class="btn-primary" href="productos.html" style="background: var(--yellow); color: var(--black);">Ver Portafolio Visual</a>
                <a class="btn-outline" href="#contacto" style="border-color: white; color: white;">Contáctenos</a>
            </div>
            
            <div class="hero-stat-row" style="margin-top: 50px; padding-top: 40px; border-top: 1px solid rgba(255,255,255,0.2); display: flex; justify-content: center; gap: 40px;">
                <div class="hero-stat" style="border: none; padding: 0; flex: none;">
                    <div class="hero-stat-num" style="color: var(--yellow); font-size: 2.8rem;">13+</div>
                    <div class="hero-stat-label" style="color: white;">Años de experiencia</div>
                </div>
                <!-- Divisor -->
                <div style="width: 1px; background: rgba(255,255,255,0.2);"></div>
                <div class="hero-stat" style="border: none; padding: 0; flex: none;">
                    <div class="hero-stat-num" style="color: var(--yellow); font-size: 2.8rem;">250+</div>
                    <div class="hero-stat-label" style="color: white;">Referencias industriales</div>
                </div>
            </div>
        </div>
    </section>
"""

html = html.replace(old_hero, new_hero)

# 3. Add Glass Card to CSS
if '.glass-card' not in css:
    css += """
/* Glassmorphism Classes */
.glass-card {
    background: rgba(20, 20, 20, 0.45);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 24px;
    padding: 60px 50px;
    box-shadow: 0 30px 60px rgba(0,0,0,0.3);
}
"""

# 4. Update Product Cards to use large images
css = re.sub(r'\.product-card \{.*?\}', r'''.product-card {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 16px;
    position: relative;
    overflow: hidden;
    transition: all .4s cubic-bezier(0.165, 0.84, 0.44, 1);
    display: flex;
    flex-direction: column;
}

.product-card:hover {
    border-color: var(--red);
    box-shadow: var(--shadow-lg);
    transform: translateY(-8px);
}

.product-card .img-wrapper {
    width: 100%;
    height: 220px;
    overflow: hidden;
}

.product-card .img-wrapper img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s ease;
}

.product-card:hover .img-wrapper img {
    transform: scale(1.08); /* Hover zoom */
}

.product-card-content {
    padding: 30px 24px;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}
''', css, flags=re.DOTALL)


# Product grid modifications
old_products = re.search(r'<!-- PRODUCTS -->(.*?)<!-- BENEFICIOS -->', html, re.DOTALL).group(1)

new_products = """
    <section class="products reveal" id="portafolio">
        <div class="products-header" style="max-width: 1200px; margin: 0 auto 56px auto;">
            <div>
                <div class="section-label">Portafolio Premium</div>
                <h2 class="section-h2">Catálogo Visual<br>de Soluciones</h2>
            </div>
            <a class="btn-outline" href="#contacto" style="font-size:0.72rem;padding:12px 22px;">Cotizar ahora →</a>
        </div>

        <div class="products-grid" style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 32px;">

            <!-- Lubricantes -->
            <div class="product-card featured" style="grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; padding: 0;">
                <div class="img-wrapper" style="height: 100%;">
                    <img src="imagenes/cat_lubricantes.png" alt="Lubricantes Industriales">
                </div>
                <div class="product-card-content" style="padding: 50px 40px; justify-content: center;">
                    <div class="featured-badge" style="width: max-content;">Línea principal</div>
                    <h3 class="pc-title" style="font-size:2rem;">Lubricantes Industriales</h3>
                    <p class="pc-desc" style="font-size: 1.1rem; color: rgba(255,255,255,0.8);">
                        Formulaciones avanzadas con aditivos de grafito, molibdeno y tecnologías sintéticas de alto
                        desempeño. Diseñadas para proteger maquinaria, reducir el desgaste y mejorar la eficiencia operativa
                        en condiciones críticas.
                    </p>
                    <div class="pc-tags" style="margin-top: 20px;">
                        <span class="pc-tag">Hidráulicos</span>
                        <span class="pc-tag">Sintéticos</span>
                        <span class="pc-tag">Térmicos</span>
                        <span class="pc-tag">Grado Alimenticio</span>
                    </div>
                </div>
            </div>

            <!-- Grasas -->
            <div class="product-card">
                <div class="img-wrapper"><img src="imagenes/cat_grasas.png" alt="Grasas Industriales"></div>
                <div class="product-card-content">
                    <h3 class="pc-title">Grasas Industriales</h3>
                    <p class="pc-desc">Lubricantes de alta presión con disulfuro de molibdeno. Protección para engranajes pesados.</p>
                    <div style="flex-grow: 1;"></div>
                    <div class="pc-footer">+10 referencias</div>
                </div>
            </div>

            <!-- EPP -->
            <div class="product-card">
                <div class="img-wrapper"><img src="imagenes/cat_epp.png" alt="Seguridad Industrial"></div>
                <div class="product-card-content">
                    <h3 class="pc-title">Seguridad Industrial</h3>
                    <p class="pc-desc">Equipos de protección personal (EPP) de alta calidad. Cumplimiento normativo y ergonomía.</p>
                    <div style="flex-grow: 1;"></div>
                    <div class="pc-footer">+40 referencias</div>
                </div>
            </div>

            <!-- Limpieza -->
            <div class="product-card">
                <div class="img-wrapper"><img src="imagenes/cat_limpieza.png" alt="Limpieza y Mantenimiento"></div>
                <div class="product-card-content">
                    <h3 class="pc-title">Limpieza y Mantenimiento</h3>
                    <p class="pc-desc">Insumos químicos de alto rendimiento para desengrase y desinfección industrial.</p>
                    <div style="flex-grow: 1;"></div>
                    <div class="pc-footer">+30 referencias</div>
                </div>
            </div>

            <!-- Herramientas -->
            <div class="product-card">
                <div class="img-wrapper"><img src="imagenes/cat_herramientas.png" alt="Herramientas y Suministros"></div>
                <div class="product-card-content">
                    <h3 class="pc-title">Herramientas Técnicas</h3>
                    <p class="pc-desc">Componentes mecánicos, bombas, filtros y herramientas para mantenimiento técnico.</p>
                    <div style="flex-grow: 1;"></div>
                    <div class="pc-footer">+100 referencias</div>
                </div>
            </div>

        </div>
    </section>
"""

html = html.replace(old_products, new_products)

# 5. Emojis update in Benefits
html = html.replace('<span class="benefit-icon">🔬</span>', r'''
<svg class="benefit-icon-svg" width="36" height="36" fill="var(--red)" viewBox="0 0 24 24" style="margin-bottom:16px;">
  <path d="M11 2L7 12h5l-1 10 9-13h-6l2-9h-5z"/>
</svg>''')

html = html.replace('<span class="benefit-icon">📦</span>', r'''
<svg class="benefit-icon-svg" width="36" height="36" fill="var(--yellow)" viewBox="0 0 24 24" style="margin-bottom:16px;">
  <path d="M2 10.96a2 2 0 0 1 1-1.73l8-4.62a2 2 0 0 1 2 0l8 4.62a2 2 0 0 1 1 1.73v5.66a2 2 0 0 1-1 1.73l-8 4.62a2 2 0 0 1-2 0l-8-4.62a2 2 0 0 1-1-1.73v-5.66M12 2A2 2 0 0 0 10 2L2 6.6"/>
  <path d="m22 7.04-10 5.77v11.19"/>
  <path d="m2 7.04 10 5.77 10-5.77"/>
</svg>''')

html = html.replace('<span class="benefit-icon">🇨🇴</span>', r'''
<svg class="benefit-icon-svg" width="36" height="36" fill="var(--red)" viewBox="0 0 24 24" style="margin-bottom:16px;">
  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
</svg>''')

html = html.replace('<span class="benefit-icon">✅</span>', r'''
<svg class="benefit-icon-svg" width="36" height="36" fill="var(--yellow)" viewBox="0 0 24 24" style="margin-bottom:16px;">
  <path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm-2-5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
</svg>''')

# Fix `.featured` background missing
css += """
.product-card.featured { background: #1a1a1a; color: white; border: none; }
.product-card.featured .pc-title { color: white; }
.product-card.featured .pc-desc { color: rgba(255,255,255,0.7); }
"""

# Fix responsive for featured
css += """
@media (max-width: 768px) {
    .product-card.featured {
        grid-template-columns: 1fr !important;
    }
}
"""

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)

print("Modification done!")
