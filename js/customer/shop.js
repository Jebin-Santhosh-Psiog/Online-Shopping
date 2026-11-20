let n = 8, p = 1, all = [], list = [], cats = {};
let qc = prm.get("c") || "";
let qq = (prm.get("q") || "").trim().toLowerCase();

function banner() {
  return db.query({
    from: [{ collectionId: "coupons" }],
    where: where("active", "EQUAL", true)
  }).then(r => {
    let x = r.find(c => !c.exp || c.exp > new Date());
    if (!x) return;
    $("#btitle").text(x.type == "pct" ? "Flat " + x.val + "% off" : rupee(x.val) + " off");
    $("#btext").text("Use code " + x.code + (x.minAmt ? " on orders above " + rupee(x.minAmt) : " on any order"));
    $("#banner").show();
  });
}

function apply() {
  let w = qq.split(/\s+/).filter(Boolean);
  list = all.filter(x =>
    cats[x.catId] &&
    (!qc || x.catId == qc) &&
    w.every(k => (x.title + " " + x.des).toLowerCase().includes(k)));
  let s = $("#sort").val();
  if (s == "lo") list.sort((a, b) => a.price - b.price);
  if (s == "hi") list.sort((a, b) => b.price - a.price);
  if (s == "new") list.sort((a, b) => b.createdAt - a.createdAt);
  if (!s) list.sort((a, b) => (b.qty > 0) - (a.qty > 0) || a.title.localeCompare(b.title));
  let t = qq ? `Results for "${esc(qq)}"` : qc && cats[qc] ? esc(cats[qc].name) : "All products";
  if (qq && qc && cats[qc]) t += " in " + esc(cats[qc].name);
  $("#rtitle").html(`<b>${t}</b> <small>(${list.length} item${list.length == 1 ? "" : "s"})</small>`);
  p = 1;
  render();
}

function render() {
  let pages = Math.ceil(list.length / n) || 1;
  let a = list.slice((p - 1) * n, p * n);
  $("#grid").html(a.length ? a.map(card).join("") : `<div class="empty">No products found. Try another search or category.</div>`);
  $("#pg").text(p + " / " + pages);
  $("#prev").prop("disabled", p == 1);
  $("#next").prop("disabled", p >= pages);
}

$("#grid").on("click", ".add", function () {
  let x = all.find(i => i.id == $(this).data("id"));
  let b = $(this).prop("disabled", true);
  addToCart(x, 1)
    .then(c => toast("Added to cart (" + c + " in cart)", true))
    .fail(e => toast(errText(e)))
    .always(() => b.prop("disabled", false));
});

$("#sort").change(apply);
$("#prev").click(() => { p--; render(); window.scrollTo(0, 0); });
$("#next").click(() => { p++; render(); window.scrollTo(0, 0); });

$.when(
  loadCats(),
  db.query({ from: [{ collectionId: "inventory" }], where: where("active", "EQUAL", true) })
)
  .then((c, r) => {
    cats = c;
    all = r;
    apply();
  })
  .fail(e => $("#rtitle").text(errText(e)));

banner();
