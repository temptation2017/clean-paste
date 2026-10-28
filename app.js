(function () {
  "use strict";

  var CP = window.CleanPaste;
  if (!CP) {
    console.error("CleanPaste module missing");
    return;
  }

  var input = document.getElementById("input");
  var cleaned = document.getElementById("cleaned");
  var preview = document.getElementById("preview");
  var countEl = document.getElementById("count");
  var summary = document.getElementById("summary");
  var findingsWrap = document.getElementById("findings-wrap");
  var findingsBody = document.querySelector("#findings tbody");
  var btnSample = document.getElementById("btn-sample");
  var btnClean = document.getElementById("btn-clean");
  var btnCopy = document.getElementById("btn-copy");
  var optSpaces = document.getElementById("opt-spaces");
  var toast = document.getElementById("toast");
  var toastTimer = null;
  var debounceTimer = null;

  function opts() {
    return { normalizeWeirdSpaces: optSpaces.checked };
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 1800);
  }

  function refresh() {
    var text = input.value;
    var result = CP.scan(text, opts());
    countEl.textContent = String(result.total);
    countEl.className = "count " + (result.total === 0 ? "zero" : "hit");

    if (!text.length) {
      summary.textContent = "尚未扫描";
    } else if (result.total === 0) {
      summary.textContent = "未发现可疑不可见字符（常规空格/换行/制表符保留）";
    } else {
      summary.textContent =
        "共 " + result.findings.length + " 种 · 建议清除后再粘贴到聊天/工单/代码";
    }

    findingsBody.innerHTML = "";
    if (result.findings.length === 0) {
      findingsWrap.hidden = true;
    } else {
      findingsWrap.hidden = false;
      result.findings.forEach(function (f) {
        var tr = document.createElement("tr");
        var ctx = (f.contexts || []).join(" ｜ ");
        tr.innerHTML =
          "<td><code>" +
          f.uPlus +
          "</code></td>" +
          "<td>" +
          escapeText(f.label) +
          "</td>" +
          "<td>" +
          f.count +
          "</td>" +
          '<td class="ctx">' +
          escapeText(ctx) +
          "</td>";
        findingsBody.appendChild(tr);
      });
    }

    preview.innerHTML = CP.previewHtml(text, opts());
  }

  function escapeText(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function doClean() {
    var out = CP.clean(input.value, opts());
    cleaned.value = out;
    btnCopy.disabled = false;
    showToast("已生成清理结果");
  }

  function doCopy() {
    var text = cleaned.value;
    if (!text && text !== "") {
      return;
    }
    function ok() {
      showToast("已复制到剪贴板");
    }
    function fail() {
      // Fallback
      cleaned.focus();
      cleaned.select();
      try {
        document.execCommand("copy");
        ok();
      } catch (e) {
        showToast("复制失败，请手动全选复制");
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(fail);
    } else {
      fail();
    }
  }

  input.addEventListener("input", function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(refresh, 120);
  });

  optSpaces.addEventListener("change", function () {
    refresh();
    if (cleaned.value !== "") {
      cleaned.value = CP.clean(input.value, opts());
    }
  });

  btnSample.addEventListener("click", function () {
    input.value = CP.sampleText();
    cleaned.value = "";
    btnCopy.disabled = true;
    refresh();
    showToast("已填入虚构示例");
  });

  btnClean.addEventListener("click", doClean);
  btnCopy.addEventListener("click", doCopy);

  // Initial empty preview
  refresh();
})();
