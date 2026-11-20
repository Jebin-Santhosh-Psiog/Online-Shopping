guard("customer");
$("#uname").text(localStorage.getItem("name") || "User");

let cats = { c1: "Electronics", c2: "Fashion", c3: "Home" };
let items = [
  { id: "i1", catId: "c1", title: "Lenovo Idea Tab 11 inch", price: 14999, qty: 20, img: "https://placehold.co/300x300?text=Tablet" },
  { id: "i2", catId: "c1", title: "Wireless Gaming Mouse", price: 1299, qty: 0, img: "https://placehold.co/300x300?text=Mouse" },
  { id: "i3", catId: "c2", title: "Puffer Winter Jacket", price: 2499, qty: 15, img: "https://placehold.co/300x300?text=Jacket" },
  { id: "i4", catId: "c3", title: "BLDC Ceiling Fan", price: 3899, qty: 8, img: "https://placehold.co/300x300?text=Fan" },
  { id: "i5", catId: "c3", title: "Desk Organizer Stand", price: 599, qty: 40, img: "https://placehold.co/300x300?text=Organizer" }
];
let n = 4, p = 1, list = items;

function render() {
  let a = list.slice((p - 1) * n, p * n);
  $("#grid").html(a.map(x => `
    <div class="item">
      <img src="${x.img}" alt="${x.title}">
      <h4>${x.title}</h4>
      <div class="price">&#8377;${x.price.toLocaleString("en-IN")}</div>
      <div class="stock ${x.qty ? "" : "no"}">${x.qty ? "In stock" : "Out of stock"}</div>
      <button class="btn" ${x.qty ? "" : "disabled"}>Add to Cart</button>
    </div>`).join(""));
  $("#pg").text(p + " / " + (Math.ceil(list.length / n) || 1));
}

function filter(c) {
  let q = $("#q").val().toLowerCase();
  list = items.filter(x => (!c || x.catId == c) && x.title.toLowerCase().includes(q));
  p = 1;
  render();
}

$.each(cats, (k, v) => {
  $("#cat").append(`<option value="${k}">${v}</option>`);
  $("#catbar").append(`<a href="#" data-id="${k}">${v}</a>`);
});
$("#catbar").prepend(`<a href="#" data-id="" class="on">All</a>`);

$("#catbar").on("click", "a", function (e) {
  e.preventDefault();
  $("#catbar a").removeClass("on");
  $(this).addClass("on");
  $("#cat").val($(this).data("id"));
  filter($(this).data("id"));
});
$("#go").click(() => filter($("#cat").val()));
$("#q").keyup(e => e.key == "Enter" && filter($("#cat").val()));
$("#prev").click(() => { if (p > 1) { p--; render(); } });
$("#next").click(() => { if (p * n < list.length) { p++; render(); } });

render();
