const reName = /^[A-Za-z ]{3,30}$/;
const reEm = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const reMob = /^[6-9]\d{9}$/;
const rePw = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

function home() {
  let em = localStorage.getItem("em");
  if (em) location.href = em == ADMIN ? "admin/dashboard.html" : "customer/shop.html";
}
home();

$(function () {

  $("#signup").submit(function (e) {
    e.preventDefault();
    let nm = $("#name").val().trim();
    let em = $("#email").val().trim().toLowerCase();
    let mb = $("#mob").val().trim();
    let pw = $("#pw").val();
    let cp = $("#cpw").val();
    let v = [
      chk("name", reName.test(nm), "Only letters, 3 to 30 characters"),
      chk("email", reEm.test(em), "Enter a valid email"),
      chk("mob", reMob.test(mb), "Enter a 10 digit mobile number starting with 6-9"),
      chk("pw", rePw.test(pw), "Min 6 characters with a letter and a number"),
      chk("cpw", cp != "" && pw == cp, "Passwords do not match")
    ];
    if (!v.every(x => x)) return;
    busy(true);
    authApi("signUp", { email: em, password: pw, returnSecureToken: true })
      .then(r => {
        save(r);
        return db.set("customers", r.localId, {
          name: nm, email: em, mob: mb, creditLimit: 0, creditUsed: 0, createdAt: new Date()
        });
      })
      .then(() => {
        localStorage.setItem("name", nm);
        msg("Account created! Taking you to the shop...", true);
        setTimeout(() => location.href = "customer/shop.html", 1500);
      })
      .fail(e => msg(errText(e)))
      .always(() => busy(false));
  });

  $("#signin").submit(function (e) {
    e.preventDefault();
    let em = $("#email").val().trim().toLowerCase();
    let pw = $("#pw").val();
    let v = [
      chk("email", reEm.test(em), "Enter a valid email"),
      chk("pw", pw != "", "Enter your password")
    ];
    if (!v.every(x => x)) return;
    busy(true);
    authApi("signInWithPassword", { email: em, password: pw, returnSecureToken: true })
      .then(r => {
        save(r);
        if (em == ADMIN) return location.href = "admin/dashboard.html";
        return db.get("customers", r.localId).then(c => {
          localStorage.setItem("name", c.name || "Customer");
          location.href = "customer/shop.html";
        });
      })
      .fail(e => msg(errText(e)))
      .always(() => busy(false));
  });

  $("#reset").submit(function (e) {
    e.preventDefault();
    let em = $("#email").val().trim().toLowerCase();
    if (!chk("email", reEm.test(em), "Enter a valid email")) return;
    busy(true);
    authApi("sendOobCode", { requestType: "PASSWORD_RESET", email: em })
      .then(() => msg("If this email is registered, a reset link has been sent", true))
      .fail(e => msg(errText(e)))
      .always(() => busy(false));
  });

});
