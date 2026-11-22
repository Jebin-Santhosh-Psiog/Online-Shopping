let items = {}, lines = [], cp = null;

function sub() {
  return r2(lines.reduce((s, x) => s + x.price * items[x.id], 0));
}

function units() {
  return lines.reduce((s, x) => s + items[x.id], 0);
}

function note(t) {
  $("#notes").append(`<div class="note">${esc(t)}</div>`);
}

function line(x) {
  let q = items[x.id], m = Math.min(x.qty, 10), o = "";
  for (let i = 1; i <= Math.max(m, q); i++) o += `<option ${i == q ? "selected" : ""}>${i}</option>`;
  return `
    <div class="cline">
      <a href="product.html?id=${x.id}"><img src="${esc(x.img || NOIMG)}" alt="${esc(x.title)}"></a>
      <div class="cinfo">
        <a href="product.html?id=${x.id}"><h4>${esc(x.title)}</h4></a>
        ${stock(x.qty)}
        <div class="cact">
          <label>Qty
            <select class="cq" data-id="${x.id}">${o}</select>
          </label>
          <a href="#" class="rm" data-id="${x.id}">Delete</a>
        </div>
      </div>
      <div class="cprice">${rupee(r2(x.price * q))}<small>${rupee(x.price)} each</small></div>
    </div>`;
}

function render() {
  count(items);
  if (!lines.length) {
    $("#lines").html(`<div class="empty">Your PsiogKart cart is empty.<br><a href="shop.html" class="btn y">Continue shopping</a></div>`);
    $("#sum").hide();
    return;
  }
  let s = sub(), d = cp ? cp.disc : 0, k = units();
  $("#lines").html(lines.map(line).join(""));
  $("#sum").show().html(`
    <div class="srow"><span>Subtotal (${k} item${k == 1 ? "" : "s"})</span><span>${rupee(s)}</span></div>
    ${cp ? `
      <div class="srow green">
        <span>Coupon <b>${esc(cp.code)}</b> (${cp.type == "pct" ? cp.val + "%" : rupee(cp.val)} off) <a href="#" id="rmc">Remove</a></span>
        <span>- ${rupee(d)}</span>
      </div>` : `
      <div class="cpn">
        <input id="code" placeholder="Coupon code" maxlength="15">
        <button class="btn grey" id="apply">Apply</button>
      </div>
      <small class="fe" id="e-code"></small>`}
    <div class="srow tot"><span>Total</span><span>${rupee(r2(s - d))}</span></div>
    <a href="checkout.html" class="btn y go">Proceed to Checkout</a>`);
}

function recheck() {
  if (!cp) return render();
  checkCoupon(cp.code, sub())
    .then(c => { cp = c; })
    .fail(e => {
      toast("Coupon removed: " + errText(e));
      cp = null;
      setCoupon(null);
    })
    .always(render);
}

function load() {
  cartDoc()
    .then(d => {
      items = d.items;
      let ids = Object.keys(items);
      if (!ids.length) return d;
      return db.many("inventory", ids).then(r => {
        let chg = false;
        lines = [];
        ids.forEach(id => {
          let x = r[id];
          if (!x || !x.active || !x.qty) {
            note((x ? x.title : "An item") + " is no longer available and was removed from your cart.");
            delete items[id];
            chg = true;
            return;
          }
          if (items[id] > x.qty) {
            note("Only " + x.qty + " of " + x.title + " available. Quantity updated.");
            items[id] = x.qty;
            chg = true;
          }
          lines.push(x);
        });
        return (chg ? saveCart(items) : $.Deferred().resolve()).then(() => d);
      });
    })
    .then(d => {
      if (!d.coupon || !lines.length) return render();
      checkCoupon(d.coupon, sub())
        .then(c => { cp = c; })
        .fail(e => {
          note("Coupon removed: " + errText(e));
          setCoupon(null);
        })
        .always(render);
    })
    .fail(e => $("#lines").text(errText(e)));
}

$("#lines").on("change", ".cq", function () {
  let id = $(this).data("id");
  items[id] = +this.value;
  saveCart(items)
    .then(recheck)
    .fail(e => toast(errText(e)));
});

$("#lines").on("click", ".rm", function (e) {
  e.preventDefault();
  let id = $(this).data("id");
  let x = lines.find(i => i.id == id);
  delete items[id];
  lines = lines.filter(i => i.id != id);
  saveCart(items)
    .then(() => {
      toast(x.title + " removed from cart", true);
      recheck();
    })
    .fail(e2 => toast(errText(e2)));
});

$("#sum").on("click", "#apply", function () {
  let b = $(this).prop("disabled", true);
  checkCoupon($("#code").val(), sub())
    .then(c => {
      cp = c;
      return setCoupon(c.code);
    })
    .then(() => {
      toast("Coupon " + cp.code + " applied. You save " + rupee(cp.disc), true);
      render();
    })
    .fail(e => {
      cp = null;
      $("#e-code").text(errText(e));
      b.prop("disabled", false);
    });
});

$("#sum").on("keyup", "#code", function (e) {
  if (e.key == "Enter") $("#apply").click();
});

$("#sum").on("click", "#rmc", function (e) {
  e.preventDefault();
  cp = null;
  setCoupon(null)
    .then(() => {
      toast("Coupon removed", true);
      render();
    })
    .fail(e2 => toast(errText(e2)));
});

load();
