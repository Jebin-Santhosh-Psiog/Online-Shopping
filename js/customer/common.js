guard("customer");

const NOIMG = "https://placehold.co/300x300?text=No+Image";
const uid = localStorage.getItem("uid");
const prm = new URLSearchParams(location.search);

function header() {
  $("body").prepend(`
    <header class="top">
      <a href="shop.html" class="brand">Shop<span>Nest</span></a>
      <form class="search" id="sform" action="shop.html">
        <select id="cat" name="c"><option value="">All</option></select>
        <input id="q" name="q" placeholder="Search ShopNest">
        <button>&#128269;</button>
      </form>
      <div class="acc"><small>Hello, ${esc(localStorage.getItem("name") || "Customer")}</small><b><a href="#" onclick="logout()">Sign out</a></b></div>
      <a href="orders.html" class="acc"><small>Returns</small><b>&amp; Orders</b></a>
      <a href="cart.html" class="cart">&#128722; <span id="cnt">0</span> Cart</a>
    </header>
    <div class="catbar" id="catbar"></div>
    <div id="toast"></div>`);
  $("#q").val(prm.get("q") || "");
}

function loadCats() {
  return db.query({
    from: [{ collectionId: "categories" }],
    where: where("active", "EQUAL", true)
  }).then(r => {
    let c = {}, sel = prm.get("c") || "";
    r.sort((x, y) => x.name.localeCompare(y.name));
    r.forEach(x => c[x.id] = x);
    $("#cat").append(r.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join("")).val(sel);
    $("#catbar").html(`<a href="shop.html" class="${sel ? "" : "on"}">All</a>` +
      r.map(x => `<a href="shop.html?c=${x.id}" class="${x.id == sel ? "on" : ""}">${esc(x.name)}</a>`).join(""));
    return c;
  });
}

function getCart() {
  return db.get("carts", uid).then(
    c => c.items || {},
    e => e.status == 404 ? $.Deferred().resolve({}) : $.Deferred().reject(e)
  );
}

function saveCart(m) {
  return db.set("carts", uid, { items: m, updatedAt: new Date() });
}

function count(m) {
  $("#cnt").text(Object.values(m).reduce((s, q) => s + q, 0));
}

function addToCart(x, q) {
  return getCart().then(m => {
    let have = m[x.id] || 0;
    if (have + q > x.qty) {
      return $.Deferred().reject(err("Only " + x.qty + " in stock" + (have ? ", you already have " + have + " in your cart" : "")));
    }
    m[x.id] = have + q;
    return saveCart(m).then(() => {
      count(m);
      return m[x.id];
    });
  });
}

function stock(q) {
  if (!q) return `<div class="stock no">Out of stock</div>`;
  if (q < 10) return `<div class="stock low">Only ${q} left</div>`;
  return `<div class="stock">In stock</div>`;
}

function card(x) {
  return `
    <div class="item">
      <a href="product.html?id=${x.id}"><img src="${esc(x.img || NOIMG)}" alt="${esc(x.title)}"></a>
      <a href="product.html?id=${x.id}"><h4>${esc(x.title)}</h4></a>
      <div class="price">${rupee(x.price)}</div>
      ${stock(x.qty)}
      <button class="btn add" data-id="${x.id}" ${x.qty ? "" : "disabled"}>Add to Cart</button>
    </div>`;
}

function toast(t, ok) {
  $("#toast").text(t).attr("class", ok ? "show ok" : "show bad");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => $("#toast").attr("class", ""), 2500);
}

header();
getCart().then(count);
