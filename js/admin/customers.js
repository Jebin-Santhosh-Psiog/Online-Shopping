guard("admin");
adminNav("customers");

const MAXCR = 1000;
let n = 5, p = 1, eid = "", a = [];

function avail(x) {
  return (x.creditLimit || 0) - (x.creditUsed || 0);
}

function render(r, paged) {
  $("#prev").prop("disabled", !paged || p == 1);
  $("#next").prop("disabled", !paged || r.length <= n);
  $("#pg").text(paged ? "Page " + p : "");
  a = r.slice(0, n);
  $("#rows").html(a.length ? a.map((x, i) => `
    <tr>
      <td>${(paged ? (p - 1) * n : 0) + i + 1}</td>
      <td>${esc(x.name)}</td>
      <td>${esc(x.email)}</td>
      <td>${esc(x.mob)}</td>
      <td>${rupee(x.creditLimit || 0)}</td>
      <td>${rupee(x.creditUsed || 0)}</td>
      <td>${rupee(avail(x))}</td>
      <td>
        <button class="btn sm grey vw" data-id="${x.id}">View</button>
        <button class="btn sm ed" data-id="${x.id}">${x.creditLimit ? "Edit limit" : "Set limit"}</button>
        <button class="btn sm red rs" data-id="${x.id}" ${x.creditLimit ? "" : "disabled"}>Reset</button>
      </td>
    </tr>`).join("") : `<tr><td colspan="8">No customers found</td></tr>`);
}

function load() {
  db.query({
    from: [{ collectionId: "customers" }],
    orderBy: [{ field: { fieldPath: "name" }, direction: "ASCENDING" }],
    offset: (p - 1) * n,
    limit: n + 1
  })
    .then(r => render(r, true))
    .fail(e => msg(errText(e)));
}

function find(id) {
  return a.find(x => x.id == id);
}

function hideEdit() {
  eid = "";
  $("#edit").hide();
  $("#e-limit").text("");
}

$("#rows").on("click", ".vw", function () {
  let x = find($(this).data("id"));
  $("#vbody").html(`
    <h3>${esc(x.name)}</h3>
    <table>
      <tr><td>Id</td><td><small>${x.id}</small></td></tr>
      <tr><td>Email</td><td>${esc(x.email)}</td></tr>
      <tr><td>Mobile</td><td>${esc(x.mob)}</td></tr>
      <tr><td>Credit limit</td><td>${rupee(x.creditLimit || 0)}</td></tr>
      <tr><td>Credit used</td><td>${rupee(x.creditUsed || 0)}</td></tr>
      <tr><td>Available</td><td>${rupee(avail(x))}</td></tr>
      <tr><td>Joined</td><td>${x.createdAt ? x.createdAt.toLocaleString("en-IN") : "-"}</td></tr>
    </table>`);
  $("#view").show();
});

$("#rows").on("click", ".ed", function () {
  let x = find($(this).data("id"));
  eid = x.id;
  $("#cname").val(x.name);
  $("#cemail").val(x.email);
  $("#cused").val(x.creditUsed || 0);
  $("#limit").val(x.creditLimit || "");
  $("#e-limit").text("");
  msg("");
  $("#edit").show();
  $("#limit").focus();
  $("html, body").animate({ scrollTop: 0 }, 300);
});

$("#frm").submit(function (e) {
  e.preventDefault();
  let x = find(eid);
  let l = $("#limit").val().trim();
  let u = x.creditUsed || 0;
  let ok = /^\d{1,4}$/.test(l) && +l <= MAXCR;
  if (!chk("limit", ok, "Whole number from 0 to " + MAXCR)) return;
  if (!chk("limit", +l >= u, "Limit cannot be less than credit already used (" + rupee(u) + ")")) return;
  busy(true);
  db.upd("customers", eid, { creditLimit: +l })
    .then(() => {
      msg("Credit limit for " + x.name + " set to " + rupee(+l), true);
      hideEdit();
      load();
    })
    .fail(e => msg(errText(e)))
    .always(() => busy(false));
});

$("#cancel").click(hideEdit);

$("#rows").on("click", ".rs", function () {
  let x = find($(this).data("id"));
  if (x.creditUsed > 0) return msg(x.name + " has used " + rupee(x.creditUsed) + " credit. Cannot reset the limit to 0.");
  ask("Reset credit limit of " + x.name + " to 0?")
    .then(() => db.upd("customers", x.id, { creditLimit: 0 }))
    .then(() => {
      msg("Credit limit reset for " + x.name, true);
      if (eid == x.id) hideEdit();
      load();
    })
    .fail(e => msg(errText(e)));
});

$("#find").click(function () {
  let em = $("#femail").val().trim().toLowerCase();
  if (!em) return msg("Enter an email");
  db.query({
    from: [{ collectionId: "customers" }],
    where: where("email", "EQUAL", em),
    limit: 1
  })
    .then(r => {
      msg(r.length ? "" : "No customer with email " + em);
      render(r, false);
    })
    .fail(e => msg(errText(e)));
});

$("#all").click(() => {
  $("#femail").val("");
  msg("");
  p = 1;
  load();
});

$("#vclose").click(() => $("#view").hide());
$("#prev").click(() => { p--; load(); });
$("#next").click(() => { p++; load(); });

load();
