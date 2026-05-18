const STORAGE_KEY = "achadinhos_admin_products_v1";
const AUTH_KEY = "achadinhos_admin_logged";
const ADMIN_LOGIN = "janana25";
const ADMIN_EMAIL_DOMAIN = "admin.achadinhos.local";
const CATEGORIES = [
  "Moda",
  "Infantil & Bebê",
  "Casa",
  "Beleza",
  "Tecnologia & Games",
  "Pets",
  "Lifestyle",
];

function getSupabaseClient() {
  const config = window.ACHADINHOS_SUPABASE;
  const hasConfig =
    config &&
    config.url &&
    config.anonKey &&
    !config.url.includes("COLE_AQUI") &&
    !config.anonKey.includes("COLE_AQUI");

  if (!hasConfig || !window.supabase) return null;
  return window.supabase.createClient(config.url, config.anonKey);
}

const db = getSupabaseClient();

function adminLoginToEmail(login) {
  return login.includes("@") ? login : `${login}@${ADMIN_EMAIL_DOMAIN}`;
}

function toDbProduct(product, index = 0) {
  return {
    title: product.title,
    marketplace: product.marketplace,
    category: product.category || product.tag || "Lifestyle",
    tag: product.tag || product.marketplace,
    discount: product.discount,
    old_price: product.oldPrice,
    new_price: product.newPrice,
    image: product.image,
    link: product.link,
    sort_order: product.sortOrder ?? index,
  };
}

function fromDbProduct(product) {
  return {
    id: product.id,
    title: product.title,
    marketplace: product.marketplace,
    category: product.category || product.tag || product.marketplace,
    tag: product.tag || product.marketplace,
    discount: product.discount,
    oldPrice: product.old_price,
    newPrice: product.new_price,
    image: product.image,
    link: product.link,
    sortOrder: product.sort_order,
  };
}

function moneyFromText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function slugify(text) {
  return normalize(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function inferCategory(tag, title = "") {
  const text = normalize(`${tag} ${title}`);
  if (text.includes("bebe") || text.includes("infantil") || text.includes("mamadeira") || text.includes("meia 3d")) {
    return "Infantil & Bebê";
  }
  if (text.includes("casa") || text.includes("cozinha") || text.includes("coador") || text.includes("panela") || text.includes("sapateira")) {
    return "Casa";
  }
  if (text.includes("beleza") || text.includes("maquiagem") || text.includes("skincare")) {
    return "Beleza";
  }
  if (text.includes("tecnologia") || text.includes("game") || text.includes("fone") || text.includes("smart")) {
    return "Tecnologia & Games";
  }
  if (text.includes("pet") || text.includes("cachorro") || text.includes("gato")) {
    return "Pets";
  }
  if (text.includes("body") || text.includes("conjunto") || text.includes("oculos") || text.includes("camiseta") || text.includes("moda")) {
    return "Moda";
  }
  return "Lifestyle";
}

function getDefaultProducts() {
  return [...document.querySelectorAll(".product-card")].map((card, index) => ({
    id: card.dataset.id || `${slugify(card.querySelector(".product-title")?.innerText)}-${index + 1}`,
    title: card.querySelector(".product-title")?.innerText.trim() || "",
    marketplace: card.dataset.marketplace || card.querySelector(".marketplace")?.innerText.trim() || "Shopee",
    category: card.dataset.category || inferCategory(card.querySelector(".marketplace")?.innerText.trim(), card.querySelector(".product-title")?.innerText),
    tag: card.dataset.category || inferCategory(card.querySelector(".marketplace")?.innerText.trim(), card.querySelector(".product-title")?.innerText),
    discount: card.querySelector(".discount")?.innerText.trim() || "-0%",
    oldPrice: moneyFromText(card.querySelector(".old-price")?.innerText),
    newPrice: moneyFromText(card.querySelector(".new-price")?.innerText),
    image: card.querySelector("img")?.getAttribute("src") || "",
    link: card.getAttribute("href") || "#",
  }));
}

function loadProducts(defaultProducts = []) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return Array.isArray(saved) ? saved : defaultProducts;
  } catch {
    return defaultProducts;
  }
}

function saveProducts(products) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

async function fetchProducts(defaultProducts = []) {
  if (!db) return loadProducts(defaultProducts);

  const { data, error } = await db
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar produtos:", error.message);
    return loadProducts(defaultProducts);
  }

  return data.map(fromDbProduct);
}

async function seedProductsIfEmpty(defaultProducts) {
  if (!db || !defaultProducts.length) return;

  const { count, error } = await db
    .from("products")
    .select("id", { count: "exact", head: true });

  if (error || count) return;

  await db.from("products").insert(defaultProducts.map(toDbProduct));
}

function productTemplate(product) {
  return `
    <a
      href="${escapeHtml(product.link)}"
      target="_blank"
      rel="noopener noreferrer"
      class="product-card"
      data-id="${escapeHtml(product.id)}"
      data-marketplace="${escapeHtml(product.marketplace)}"
      data-category="${escapeHtml(product.category || product.tag)}">
      <div class="discount">${escapeHtml(product.discount)}</div>
      <div class="favorite">❤</div>
      <div class="product-image">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}">
      </div>
      <div class="product-info">
        <span class="marketplace">${escapeHtml(product.category || product.tag || product.marketplace)}</span>
        <h3 class="product-title">${escapeHtml(product.title)}</h3>
        <div class="stars">★★★★★</div>
        <div class="prices">
          <span class="old-price">${escapeHtml(product.oldPrice)}</span>
          <span class="new-price">${escapeHtml(product.newPrice)}</span>
        </div>
        <div class="buy-btn">Comprar Agora</div>
      </div>
    </a>
  `;
}

function initStoreFromCurrentPage() {
  const defaults = getDefaultProducts();
  if (!localStorage.getItem(STORAGE_KEY)) saveProducts(defaults);
  return loadProducts(defaults);
}

async function initMainPage() {
  const grid = document.querySelector(".products-grid");
  if (!grid) return;

  const filterButtons = document.querySelectorAll(".filter-btn");
  const searchInput = document.getElementById("searchInput");
  const defaultProducts = getDefaultProducts();
  if (!localStorage.getItem(STORAGE_KEY)) saveProducts(defaultProducts);
  await seedProductsIfEmpty(defaultProducts);
  const products = await fetchProducts(defaultProducts);
  let activeFilter = "all";
  let searchTerm = "";

  function renderProducts() {
    const filtered = products.filter((product) => {
      const matchesFilter = activeFilter === "all" || product.category === activeFilter;
      const matchesSearch = normalize(product.title).includes(normalize(searchTerm));
      return matchesFilter && matchesSearch;
    });

    grid.innerHTML = filtered.length
      ? filtered.map(productTemplate).join("")
      : '<div class="empty-products">Nenhum produto encontrado.</div>';
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      activeFilter = button.dataset.filter;
      renderProducts();
    });
  });

  searchInput?.addEventListener("keyup", () => {
    searchTerm = searchInput.value;
    renderProducts();
  });

  renderProducts();
}

function isAdminLogged() {
  return sessionStorage.getItem(AUTH_KEY) === "true";
}

function setAdminLogged(value) {
  if (value) sessionStorage.setItem(AUTH_KEY, "true");
  else sessionStorage.removeItem(AUTH_KEY);
}

async function hasSupabaseSession() {
  if (!db) return false;
  const { data } = await db.auth.getSession();
  return Boolean(data.session);
}

async function initAdminPage() {
  const adminApp = document.querySelector("#adminApp");
  if (!adminApp) return;

  let products = [];

  function renderLogin(message = "") {
    adminApp.innerHTML = `
      <section class="admin-screen">
        <form class="admin-login" id="adminLoginForm">
          <span class="admin-kicker">Área restrita</span>
          <h1>Painel Admin</h1>
          <p>Entre para gerenciar os produtos da Achadinhos que Amo.</p>
          ${db ? "" : '<strong class="admin-warning">Configure o Supabase antes de publicar o painel.</strong>'}
          <label>
            Login
            <input id="adminUser" type="text" autocomplete="username" required>
          </label>
          <label>
            Senha
            <input id="adminPass" type="password" autocomplete="current-password" required>
          </label>
          <button type="submit">Entrar</button>
          <small class="admin-error">${escapeHtml(message)}</small>
          <a href="../index.html">Voltar para o site</a>
        </form>
      </section>
    `;

    document.querySelector("#adminLoginForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const user = document.querySelector("#adminUser").value.trim();
      const pass = document.querySelector("#adminPass").value.trim();

      if (!db) {
        renderLogin("Supabase ainda nao foi configurado.");
        return;
      }

      if (user !== ADMIN_LOGIN) {
        renderLogin("Login ou senha incorretos.");
        return;
      }

      const { error } = await db.auth.signInWithPassword({
        email: adminLoginToEmail(user),
        password: pass,
      });

      if (error) renderLogin("Login ou senha incorretos.");
      else {
        setAdminLogged(true);
        await renderPanel();
      }
    });
  }

  function resetForm() {
    document.querySelector("#productId").value = "";
    document.querySelector("#productForm").reset();
    document.querySelector("#formTitle").textContent = "Adicionar produto";
    document.querySelector("#submitProduct").textContent = "Salvar produto";
  }

  function fillForm(product) {
    document.querySelector("#productId").value = product.id;
    document.querySelector("#title").value = product.title;
    document.querySelector("#marketplace").value = product.marketplace;
    document.querySelector("#category").value = product.category || product.tag || "Lifestyle";
    document.querySelector("#discount").value = product.discount;
    document.querySelector("#oldPrice").value = product.oldPrice;
    document.querySelector("#newPrice").value = product.newPrice;
    document.querySelector("#image").value = product.image;
    document.querySelector("#link").value = product.link;
    document.querySelector("#formTitle").textContent = "Editar produto";
    document.querySelector("#submitProduct").textContent = "Atualizar produto";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getFormProduct() {
    const id = document.querySelector("#productId").value;
    const title = document.querySelector("#title").value.trim();
    return {
      id: id || `${slugify(title)}-${Date.now().toString(36)}`,
      title,
      marketplace: document.querySelector("#marketplace").value,
      category: document.querySelector("#category").value,
      tag: document.querySelector("#category").value,
      discount: document.querySelector("#discount").value.trim(),
      oldPrice: document.querySelector("#oldPrice").value.trim(),
      newPrice: document.querySelector("#newPrice").value.trim(),
      image: document.querySelector("#image").value.trim(),
      link: document.querySelector("#link").value.trim(),
    };
  }

  function renderList() {
    const list = document.querySelector("#adminProductsList");
    document.querySelector("#adminTotal").textContent = `${products.length} produto${products.length === 1 ? "" : "s"}`;

    list.innerHTML = products.map((product) => `
      <article class="admin-product-item" data-id="${escapeHtml(product.id)}">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}">
        <div>
          <strong>${escapeHtml(product.title)}</strong>
          <span>${escapeHtml(product.category || product.tag)} • ${escapeHtml(product.marketplace)} • ${escapeHtml(product.newPrice)}</span>
        </div>
        <div class="admin-item-actions">
          <button type="button" data-action="edit">Editar</button>
          <button type="button" data-action="delete" class="danger">Excluir</button>
        </div>
      </article>
    `).join("");
  }

  async function loadAdminProducts() {
    products = await fetchProducts([]);
  }

  async function renderPanel() {
    await loadAdminProducts();
    const categoryOptions = CATEGORIES.map((category) => `<option>${escapeHtml(category)}</option>`).join("");

    adminApp.innerHTML = `
      <header class="admin-topbar">
        <div>
          <span class="admin-kicker">Achadinhos que Amo</span>
          <h1>Painel Admin</h1>
        </div>
        <div class="admin-topbar-actions">
          <a href="../index.html">Ver site</a>
          <button type="button" id="logoutAdmin">Sair</button>
        </div>
      </header>

      <main class="admin-panel-page">
        <form class="admin-product-form" id="productForm">
          <input id="productId" type="hidden">
          <h2 id="formTitle">Adicionar produto</h2>
          <label>Título<input id="title" type="text" required></label>
          <label>Loja do link
            <select id="marketplace" required>
              <option>Shopee</option>
              <option>Shein</option>
              <option>Mercado Livre</option>
              <option>Amazon</option>
            </select>
          </label>
          <label>Categoria
            <select id="category" required>
              ${categoryOptions}
            </select>
          </label>
          <label>Desconto<input id="discount" type="text" placeholder="-40%" required></label>
          <label>Preço antigo<input id="oldPrice" type="text" placeholder="R$ 99,90" required></label>
          <label>Preço atual<input id="newPrice" type="text" placeholder="R$ 49,90" required></label>
          <label class="span-2">URL da imagem<input id="image" type="url" placeholder="https://..." required></label>
          <label class="span-2">Link afiliado<input id="link" type="url" placeholder="https://..." required></label>
          <div class="admin-form-actions span-2">
            <button type="submit" id="submitProduct">Salvar produto</button>
            <button type="button" id="clearForm">Limpar</button>
          </div>
        </form>

        <section class="admin-products-box">
          <div class="admin-list-title">
            <h2>Produtos cadastrados</h2>
            <span id="adminTotal"></span>
          </div>
          <div id="adminProductsList" class="admin-products-list"></div>
        </section>
      </main>
    `;

    document.querySelector("#logoutAdmin").addEventListener("click", async () => {
      if (db) await db.auth.signOut();
      setAdminLogged(false);
      renderLogin();
    });

    document.querySelector("#clearForm").addEventListener("click", resetForm);

    document.querySelector("#productForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const product = getFormProduct();
      const index = products.findIndex((item) => item.id === product.id);

      if (db) {
        const payload = toDbProduct(product, index >= 0 ? products[index].sortOrder : 0);
        const response = index >= 0
          ? await db.from("products").update(payload).eq("id", product.id)
          : await db.from("products").insert(payload);

        if (response.error) {
          alert(`Erro ao salvar: ${response.error.message}`);
          return;
        }

        await loadAdminProducts();
      } else {
        if (index >= 0) products[index] = product;
        else products = [product, ...products];
        saveProducts(products);
      }

      resetForm();
      renderList();
    });

    document.querySelector("#adminProductsList").addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const id = button.closest(".admin-product-item").dataset.id;
      const product = products.find((item) => item.id === id);

      if (button.dataset.action === "edit" && product) fillForm(product);

      if (button.dataset.action === "delete" && product && confirm(`Excluir "${product.title}"?`)) {
        if (db) {
          const { error } = await db.from("products").delete().eq("id", id);
          if (error) {
            alert(`Erro ao excluir: ${error.message}`);
            return;
          }
          await loadAdminProducts();
        } else {
          products = products.filter((item) => item.id !== id);
          saveProducts(products);
        }
        renderList();
      }
    });

    renderList();
  }

  if (isAdminLogged() && await hasSupabaseSession()) await renderPanel();
  else renderLogin();
}

initMainPage();
initAdminPage();
