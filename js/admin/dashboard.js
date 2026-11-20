guard("admin");
adminNav("dashboard");

const LOW = 15;
let now = new Date(), first = new Date(now.getFullYear(), now.getMonth(), 1);

const K = [
  { id: "cat", t: "Categories", link: "categories.html" },
  { id: "inv", t: "Products", link: "inventory.html" },
  { id: "low", t: "Low stock items (under " + LOW + ")", link: "reports.html" },
  { id: "cus", t: "Customers", link: "customers.html" },
  { id: "cr", t: "Credit outstanding", link: "customers.html" },
  { id: "ord", t: "Orders this month", link: "reports.html" },
  { id: "sal", t: "Sales this month", link: "reports.html" }
];

function q(c, w) {
  let o = { from: [{ collectionId: c }] };
  if (w) o.where = w;
  return o;
}

function set(id, v) {
  $("#k-" + id).text(v);
}

function fail(ids) {
  return e => {
    ids.forEach(id => set(id, "-"));
    msg(errText(e));
  };
}

$("#kpis").html(K.map(k => `<a class="kpi" href="${k.link}"><small>${k.t}</small><b id="k-${k.id}">...</b></a>`).join(""));

db.agg(q("categories"), { n: { count: {} } })
  .then(r => set("cat", r.n))
  .fail(fail(["cat"]));

db.agg(q("inventory"), { n: { count: {} } })
  .then(r => set("inv", r.n))
  .fail(fail(["inv"]));

db.agg(q("inventory", where("qty", "LESS_THAN", LOW)), { n: { count: {} } })
  .then(r => set("low", r.n))
  .fail(fail(["low"]));

db.agg(q("customers"), { n: { count: {} }, s: { sum: { field: { fieldPath: "creditUsed" } } } })
  .then(r => {
    set("cus", r.n);
    set("cr", rupee(r.s));
  })
  .fail(fail(["cus", "cr"]));

db.query(q("orders", where("createdAt", "GREATER_THAN_OR_EQUAL", first)))
  .then(r => {
    set("ord", r.length);
    set("sal", rupee(Math.round(r.reduce((s, o) => s + o.total, 0) * 100) / 100));
  })
  .fail(fail(["ord", "sal"]));
