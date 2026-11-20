guard("admin");
adminNav("coupons");

let n = 5, p = 1, eid = "", a = [];

function disc(x) {
  return x.type == "pct" ? x.val + "%" : rupee(x.val);
}

function expired(x) {
  return x.exp && x.exp < new Date();
}

function status(x) {
  if (expired(x)) return `<span class="tag off">Expired</span>`;
  return `<span class="tag ${x.active ? "on" : "off"}">${x.active ? "Active" : "Inactive"}</span>`;
}

function ymd(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function load() {
  db.query({
    from: [{ collectionId: "coupons" }],
    orderBy: [{ field: { fieldPath: "code" }, direction: "ASCENDING" }],
    offset: (p - 1) * n,
    limit: n + 1
  })
    .then(r => {
      $("#prev").prop("disabled", p == 1);
      $("#next").prop("disabled", r.length <= n);
      $("#pg").text("Page " + p);
      a = r.slice(0, n);
      $("#rows").html(a.length ? a.map((x, i) => `
        <tr>
          <td>${(p - 1) * n + i + 1}</td>
          <td><b>${esc(x.code)}</b></td>
          <td>${disc(x)}</td>
          <td>${rupee(x.minAmt)}</td>
          <td>${x.exp ? x.exp.toLocaleDateString("en-IN") : "No expiry"}</td>
          <td>${status(x)}</td>
          <td>
            <button class="btn sm ed" data-id="${x.id}">Edit</button>
            <button class="btn sm grey tg" data-id="${x.id}">${x.active ? "Deactivate" : "Activate"}</button>
            <button class="btn sm red dl" data-id="${x.id}">Delete</button>
          </td>
        </tr>`).join("") : `<tr><td colspan="7">No coupons yet</td></tr>`);
    })
    .fail(e => msg(errText(e)));
}

function reset() {
  eid = "";
  $("#frm")[0].reset();
  $("#code").prop("readonly", false);
  $("#cancel").hide();
  $("#ttl").text("Add Coupon");
  $("#btn").text("Add").data("t", "Add");
  $("#vlabel").text("Discount (%)");
  $(".fe").text("");
}

function find(id) {
  return a.find(x => x.id == id);
}

$("#type").change(function () {
  $("#vlabel").text(this.value == "pct" ? "Discount (%)" : "Discount amount (₹)");
});

$("#frm").submit(function (e) {
  e.preventDefault();
  let c = $("#code").val().trim().toUpperCase();
  let t = $("#type").val();
  let v = $("#val").val().trim();
  let m = $("#min").val().trim();
  let x = $("#exp").val();
  let ok = [
    chk("code", /^[A-Z0-9]{4,15}$/.test(c), "4 to 15 letters or numbers, no spaces"),
    chk("val", t == "pct" ? /^\d{1,2}$/.test(v) && +v >= 1 && +v <= 90 : /^\d{1,6}$/.test(v) && +v > 0,
      t == "pct" ? "Whole number from 1 to 90" : "Whole number above 0"),
    chk("min", /^\d{1,7}$/.test(m), "Whole number, 0 or more"),
    chk("exp", !x || new Date(x + "T23:59:59") >= new Date(), "Expiry cannot be in the past")
  ];
  if (!ok.every(z => z)) return;
  if (!chk("min", t == "pct" || +m > +v, "For flat discount, minimum order must be more than the discount")) return;
  let d = {
    type: t,
    val: +v,
    minAmt: +m,
    exp: x ? new Date(x + "T23:59:59") : null
  };
  busy(true);
  let req;
  if (eid) req = db.upd("coupons", eid, d);
  else {
    d.code = c;
    d.active = true;
    d.createdAt = new Date();
    req = db.create("coupons", c, d);
  }
  req
    .then(() => {
      msg(eid ? "Coupon " + eid + " updated" : "Coupon " + c + " added", true);
      reset();
      load();
    })
    .fail(e => {
      let r = e.responseJSON;
      if (Array.isArray(r)) r = r[0];
      msg(r && r.error && r.error.status == "ALREADY_EXISTS" ? "Coupon " + c + " already exists" : errText(e));
    })
    .always(() => busy(false));
});

$("#cancel").click(reset);

$("#rows").on("click", ".ed", function () {
  let x = find($(this).data("id"));
  eid = x.id;
  $("#code").val(x.code).prop("readonly", true);
  $("#type").val(x.type).change();
  $("#val").val(x.val);
  $("#min").val(x.minAmt);
  $("#exp").val(x.exp ? ymd(x.exp) : "");
  $("#cancel").show();
  $("#ttl").text("Edit Coupon");
  $("#btn").text("Update").data("t", "Update");
  $(".fe").text("");
  msg("");
  $("html, body").animate({ scrollTop: 0 }, 300);
});

$("#rows").on("click", ".tg", function () {
  let x = find($(this).data("id"));
  db.upd("coupons", x.id, { active: !x.active })
    .then(() => {
      msg(x.code + " " + (x.active ? "deactivated" : "activated"), true);
      load();
    })
    .fail(e => msg(errText(e)));
});

$("#rows").on("click", ".dl", function () {
  let x = find($(this).data("id"));
  ask("Delete coupon " + x.code + "?")
    .then(() => db.del("coupons", x.id))
    .then(() => {
      msg("Coupon deleted", true);
      if (a.length == 1 && p > 1) p--;
      if (eid == x.id) reset();
      load();
    })
    .fail(e => msg(errText(e)));
});

$("#prev").click(() => { p--; load(); });
$("#next").click(() => { p++; load(); });

load();
