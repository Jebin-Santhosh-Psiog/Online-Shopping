guard("admin");
adminNav("inventory");

const NOIMG = "https://placehold.co/300x300?text=No+Image";
let n = 5, p = 1, eid = "", a = [], cats = {};

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

function reset() {
  eid = "";
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
    img: $("#img").val().trim()
  };
  let v = [
    chk("cat", !!d.catId, "Select a category"),
    chk("title", d.title.length >= 2 && d.title.length <= 60, "2 to 60 characters"),
    chk("des", d.des.length >= 5 && d.des.length <= 300, "5 to 300 characters"),
    chk("qty", /^\d{1,5}$/.test(d.qty), "Whole number, 0 or more"),
    chk("price", /^\d{1,7}(\.\d{1,2})?$/.test(d.price) && +d.price > 0, "Amount above 0, max 2 decimals"),
    chk("img", !d.img || /^https?:\/\/\S+$/.test(d.img), "Enter a valid http(s) URL")
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
  $("#img").val(x.img);
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

$("#prev").click(() => { p--; load(); });
$("#next").click(() => { p++; load(); });

loadCats().then(load).fail(e => msg(errText(e)));
