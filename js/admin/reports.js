guard("admin");
adminNav("reports");

const HIGH = 100, LOW = 15;
let last = null, key = "";

function r2(v) {
  return Math.round(v * 100) / 100;
}

function ymd(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function range() {
  return { f: new Date($("#from").val() + "T00:00:00"), t: new Date($("#to").val() + "T23:59:59.999") };
}

function catMap() {
  return db.list("categories").then(r => {
    let m = {};
    r.forEach(x => m[x.id] = x.name);
    return m;
  });
}

function orders() {
  let r = range();
  return db.query({
    from: [{ collectionId: "orders" }],
    where: and(
      where("createdAt", "GREATER_THAN_OR_EQUAL", r.f),
      where("createdAt", "LESS_THAN_OR_EQUAL", r.t)
    ),
    orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }]
  });
}

function sumOf(a, f) {
  return r2(a.reduce((s, x) => s + f(x), 0));
}

function byCustomer(os) {
  let m = {};
  os.forEach(o => {
    let c = m[o.uid] || (m[o.uid] = { uid: o.uid, name: o.name, email: o.email, orders: 0, items: 0, amt: 0 });
    c.orders++;
    c.items += o.count;
    c.amt = r2(c.amt + o.total);
  });
  return Object.values(m);
}

function byItem(os) {
  let m = {};
  os.forEach(o => o.items.forEach(x => {
    let i = m[x.id] || (m[x.id] = { id: x.id, title: x.title, cat: x.catName, units: 0, amt: 0 });
    i.units += x.qty;
    i.amt = r2(i.amt + x.amt);
  }));
  return m;
}

const C = {
  rank: { h: "Rank", v: (r, i) => i + 1 },
  name: { h: "Customer", v: r => r.name },
  email: { h: "Email", v: r => r.email },
  orders: { h: "Orders", v: r => r.orders },
  items: { h: "Items", v: r => r.items },
  amt: { h: "Amount", v: r => r.amt, m: 1 },
  title: { h: "Item", v: r => r.title },
  cat: { h: "Category", v: r => r.cat },
  qty: { h: "Qty", v: r => r.qty },
  price: { h: "Price", v: r => r.price, m: 1 },
  value: { h: "Stock value", v: r => r2(r.qty * r.price), m: 1 },
  status: { h: "Status", v: r => r.active ? "Active" : "Inactive" },
  units: { h: "Units sold", v: r => r.units },
  sales: { h: "Sales", v: r => r.amt, m: 1 }
};

function custPay(t) {
  return () => $.when(orders(), db.list("customers")).then((os, cs) => {
    let cm = {};
    cs.forEach(c => cm[c.id] = c);
    let f = os.filter(o => o.payType == t);
    let rows = byCustomer(f).sort((a, b) => b.amt - a.amt);
    let cols = [C.rank, C.name, C.email, C.orders, C.items, C.amt];
    if (t == "credit") {
      rows.forEach(r => {
        let c = cm[r.uid] || {};
        r.lim = c.creditLimit || 0;
        r.used = c.creditUsed || 0;
      });
      cols = cols.concat([{ h: "Credit limit", v: r => r.lim, m: 1 }, { h: "Credit used now", v: r => r.used, m: 1 }]);
    }
    return {
      cols: cols,
      rows: rows,
      sum: [["Customers", rows.length], [t == "cash" ? "Cash orders" : "Credit orders", f.length], ["Amount", rupee(sumOf(f, o => o.total))]]
    };
  });
}

function salesBy(t) {
  return () => orders().then(os => {
    let f = t ? os.filter(o => o.payType == t) : os;
    return {
      cols: [
        { h: "Order no", v: r => r.id },
        { h: "Date", v: r => r.createdAt, d: 1 },
        { h: "Customer", v: r => r.name },
        { h: "Items", v: r => r.count },
        { h: "Payment", v: r => r.payType == "credit" ? "Credit" : "Cash" },
        { h: "Coupon", v: r => r.coupon || "-" },
        { h: "Discount", v: r => r.disc, m: 1 },
        { h: "Total", v: r => r.total, m: 1 }
      ],
      rows: f,
      sum: [
        ["Orders", f.length],
        ["Items sold", f.reduce((s, o) => s + o.count, 0)],
        ["Discount given", rupee(sumOf(f, o => o.disc))],
        ["Revenue", rupee(sumOf(f, o => o.total))]
      ]
    };
  });
}

function stockList(fn, note) {
  return () => $.when(db.list("inventory"), catMap()).then((r, cm) => {
    let rows = r.filter(fn).map(x => Object.assign(x, { cat: cm[x.catId] || "-" })).sort((a, b) => a.title.localeCompare(b.title));
    return {
      cols: [C.rank, C.title, C.cat, C.qty, C.price, C.value, C.status],
      rows: rows,
      sum: [["Items", rows.length], ["Total units", rows.reduce((s, x) => s + x.qty, 0)], ["Stock value", rupee(sumOf(rows, x => x.qty * x.price))]],
      note: note
    };
  });
}

const R = {
  cust_all: {
    t: "Customers - all details",
    run: () => db.list("customers").then(r => {
      r.sort((a, b) => a.name.localeCompare(b.name));
      return {
        cols: [
          C.rank, C.name, C.email,
          { h: "Mobile", v: r => r.mob },
          { h: "Credit limit", v: r => r.creditLimit || 0, m: 1 },
          { h: "Credit used", v: r => r.creditUsed || 0, m: 1 },
          { h: "Available", v: r => r2((r.creditLimit || 0) - (r.creditUsed || 0)), m: 1 },
          { h: "Joined", v: r => r.createdAt, d: 1 }
        ],
        rows: r,
        sum: [["Customers", r.length], ["Credit given", rupee(sumOf(r, x => x.creditLimit || 0))], ["Credit used", rupee(sumOf(r, x => x.creditUsed || 0))]]
      };
    })
  },
  cust_top: {
    t: "Top 10 customers",
    dates: 1,
    run: () => orders().then(os => {
      let rows = byCustomer(os).sort((a, b) => b.amt - a.amt).slice(0, 10);
      return {
        cols: [C.rank, C.name, C.email, C.orders, C.items, C.amt],
        rows: rows,
        sum: [["Customers who ordered", byCustomer(os).length], ["Orders", os.length], ["Total sales", rupee(sumOf(os, o => o.total))]]
      };
    })
  },
  cust_cash: { t: "Cash purchases by customer", dates: 1, run: custPay("cash") },
  cust_credit: { t: "Credit purchases by customer", dates: 1, run: custPay("credit") },
  inv_all: { t: "Current stock - all items", run: stockList(() => true) },
  inv_cat: {
    t: "Current stock - category wise",
    run: () => $.when(db.list("inventory"), catMap()).then((r, cm) => {
      let m = {};
      r.forEach(x => {
        let c = m[x.catId] || (m[x.catId] = { cat: cm[x.catId] || "-", n: 0, units: 0, value: 0, low: 0 });
        c.n++;
        c.units += x.qty;
        c.value = r2(c.value + x.qty * x.price);
        if (x.qty < LOW) c.low++;
      });
      let rows = Object.values(m).sort((a, b) => a.cat.localeCompare(b.cat));
      return {
        cols: [C.rank, C.cat, { h: "Items", v: r => r.n }, { h: "Total units", v: r => r.units }, { h: "Low stock items", v: r => r.low }, { h: "Stock value", v: r => r.value, m: 1 }],
        rows: rows,
        sum: [["Categories", rows.length], ["Items", r.length], ["Stock value", rupee(sumOf(rows, x => x.value))]]
      };
    })
  },
  inv_high: { t: "High stock items", run: stockList(x => x.qty > HIGH, "Items with more than " + HIGH + " units") },
  inv_low: { t: "Low stock items", run: stockList(x => x.qty < LOW, "Items with less than " + LOW + " units. Reorder soon.") },
  sales_all: { t: "All sales", dates: 1, run: salesBy("") },
  sales_cash: { t: "Cash sales", dates: 1, run: salesBy("cash") },
  sales_credit: { t: "Credit sales", dates: 1, run: salesBy("credit") },
  sales_cat: {
    t: "Category wise sales",
    dates: 1,
    run: () => orders().then(os => {
      let m = {};
      os.forEach(o => {
        let seen = {};
        o.items.forEach(x => {
          let c = m[x.catId] || (m[x.catId] = { cat: x.catName || "-", orders: 0, units: 0, amt: 0 });
          if (!seen[x.catId]) { c.orders++; seen[x.catId] = 1; }
          c.units += x.qty;
          c.amt = r2(c.amt + x.amt);
        });
      });
      let rows = Object.values(m).sort((a, b) => b.amt - a.amt);
      return {
        cols: [C.rank, C.cat, C.orders, C.units, C.sales],
        rows: rows,
        sum: [["Categories sold", rows.length], ["Units sold", rows.reduce((s, x) => s + x.units, 0)], ["Sales (before discount)", rupee(sumOf(rows, x => x.amt))]],
        note: "Sales amounts are item totals before coupon discounts."
      };
    })
  },
  sales_top: {
    t: "Top 10 selling items",
    dates: 1,
    run: () => orders().then(os => {
      let all = Object.values(byItem(os)).sort((a, b) => b.units - a.units || b.amt - a.amt);
      let rows = all.slice(0, 10);
      return {
        cols: [C.rank, C.title, C.cat, C.units, C.sales],
        rows: rows,
        sum: [["Different items sold", all.length], ["Units sold", all.reduce((s, x) => s + x.units, 0)]]
      };
    })
  },
  sales_bottom: {
    t: "Bottom 10 selling items",
    dates: 1,
    run: () => $.when(orders(), db.list("inventory"), catMap()).then((os, inv, cm) => {
      let s = byItem(os);
      let all = inv.map(x => ({
        title: x.title,
        cat: cm[x.catId] || "-",
        units: s[x.id] ? s[x.id].units : 0,
        amt: s[x.id] ? s[x.id].amt : 0,
        qty: x.qty
      })).sort((a, b) => a.units - b.units || a.amt - b.amt);
      let rows = all.slice(0, 10);
      return {
        cols: [C.rank, C.title, C.cat, C.units, C.sales, { h: "Current stock", v: r => r.qty }],
        rows: rows,
        sum: [["Items in inventory", inv.length], ["Items with no sales", all.filter(x => !x.units).length]],
        note: "Includes items with zero sales in this period."
      };
    })
  }
};

function cell(c, r, i) {
  let v = c.v(r, i);
  if (c.m) return rupee(v);
  if (c.d) return v ? v.toLocaleString("en-IN") : "-";
  return esc(v);
}

function show(d, res) {
  let rg = range();
  last = res;
  $("#rtitle").text(d.t);
  $("#rsub").text((d.dates
    ? "From " + rg.f.toLocaleDateString("en-IN") + " to " + rg.t.toLocaleDateString("en-IN")
    : "As on " + new Date().toLocaleString("en-IN")) + (res.note ? ". " + res.note : ""));
  $("#rsum").html(res.sum.map(s => `<div class="kpi"><small>${s[0]}</small><b>${s[1]}</b></div>`).join(""));
  $("#rtab").html(`
    <thead><tr>${res.cols.map(c => `<th>${c.h}</th>`).join("")}</tr></thead>
    <tbody>${res.rows.length
      ? res.rows.map((r, i) => `<tr>${res.cols.map(c => `<td>${cell(c, r, i)}</td>`).join("")}</tr>`).join("")
      : `<tr><td colspan="${res.cols.length}">No data for this report</td></tr>`}</tbody>`);
  $("#out").show();
}

function toggle() {
  $(".dt").toggle(!!R[$("#type").val()].dates);
}

$("#type").change(toggle);

$("#btn").click(function () {
  key = $("#type").val();
  let d = R[key];
  if (d.dates) {
    let f = $("#from").val(), t = $("#to").val();
    if (!f || !t) return msg("Select both From and To dates");
    if (f > t) return msg("From date cannot be after To date");
  }
  msg("");
  busy(true);
  d.run()
    .then(res => show(d, res))
    .fail(e => msg(errText(e)))
    .always(() => busy(false));
});

$("#csv").click(function () {
  if (!last) return;
  let rows = [last.cols.map(c => c.h)].concat(last.rows.map((r, i) => last.cols.map(c => {
    let v = c.v(r, i);
    return v instanceof Date ? v.toLocaleString("en-IN") : v;
  })));
  let s = rows.map(a => a.map(v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"').join(",")).join("\n");
  let a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + s], { type: "text/csv" }));
  a.download = key + (R[key].dates ? "_" + $("#from").val() + "_to_" + $("#to").val() : "_" + ymd(new Date())) + ".csv";
  a.click();
});

$("#print").click(() => window.print());

let now = new Date();
$("#from").val(ymd(new Date(now.getFullYear(), now.getMonth(), 1)));
$("#to").val(ymd(now));
toggle();
