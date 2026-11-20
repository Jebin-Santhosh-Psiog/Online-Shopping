let id = prm.get("id"), x = null, rel = [];

function none() {
  $("#pd").html(`<div class="empty">This product is not available. <a href="shop.html">Continue shopping</a></div>`);
}

function show(c) {
  document.title = x.title + " | ShopNest";
  $("#crumb").html(`<a href="shop.html">All</a> &rsaquo; <a href="shop.html?c=${x.catId}">${esc(c.name)}</a> &rsaquo; ${esc(x.title)}`);
  let m = Math.min(x.qty, 10), o = "";
  for (let i = 1; i <= m; i++) o += `<option>${i}</option>`;
  $("#pd").html(`
    <div class="pimg"><img src="${esc(x.img || NOIMG)}" alt="${esc(x.title)}"></div>
    <div class="pinfo">
      <h1>${esc(x.title)}</h1>
      <a href="shop.html?c=${x.catId}">${esc(c.name)}</a>
      <div class="pprice">${rupee(x.price)}</div>
      ${stock(x.qty)}
      <p class="pdes">${esc(x.des)}</p>
      ${x.qty ? `
        <label for="pq">Quantity</label>
        <select id="pq" class="qsel">${o}</select>
        <div>
          <button class="btn y" id="add">Add to Cart</button>
          <button class="btn o" id="buy">Buy Now</button>
        </div>` : ""}
    </div>`);
}

function add() {
  return addToCart(x, +$("#pq").val());
}

$("#pd").on("click", "#add", function () {
  let b = $(this).prop("disabled", true);
  add()
    .then(c => toast("Added to cart (" + c + " in cart)", true))
    .fail(e => toast(errText(e)))
    .always(() => b.prop("disabled", false));
});

$("#pd").on("click", "#buy", function () {
  let b = $(this).prop("disabled", true);
  add()
    .then(() => location.href = "cart.html")
    .fail(e => {
      toast(errText(e));
      b.prop("disabled", false);
    });
});

$("#grid").on("click", ".add", function () {
  let r = rel.find(i => i.id == $(this).data("id"));
  addToCart(r, 1)
    .then(c => toast("Added to cart (" + c + " in cart)", true))
    .fail(e => toast(errText(e)));
});

if (!id) none();
else {
  $.when(loadCats(), db.get("inventory", id))
    .then((c, r) => {
      x = r;
      if (!x.active || !c[x.catId]) return none();
      show(c[x.catId]);
      return db.query({
        from: [{ collectionId: "inventory" }],
        where: and(where("catId", "EQUAL", x.catId), where("active", "EQUAL", true)),
        limit: 5
      }).then(r2 => {
        rel = r2.filter(i => i.id != x.id).slice(0, 4);
        if (!rel.length) return;
        $("#rel").show();
        $("#grid").html(rel.map(card).join(""));
      });
    })
    .fail(none);
}
