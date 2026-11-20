guard("admin");
adminNav("dashboard");

const LOW = 15;
let now = new Date(), first = new Date(now.getFullYear(), now.getMonth(), 1);

function q(c, w) {
  let o = { from: [{ collectionId: c }] };
  if (w) o.where = w;
  return o;
}

function kpi(t, v, link) {
  return `<a class="kpi" href="${link}"><small>${t}</small><b>${v}</b></a>`;
}

$.when(
  db.agg(q("categories"), { n: { count: {} } }),
  db.agg(q("inventory"), { n: { count: {} } }),
  db.agg(q("inventory", where("qty", "LESS_THAN", LOW)), { n: { count: {} } }),
  db.agg(q("customers"), { n: { count: {} }, s: { sum: { field: { fieldPath: "creditUsed" } } } }),
  db.agg(q("orders", where("createdAt", "GREATER_THAN_OR_EQUAL", first)), { n: { count: {} }, s: { sum: { field: { fieldPath: "total" } } } })
)
  .then((c, i, l, cu, o) => {
    $("#kpis").html(
      kpi("Categories", c.n, "categories.html") +
      kpi("Products", i.n, "inventory.html") +
      kpi("Low stock items (under " + LOW + ")", l.n, "reports.html") +
      kpi("Customers", cu.n, "customers.html") +
      kpi("Credit outstanding", rupee(cu.s), "customers.html") +
      kpi("Orders this month", o.n, "reports.html") +
      kpi("Sales this month", rupee(o.s), "reports.html")
    );
  })
  .fail(e => {
    $("#kpis").text("");
    msg(errText(e));
  });
