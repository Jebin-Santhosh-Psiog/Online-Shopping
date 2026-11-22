let n = 5, p = 1, all = [];

function ord(o) {
  return `
    <div class="card ord">
      <div class="ohead">
        <div><small>ORDER PLACED</small><b>${o.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</b></div>
        <div><small>TOTAL</small><b>${rupee(o.total)}</b></div>
        <div><small>PAYMENT</small><b>${o.payType == "credit" ? "PsiogKart Credit" : "Cash on Delivery"}</b></div>
        <div class="oid"><small>ORDER # ${esc(o.id)}</small><a href="bill.html?id=${o.id}">View bill</a></div>
      </div>
      <div class="obody">
        <span class="tag on">${esc(o.status)}</span>
        ${o.coupon ? `<span class="tag cp">${esc(o.coupon)} saved ${rupee(o.disc)}</span>` : ""}
        ${o.items.map(x => `
          <div class="oitem">
            <a href="product.html?id=${x.id}">${esc(x.title)}</a>
            <span>${x.qty} x ${rupee(x.price)}</span>
            <b>${rupee(x.amt)}</b>
          </div>`).join("")}
      </div>
    </div>`;
}

function render() {
  let pages = Math.ceil(all.length / n) || 1;
  let a = all.slice((p - 1) * n, p * n);
  $("#list").html(a.length ? a.map(ord).join("") :
    `<div class="card empty">You have not placed any orders yet.<br><a href="shop.html" class="btn y">Start shopping</a></div>`);
  $("#pg").text(p + " / " + pages);
  $("#prev").prop("disabled", p == 1);
  $("#next").prop("disabled", p >= pages);
}

$("#prev").click(() => { p--; render(); window.scrollTo(0, 0); });
$("#next").click(() => { p++; render(); window.scrollTo(0, 0); });

loadCats();

db.get("customers", uid).then(c => {
  let l = c.creditLimit || 0, u = c.creditUsed || 0;
  $("#credit").html(l
    ? `PsiogKart Credit: used <b>${rupee(u)}</b> of <b>${rupee(l)}</b>, available <b>${rupee(r2(l - u))}</b>`
    : "PsiogKart Credit is not enabled for your account. Pay by Cash on Delivery.");
});

db.query({
  from: [{ collectionId: "orders" }],
  where: where("uid", "EQUAL", uid)
})
  .then(r => {
    all = r.sort((a, b) => b.createdAt - a.createdAt);
    render();
  })
  .fail(e => $("#list").text(errText(e)));
