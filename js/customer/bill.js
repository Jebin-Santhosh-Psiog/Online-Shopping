let id = prm.get("id");

function bill(o) {
  document.title = "Bill " + o.id + " | PsiogKart";
  if (Date.now() - o.createdAt < 120000) $("#done").show();
  $("#bill").html(`
    <div class="bhead">
      <div><div class="blogo">Psiog<span>Kart</span></div><small>Tax Invoice / Bill of Supply</small></div>
      <div class="bmeta">
        <div><b>Bill No:</b> ${esc(o.id)}</div>
        <div><b>Date:</b> ${o.createdAt.toLocaleString("en-IN")}</div>
        <div><b>Status:</b> ${esc(o.status)}</div>
      </div>
    </div>
    <div class="bto">
      <div>
        <b>Billed to</b>
        <div>${esc(o.name)}</div>
        <div>${esc(o.email)} | ${esc(o.mob)}</div>
        <div>${esc(o.addr)} - ${esc(o.pin)}</div>
      </div>
      <div>
        <b>Payment</b>
        <div>${o.payType == "credit" ? "PsiogKart Credit" : "Cash on Delivery"}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Item</th><th>Category</th><th>Price</th><th>Qty</th><th>Amount</th></tr></thead>
      <tbody>
        ${o.items.map((x, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${esc(x.title)}</td>
            <td>${esc(x.catName)}</td>
            <td>${rupee(x.price)}</td>
            <td>${x.qty}</td>
            <td>${rupee(x.amt)}</td>
          </tr>`).join("")}
      </tbody>
    </table>
    <div class="btot">
      <div class="srow"><span>Subtotal (${o.count} items)</span><span>${rupee(o.sub)}</span></div>
      ${o.coupon ? `<div class="srow green"><span>Discount (${esc(o.coupon)})</span><span>- ${rupee(o.disc)}</span></div>` : ""}
      <div class="srow"><span>Delivery</span><span>FREE</span></div>
      <div class="srow tot"><span>Grand total</span><span>${rupee(o.total)}</span></div>
    </div>
    <p class="bnote">${o.payType == "credit" ? rupee(o.total) + " has been charged to your PsiogKart Credit." : "Please pay " + rupee(o.total) + " in cash at the time of delivery."}</p>`);
}

$("#print").click(() => window.print());

if (!id) $("#bill").text("No bill selected.");
else {
  loadCats();
  db.get("orders", id)
    .then(bill)
    .fail(() => $("#bill").html(`Bill not found. <a href="orders.html">See your orders</a>`));
}
