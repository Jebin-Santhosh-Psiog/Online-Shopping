let items = {}, lines = [], cp = null, cust = null, cats = {}, code = "";

function sub() {
  return r2(lines.reduce((s, x) => s + x.price * items[x.id], 0));
}

function total() {
  return r2(sub() - (cp ? cp.disc : 0));
}

function avail() {
  return r2((cust.creditLimit || 0) - (cust.creditUsed || 0));
}

function back() {
  location.href = "cart.html";
  return $.Deferred().reject(null);
}

function fetchLines() {
  let ids = Object.keys(items);
  return db.many("inventory", ids).then(r => {
    if (ids.some(id => !r[id] || !r[id].active || r[id].qty < items[id])) return $.Deferred().reject(err("STOCK"));
    lines = ids.map(id => r[id]);
    if (!code) return;
    return checkCoupon(code, sub()).then(x => { cp = x; });
  });
}

function render() {
  let s = sub(), t = total(), a = avail(), k = lines.reduce((n, x) => n + items[x.id], 0);
  $("#cname").val(cust.name);
  $("#cmob").val(cust.mob);
  $("#addr").val(localStorage.getItem("addr") || "");
  $("#pin").val(localStorage.getItem("pin") || "");

  $("#pays").html(`
    <label class="pay"><input type="radio" name="pay" value="cash"> Cash on Delivery</label>
    <label class="pay ${a >= t ? "" : "off"}">
      <input type="radio" name="pay" value="credit" ${a >= t ? "" : "disabled"}>
      ShopNest Credit <small>(available ${rupee(a)} of ${rupee(cust.creditLimit || 0)})</small>
      ${a >= t ? "" : `<small class="err">Not enough credit for this order</small>`}
    </label>`);

  $("#lines").html(lines.map(x => `
    <div class="cline sm">
      <img src="${esc(x.img || NOIMG)}" alt="${esc(x.title)}">
      <div class="cinfo"><h4>${esc(x.title)}</h4><small>${rupee(x.price)} x ${items[x.id]}</small></div>
      <div class="cprice">${rupee(r2(x.price * items[x.id]))}</div>
    </div>`).join(""));

  $("#sum").html(`
    <h3>Order summary</h3>
    <div class="srow"><span>Items (${k})</span><span>${rupee(s)}</span></div>
    ${cp ? `<div class="srow green"><span>Coupon ${esc(cp.code)}</span><span>- ${rupee(cp.disc)}</span></div>` : ""}
    <div class="srow"><span>Delivery</span><span class="green">FREE</span></div>
    <div class="srow tot"><span>Order total</span><span>${rupee(t)}</span></div>
    <button class="btn y" id="btn">Place your order</button>
    <div id="msg"></div>
    <a href="cart.html" class="link">Back to cart</a>`);
}

function order(id, pay) {
  return {
    uid: uid,
    name: cust.name,
    email: cust.email,
    mob: cust.mob,
    addr: $("#addr").val().trim(),
    pin: $("#pin").val().trim(),
    items: lines.map(x => ({
      id: x.id,
      catId: x.catId,
      catName: cats[x.catId] ? cats[x.catId].name : "",
      title: x.title,
      price: x.price,
      qty: items[x.id],
      amt: r2(x.price * items[x.id])
    })),
    count: lines.reduce((n, x) => n + items[x.id], 0),
    sub: sub(),
    coupon: cp ? cp.code : null,
    disc: cp ? cp.disc : 0,
    total: total(),
    payType: pay,
    status: "Placed",
    createdAt: new Date()
  };
}

function writes(id, o) {
  let w = lines.map(x => ({
    transform: {
      document: docName("inventory", x.id),
      fieldTransforms: [{ fieldPath: "qty", increment: toF(-items[x.id]) }]
    },
    currentDocument: { exists: true }
  }));
  if (o.payType == "credit") {
    w.push({
      transform: {
        document: docName("customers", uid),
        fieldTransforms: [{ fieldPath: "creditUsed", increment: toF(o.total) }]
      },
      currentDocument: { exists: true }
    });
  }
  w.push({
    update: { name: docName("orders", id), fields: toFields(o) },
    currentDocument: { exists: false }
  });
  w.push({
    update: { name: docName("carts", uid), fields: toFields({ items: {}, coupon: null, updatedAt: new Date() }) },
    updateMask: { fieldPaths: ["items", "coupon", "updatedAt"] }
  });
  return w;
}

$("#sum").on("click", "#btn", function () {
  let ad = $("#addr").val().trim(), pn = $("#pin").val().trim(), pay = $("input[name=pay]:checked").val();
  let v = [
    chk("addr", ad.length >= 10 && ad.length <= 200, "Enter your full address (10 to 200 characters)"),
    chk("pin", /^[1-9]\d{5}$/.test(pn), "Enter a valid 6 digit pincode"),
    chk("pay", !!pay, "Select a payment method")
  ];
  if (!v.every(x => x)) return msg("Please fix the highlighted fields");
  msg("");
  busy(true);
  let id = "OD" + Date.now() + Math.floor(Math.random() * 90 + 10), o;
  $.when(fetchLines(), db.get("customers", uid))
    .then((a, c) => {
      cust = c;
      if (pay == "credit" && avail() < total()) return $.Deferred().reject(err("Not enough credit. Available " + rupee(avail())));
      o = order(id, pay);
      return db.commit(writes(id, o));
    })
    .then(() => {
      localStorage.setItem("addr", ad);
      localStorage.setItem("pin", pn);
      location.href = "bill.html?id=" + id;
    })
    .fail(e => {
      busy(false);
      let r = e && e.responseJSON;
      if (Array.isArray(r)) r = r[0];
      if (errText(e) == "STOCK" || (r && r.error && r.error.status == "PERMISSION_DENIED")) {
        msg("Some items just went out of stock or your credit changed. Taking you back to the cart...");
        setTimeout(() => location.href = "cart.html", 2500);
      } else msg(errText(e));
    });
});

$.when(cartDoc(), db.get("customers", uid), loadCats())
  .then((d, c, k) => {
    cust = c;
    cats = k;
    items = d.items;
    code = d.coupon;
    if (!Object.keys(items).length) return back();
    return fetchLines().fail(() => back());
  })
  .then(render)
  .fail(e => { if (e) $("#lines").text(errText(e)); });
