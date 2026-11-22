guard("admin");
adminNav("inventory");

const NOIMG = "https://placehold.co/300x300?text=No+Image";
const MAXW = 500, MAXB = 5 * 1024 * 1024, MAXLEN = 700000;
let n = 10, p = 1, eid = "", a = [], cats = {}, imgData = "";

function cname(id) {
  return cats[id] ? cats[id].name : "-";
}

function loadCats() {
  return db.list("categories").then(r => {
    cats = {};
    r.sort((x, y) => x.name.localeCompare(y.name));
    r.forEach(x => cats[x.id] = x);
    let o = r.map(x => `<option value="${x.id}">${esc(x.name)}${x.active ? "" : " (inactive)"}</option>`).join("");
    $("#cat").html(`<option value="">Select category</option>` + o);
    $("#fcat").html(`<option value="">All categories</option>` + o);
    if (!r.length) msg("Add a category first (Categories page)");
  });
}

function stockTag(q) {
  if (q < 15) return ` <span class="tag off">Low</span>`;
  if (q > 100) return ` <span class="tag on">High</span>`;
  return "";
}

function load() {
  let c = $("#fcat").val();
  let q = { from: [{ collectionId: "inventory" }], offset: (p - 1) * n, limit: n + 1 };
  if (c) q.where = where("catId", "EQUAL", c);
  else q.orderBy = [{ field: { fieldPath: "title" }, direction: "ASCENDING" }];
  db.query(q)
    .then(r => {
      $("#prev").prop("disabled", p == 1);
      $("#next").prop("disabled", r.length <= n);
      $("#pg").text("Page " + p);
      a = r.slice(0, n);
      $("#rows").html(a.length ? a.map((x, i) => `
        <tr>
          <td>${(p - 1) * n + i + 1}</td>
          <td><img class="thumb" src="${esc(x.img || NOIMG)}" alt="${esc(x.title)}"></td>
          <td>${esc(x.title)}</td>
          <td>${esc(cname(x.catId))}</td>
          <td>${x.qty}${stockTag(x.qty)}</td>
          <td>${rupee(x.price)}</td>
          <td><span class="tag ${x.active ? "on" : "off"}">${x.active ? "Active" : "Inactive"}</span></td>
          <td>
            <button class="btn sm grey vw" data-id="${x.id}">View</button>
            <button class="btn sm ed" data-id="${x.id}">Edit</button>
            <button class="btn sm grey tg" data-id="${x.id}">${x.active ? "Deactivate" : "Activate"}</button>
            <button class="btn sm red dl" data-id="${x.id}">Delete</button>
          </td>
        </tr>`).join("") : `<tr><td colspan="8">No items found</td></tr>`);
    })
    .fail(e => msg(errText(e)));
}

function preview(u) {
  $("#iprev").attr("src", u || NOIMG);
  $("#clrimg").toggle(!!u);
}

function shrink(f) {
  let d = $.Deferred();
  if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) return d.reject("Choose a JPG, PNG, WEBP or GIF image");
  if (f.size > MAXB) return d.reject("Image must be smaller than 5 MB");
  let r = new FileReader();
  r.onload = () => {
    let im = new Image();
    im.onload = () => {
      let k = Math.min(1, MAXW / Math.max(im.width, im.height));
      let c = document.createElement("canvas");
      c.width = Math.round(im.width * k);
      c.height = Math.round(im.height * k);
      let g = c.getContext("2d");
      g.fillStyle = "#fff";
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(im, 0, 0, c.width, c.height);
      d.resolve(c.toDataURL("image/jpeg", 0.8));
    };
    im.onerror = () => d.reject("Could not read this image");
    im.src = r.result;
  };
  r.onerror = () => d.reject("Could not read this file");
  r.readAsDataURL(f);
  return d;
}

function reset() {
  eid = "";
  imgData = "";
  preview("");
  $("#frm")[0].reset();
  $("#idbox, #cancel").hide();
  $("#ttl").text("Add Item");
  $("#btn").text("Add").data("t", "Add");
  $(".fe").text("");
}

function find(id) {
  return a.find(x => x.id == id);
}

function view(x) {
  $("#vbody").html(`
    <img class="big" src="${esc(x.img || NOIMG)}" alt="${esc(x.title)}">
    <h3>${esc(x.title)}</h3>
    <p>${esc(x.des)}</p>
    <table>
      <tr><td>Id</td><td><small>${x.id}</small></td></tr>
      <tr><td>Category</td><td>${esc(cname(x.catId))}</td></tr>
      <tr><td>Quantity</td><td>${x.qty}${stockTag(x.qty)}</td></tr>
      <tr><td>Price</td><td>${rupee(x.price)}</td></tr>
      <tr><td>Status</td><td>${x.active ? "Active" : "Inactive"}</td></tr>
      <tr><td>Created</td><td>${x.createdAt ? x.createdAt.toLocaleString("en-IN") : "-"}</td></tr>
    </table>`);
  $("#view").show();
}

$("#frm").submit(function (e) {
  e.preventDefault();
  let d = {
    catId: $("#cat").val(),
    title: $("#title").val().trim().replace(/\s+/g, " "),
    des: $("#des").val().trim(),
    qty: $("#qty").val().trim(),
    price: $("#price").val().trim(),
    img: imgData || $("#img").val().trim()
  };
  let v = [
    chk("cat", !!d.catId, "Select a category"),
    chk("title", d.title.length >= 2 && d.title.length <= 60, "2 to 60 characters"),
    chk("des", d.des.length >= 5 && d.des.length <= 300, "5 to 300 characters"),
    chk("qty", /^\d{1,5}$/.test(d.qty), "Whole number, 0 or more"),
    chk("price", /^\d{1,7}(\.\d{1,2})?$/.test(d.price) && +d.price > 0, "Amount above 0, max 2 decimals"),
    chk("img", !d.img || (d.img.startsWith("data:image/") ? d.img.length < MAXLEN : /^https?:\/\/\S+$/.test(d.img)),
      d.img.startsWith("data:image/") ? "Image is too large, choose a smaller one" : "Enter a valid http(s) image link")
  ];
  if (!v.every(x => x)) return;
  d.qty = +d.qty;
  d.price = +d.price;
  d.key = d.title.toLowerCase();
  busy(true);
  db.query({
    from: [{ collectionId: "inventory" }],
    where: and(where("catId", "EQUAL", d.catId), where("key", "EQUAL", d.key)),
    limit: 1
  })
    .then(r => {
      if (r.length && r[0].id != eid) return $.Deferred().reject(err("'" + d.title + "' already exists in this category"));
      if (eid) return db.upd("inventory", eid, d);
      d.active = true;
      d.createdAt = new Date();
      return db.add("inventory", d);
    })
    .then(() => {
      msg(eid ? "Item updated" : "Item added", true);
      reset();
      load();
    })
    .fail(e => msg(errText(e)))
    .always(() => busy(false));
});

$("#cancel").click(reset);

$("#file").change(function () {
  let f = this.files[0], el = this;
  if (!f) return;
  shrink(f)
    .then(u => {
      imgData = u;
      $("#img").val("");
      $("#e-img").text("");
      preview(u);
    })
    .fail(m => {
      el.value = "";
      $("#e-img").text(m);
    });
});

$("#img").on("input", function () {
  let u = this.value.trim();
  if (u) {
    imgData = "";
    $("#file").val("");
  }
  preview(u || imgData);
});

$("#clrimg").click(function () {
  imgData = "";
  $("#file").val("");
  $("#img").val("");
  $("#e-img").text("");
  preview("");
});

$("#rows").on("click", ".vw", function () {
  view(find($(this).data("id")));
});

$("#rows").on("click", ".ed", function () {
  let x = find($(this).data("id"));
  eid = x.id;
  $("#iid").val(x.id);
  $("#cat").val(x.catId);
  $("#title").val(x.title);
  $("#des").val(x.des);
  $("#qty").val(x.qty);
  $("#price").val(x.price);
  imgData = x.img && x.img.startsWith("data:image/") ? x.img : "";
  $("#file").val("");
  $("#img").val(imgData ? "" : (x.img || ""));
  preview(x.img);
  $("#idbox, #cancel").show();
  $("#ttl").text("Edit Item");
  $("#btn").text("Update").data("t", "Update");
  $(".fe").text("");
  msg("");
  $("html, body").animate({ scrollTop: 0 }, 300);
});

$("#rows").on("click", ".tg", function () {
  let x = find($(this).data("id"));
  db.upd("inventory", x.id, { active: !x.active })
    .then(() => {
      msg("'" + x.title + "' " + (x.active ? "deactivated" : "activated"), true);
      load();
    })
    .fail(e => msg(errText(e)));
});

$("#rows").on("click", ".dl", function () {
  let x = find($(this).data("id"));
  ask("Delete item '" + x.title + "'?")
    .then(() => db.del("inventory", x.id))
    .then(() => {
      msg("Item deleted", true);
      if (a.length == 1 && p > 1) p--;
      if (eid == x.id) reset();
      load();
    })
    .fail(e => msg(errText(e)));
});

$("#fcat").change(() => { p = 1; load(); });

$("#find").click(function () {
  let id = $("#fid").val().trim();
  if (!id) return msg("Enter an item Id");
  db.get("inventory", id)
    .then(x => { msg(""); view(x); })
    .fail(() => msg("No item found with Id " + id));
});

$("#vclose").click(() => $("#view").hide());

const DJ = "https://dummyjson.com/products";

function pretty(s) {
  return s.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
}

function ilog(t, bad) {
  $("#ilog").append(`<div class="${bad ? "err" : ""}">${esc(t)}</div>`);
  $("#ilog").scrollTop(1e6);
}

function ckey(c) {
  return (c.key || c.name || "").toLowerCase().trim();
}

function chunks(w, n) {
  if (!w.length) return $.Deferred().resolve(n);
  return db.commit(w.slice(0, 400)).then(() => chunks(w.slice(400), n + Math.min(400, w.length)));
}

function importCat(slug, rate, st) {
  return $.ajax({ url: DJ + "/category/" + encodeURIComponent(slug) + "?limit=0" }).then(r => {
    let ps = (r.products || []).filter(x => String(x.title || "").trim().length >= 2);
    if (!ps.length) return { n: 0, s: 0 };
    let nm = pretty(slug), k = nm.toLowerCase(), cid = st.byKey[k], w = [], sk = 0;
    if (!cid) {
      cid = newId();
      w.push({
        update: { name: docName("categories", cid), fields: toFields({ name: nm, key: k, active: true, createdAt: new Date() }) },
        currentDocument: { exists: false }
      });
    }
    ps.forEach(x => {
      let t = String(x.title).trim().replace(/\s+/g, " ").slice(0, 60), tk = t.toLowerCase();
      if (st.have[k + "|" + tk]) { sk++; return; }
      st.have[k + "|" + tk] = 1;
      let d = {
        catId: cid,
        title: t,
        key: tk,
        des: String(x.description || t).trim().slice(0, 300),
        qty: Math.max(0, parseInt(x.stock, 10) || 0),
        price: Math.max(1, Math.round((+x.price || 0) * rate)),
        img: (x.images && x.images[0]) || x.thumbnail || "",
        active: true,
        src: "dummyjson",
        createdAt: new Date()
      };
      w.push({ update: { name: docName("inventory", newId()), fields: toFields(d) }, currentDocument: { exists: false } });
    });
    let n = w.length - (st.byKey[k] ? 0 : 1);
    if (!n) return { n: 0, s: sk };
    return chunks(w, 0).then(() => {
      st.byKey[k] = cid;
      return { n: n, s: sk };
    });
  });
}

function runAll(list, rate, st, tot) {
  if (!list.length) return $.Deferred().resolve(tot);
  let s = list[0];
  ilog("Importing " + pretty(s) + "...");
  return importCat(s, rate, st)
    .then(
      r => {
        $("#ilog div:last").text(pretty(s) + ": " + r.n + " added, " + r.s + " skipped");
        tot.n += r.n;
        tot.s += r.s;
      },
      e => {
        $("#ilog div:last").text(pretty(s) + ": failed. " + errText(e)).addClass("err");
        tot.f++;
        return $.Deferred().resolve();
      }
    )
    .then(() => runAll(list.slice(1), rate, st, tot));
}

function freshState() {
  return $.when(db.list("categories"), db.list("inventory")).then((cs, inv) => {
    let cnt = {}, byKey = {}, have = {}, kOf = {};
    inv.forEach(x => cnt[x.catId] = (cnt[x.catId] || 0) + 1);
    cs.sort((x, y) => (cnt[y.id] || 0) - (cnt[x.id] || 0));
    cs.forEach(c => {
      kOf[c.id] = ckey(c);
      if (!byKey[ckey(c)]) byKey[ckey(c)] = c.id;
    });
    inv.forEach(x => have[(kOf[x.catId] || x.catId) + "|" + (x.key || x.title.toLowerCase())] = 1);
    return { cs: cs, inv: inv, byKey: byKey, have: have, kOf: kOf };
  });
}

function fixDup() {
  return freshState().then(st => {
    let w = [], cats2 = 0, moved = 0, dupItems = 0, seen = {};
    st.inv.forEach(x => {
      let k = st.kOf[x.catId];
      if (!k) return;
      let keep = st.byKey[k], tk = k + "|" + (x.key || x.title.toLowerCase());
      if (x.catId == keep) seen[tk] = seen[tk] || x.id;
    });
    st.inv.forEach(x => {
      let k = st.kOf[x.catId];
      if (!k) return;
      let keep = st.byKey[k], tk = k + "|" + (x.key || x.title.toLowerCase());
      if (x.catId == keep) return;
      if (seen[tk]) {
        w.push({ delete: docName("inventory", x.id) });
        dupItems++;
      } else {
        seen[tk] = x.id;
        w.push({ update: { name: docName("inventory", x.id), fields: toFields({ catId: keep }) }, updateMask: { fieldPaths: ["catId"] } });
        moved++;
      }
    });
    st.cs.forEach(c => {
      if (st.byKey[ckey(c)] != c.id) {
        w.push({ delete: docName("categories", c.id) });
        cats2++;
      }
    });
    return chunks(w, 0).then(() => ({ c: cats2, m: moved, d: dupItems }));
  });
}

$("#iopen").click(function () {
  $("#imp").show();
  if ($("#ilist input").length) return;
  $("#ilist").text("Loading categories from DummyJSON...");
  $.ajax({ url: DJ + "/category-list" })
    .then(r => {
      $("#ilist").html(r.map(s => `<label class="chk"><input type="checkbox" value="${esc(s)}"> ${esc(pretty(s))}</label>`).join(""));
    })
    .fail(() => $("#ilist").text("Could not reach DummyJSON. Check your internet connection and try again."));
});

$("#iall").change(function () {
  $("#ilist input").prop("checked", this.checked);
});

$("#iclose").click(() => $("#imp").hide());

$("#irun").click(function () {
  let sel = $("#ilist input:checked").map((i, x) => x.value).get();
  let rate = +$("#irate").val();
  $("#ilog").html("");
  if (!sel.length) return ilog("Select at least one category", true);
  if (!(rate >= 1 && rate <= 500)) return ilog("Enter a conversion rate from 1 to 500", true);
  let b = $(this).prop("disabled", true).text("Importing...");
  $("#iclose, #ifix").prop("disabled", true);
  freshState()
    .then(st => runAll(sel, rate, st, { n: 0, s: 0, f: 0 }))
    .then(t => {
      ilog("Done: " + t.n + " products added, " + t.s + " skipped" + (t.f ? ", " + t.f + " categories failed" : "") + ".");
      return loadCats();
    })
    .then(() => { p = 1; load(); })
    .fail(e => ilog(errText(e), true))
    .always(() => {
      b.prop("disabled", false).text("Import selected");
      $("#iclose, #ifix").prop("disabled", false);
    });
});

$("#ifix").click(function () {
  let b = $(this);
  ask("Merge duplicate categories? Products move into one category, duplicate products are removed and the extra categories are deleted.")
    .then(() => {
      b.prop("disabled", true).text("Fixing...");
      $("#irun, #iclose").prop("disabled", true);
      $("#ilog").html("");
      return fixDup();
    })
    .then(r => {
      ilog(r.c ? "Fixed: " + r.c + " duplicate categories removed, " + r.m + " products moved, " + r.d + " duplicate products removed." : "No duplicate categories found.");
      return loadCats();
    })
    .then(() => { p = 1; load(); })
    .fail(e => ilog(errText(e), true))
    .always(() => {
      b.prop("disabled", false).text("Fix duplicate categories");
      $("#irun, #iclose").prop("disabled", false);
    });
});

$("#prev").click(() => { p--; load(); });
$("#next").click(() => { p++; load(); });

loadCats().then(load).fail(e => msg(errText(e)));
