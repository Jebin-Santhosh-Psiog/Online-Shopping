guard("admin");
adminNav("categories");

let n = 5, p = 1, eid = "", a = [];

function load() {
  db.query({
    from: [{ collectionId: "categories" }],
    orderBy: [{ field: { fieldPath: "name" }, direction: "ASCENDING" }],
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
          <td><small>${x.id}</small></td>
          <td>${x.name}</td>
          <td><span class="tag ${x.active ? "on" : "off"}">${x.active ? "Active" : "Inactive"}</span></td>
          <td>
            <button class="btn sm ed" data-id="${x.id}">Edit</button>
            <button class="btn sm grey tg" data-id="${x.id}">${x.active ? "Deactivate" : "Activate"}</button>
            <button class="btn sm red dl" data-id="${x.id}">Delete</button>
          </td>
        </tr>`).join("") : `<tr><td colspan="5">No categories yet</td></tr>`);
    })
    .fail(e => msg(errText(e)));
}

function reset() {
  eid = "";
  $("#frm")[0].reset();
  $("#idbox, #cancel").hide();
  $("#ttl").text("Add Category");
  $("#btn").text("Add").data("t", "Add");
  $("#e-name").text("");
}

function find(id) {
  return a.find(x => x.id == id);
}

$("#frm").submit(function (e) {
  e.preventDefault();
  let nm = $("#name").val().trim().replace(/\s+/g, " ");
  if (!chk("name", /^[A-Za-z0-9 &-]{2,30}$/.test(nm), "2 to 30 characters: letters, numbers, space, & or -")) return;
  let k = nm.toLowerCase();
  busy(true);
  db.query({
    from: [{ collectionId: "categories" }],
    where: where("key", "EQUAL", k),
    limit: 1
  })
    .then(r => {
      if (r.length && r[0].id != eid) return $.Deferred().reject(err("Category '" + nm + "' already exists"));
      return eid
        ? db.upd("categories", eid, { name: nm, key: k })
        : db.add("categories", { name: nm, key: k, active: true, createdAt: new Date() });
    })
    .then(() => {
      msg(eid ? "Category updated" : "Category added", true);
      reset();
      load();
    })
    .fail(e => msg(errText(e)))
    .always(() => busy(false));
});

$("#cancel").click(reset);

$("#rows").on("click", ".ed", function () {
  let x = find($(this).data("id"));
  eid = x.id;
  $("#cid").val(x.id);
  $("#name").val(x.name).focus();
  $("#idbox, #cancel").show();
  $("#ttl").text("Edit Category");
  $("#btn").text("Update").data("t", "Update");
  msg("");
});

$("#rows").on("click", ".tg", function () {
  let x = find($(this).data("id"));
  db.upd("categories", x.id, { active: !x.active })
    .then(() => {
      msg("'" + x.name + "' " + (x.active ? "deactivated" : "activated"), true);
      load();
    })
    .fail(e => msg(errText(e)));
});

$("#rows").on("click", ".dl", function () {
  let x = find($(this).data("id"));
  ask("Delete category '" + x.name + "'?")
    .then(() => db.query({
      from: [{ collectionId: "inventory" }],
      where: where("catId", "EQUAL", x.id),
      limit: 1
    }))
    .then(r => {
      if (r.length) return $.Deferred().reject(err("'" + x.name + "' has items in inventory. Deactivate it instead."));
      return db.del("categories", x.id);
    })
    .then(() => {
      msg("Category deleted", true);
      if (a.length == 1 && p > 1) p--;
      if (eid == x.id) reset();
      load();
    })
    .fail(e => msg(errText(e)));
});

$("#prev").click(() => { p--; load(); });
$("#next").click(() => { p++; load(); });

load();
