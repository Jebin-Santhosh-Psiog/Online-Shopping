const AUTH = "https://identitytoolkit.googleapis.com/v1/accounts:";
const FS = "https://firestore.googleapis.com/v1/projects/" + PID + "/databases/(default)/documents";
const ADMIN = "admin@shop.com";
const MAXCREDIT = 1000;

function authApi(a, d) {
  return $.ajax({
    url: AUTH + a + "?key=" + KEY,
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify(d)
  });
}

function fresh() {
  let e = +localStorage.getItem("exp");
  if (!localStorage.getItem("rtok") || Date.now() < e - 60000) return $.Deferred().resolve();
  return $.ajax({
    url: "https://securetoken.googleapis.com/v1/token?key=" + KEY,
    method: "POST",
    data: { grant_type: "refresh_token", refresh_token: localStorage.getItem("rtok") }
  }).then(r => {
    localStorage.setItem("tok", r.id_token);
    localStorage.setItem("rtok", r.refresh_token);
    localStorage.setItem("exp", Date.now() + r.expires_in * 1000);
  });
}

function fsApi(m, p, d) {
  return fresh().then(() => $.ajax({
    url: FS + p,
    method: m,
    contentType: "application/json",
    headers: { Authorization: "Bearer " + localStorage.getItem("tok") },
    data: d ? JSON.stringify(d) : undefined
  }));
}

function toF(v) {
  if (v === null) return { nullValue: null };
  if (typeof v == "boolean") return { booleanValue: v };
  if (typeof v == "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toF) } };
  if (typeof v == "object") return { mapValue: { fields: toFields(v) } };
  return { stringValue: String(v) };
}

function toFields(o) {
  let f = {};
  for (let k in o) f[k] = toF(o[k]);
  return f;
}

function fromF(v) {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return new Date(v.timestampValue);
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(fromF);
  if ("mapValue" in v) return fromDoc(v.mapValue);
}

function fromDoc(d) {
  let o = {};
  for (let k in d.fields || {}) o[k] = fromF(d.fields[k]);
  if (d.name) o.id = d.name.split("/").pop();
  return o;
}

function docName(c, id) {
  return "projects/" + PID + "/databases/(default)/documents/" + c + "/" + id;
}

function mask(o) {
  return Object.keys(o).map(k => "updateMask.fieldPaths=" + k).join("&");
}

const db = {
  add: (c, o) => fsApi("POST", "/" + c, { fields: toFields(o) }).then(fromDoc),
  create: (c, id, o) => fsApi("POST", "/" + c + "?documentId=" + encodeURIComponent(id), { fields: toFields(o) }).then(fromDoc),
  set: (c, id, o) => fsApi("PATCH", "/" + c + "/" + id, { fields: toFields(o) }).then(fromDoc),
  get: (c, id) => fsApi("GET", "/" + c + "/" + id).then(fromDoc),
  upd: (c, id, o) => fsApi("PATCH", "/" + c + "/" + id + "?currentDocument.exists=true&" + mask(o), { fields: toFields(o) }).then(fromDoc),
  merge: (c, id, o) => fsApi("PATCH", "/" + c + "/" + id + "?" + mask(o), { fields: toFields(o) }).then(fromDoc),
  many: (c, ids) => fsApi("POST", ":batchGet", {
    documents: ids.map(i => docName(c, i))
  }).then(r => {
    let o = {};
    r.forEach(x => {
      if (x.found) {
        let d = fromDoc(x.found);
        o[d.id] = d;
      }
    });
    return o;
  }),
  commit: w => fsApi("POST", ":commit", { writes: w }),
  del: (c, id) => fsApi("DELETE", "/" + c + "/" + id),
  list: c => fsApi("GET", "/" + c + "?pageSize=300").then(r => (r.documents || []).map(fromDoc)),
  query: q => fsApi("POST", ":runQuery", { structuredQuery: q }).then(r => r.filter(x => x.document).map(x => fromDoc(x.document)))
};

function where(f, op, v) {
  return { fieldFilter: { field: { fieldPath: f }, op: op, value: toF(v) } };
}

function and(...a) {
  return { compositeFilter: { op: "AND", filters: a } };
}
