function save(r) {
  localStorage.setItem("tok", r.idToken);
  localStorage.setItem("rtok", r.refreshToken);
  localStorage.setItem("uid", r.localId);
  localStorage.setItem("em", r.email);
}

function guard(role) {
  let em = localStorage.getItem("em");
  if (!em) return location.href = "/index.html";
  if (role == "admin" && em != ADMIN) location.href = "/customer/shop.html";
  if (role == "customer" && em == ADMIN) location.href = "/admin/dashboard.html";
}

function logout() {
  localStorage.clear();
  location.href = "/index.html";
}

function msg(t, ok) {
  $("#msg").text(t).attr("class", ok ? "ok" : "err");
}
