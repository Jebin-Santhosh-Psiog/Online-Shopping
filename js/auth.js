const reName = /^[A-Za-z ]{3,30}$/;
const reEm = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const reMob = /^[6-9]\d{9}$/;
const rePw = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
let t = "";

function home() {
  let em = localStorage.getItem("em");
  if (em) location.href = em == ADMIN ? "/admin/dashboard.html" : "/customer/shop.html";
}
home();

function chk(id, ok, m) {
  $("#e-" + id).text(ok ? "" : m);
  return ok;
}

function busy(b) {
  let x = $("#btn");
  if (!x.data("t")) x.data("t", x.text());
  x.prop("disabled", b).text(b ? "Please wait..." : x.data("t"));
}

function err(m) {
  return { responseJSON: { error: { message: m } } };
}

function errText(e) {
  let r = e.responseJSON;
  let m = r ? (r.error.message || r.error) : "Network error, check your connection";
  let map = {
    EMAIL_EXISTS: "This email is already registered",
    INVALID_LOGIN_CREDENTIALS: "Invalid email or password",
    EMAIL_NOT_FOUND: "Email not registered",
    INVALID_PASSWORD: "Wrong password",
    USER_DISABLED: "This account is disabled",
    INVALID_EMAIL: "Invalid email",
    TOO_MANY_ATTEMPTS_TRY_LATER: "Too many attempts, try again later",
    EMAIL_NOT_VERIFIED: "Please verify your email first. Check your inbox/spam"
  };
  return map[m.split(" ")[0]] || m;
}

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
        return dbApi("PUT", "customers/" + r.localId, {
          name: nm, email: em, mob: mb, creditLimit: 0, creditUsed: 0, createdAt: Date.now()
        });
      })
      .then(() => authApi("sendOobCode", { requestType: "VERIFY_EMAIL", idToken: localStorage.getItem("tok") }))
      .then(() => {
        localStorage.clear();
        msg("Account created! Verification mail sent to " + em + ". Redirecting to sign in...", true);
        setTimeout(() => location.href = "index.html", 3000);
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
    $("#resend").hide();
    authApi("signInWithPassword", { email: em, password: pw, returnSecureToken: true })
      .then(r => {
        save(r);
        return authApi("lookup", { idToken: r.idToken });
      })
      .then(r => {
        if (em == ADMIN) return location.href = "admin/dashboard.html";
        if (!r.users[0].emailVerified) {
          t = localStorage.getItem("tok");
          localStorage.clear();
          $("#resend").show();
          return $.Deferred().reject(err("EMAIL_NOT_VERIFIED"));
        }
        return dbApi("GET", "customers/" + localStorage.getItem("uid")).then(c => {
          localStorage.setItem("name", c ? c.name : "Customer");
          location.href = "customer/shop.html";
        });
      })
      .fail(e => msg(errText(e)))
      .always(() => busy(false));
  });

  $("#resend").click(function () {
    authApi("sendOobCode", { requestType: "VERIFY_EMAIL", idToken: t })
      .then(() => msg("Verification mail sent again", true))
      .fail(e => msg(errText(e)));
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
