(function () {
  var container = document.getElementById("wyrm-map");
  if (!container) return;

  var filter = container.getAttribute("data-filter") || "";
  var height = container.getAttribute("data-height") || "600";
  var ageSelect = container.hasAttribute("data-age-select");
  var hideFaith = container.hasAttribute("data-hide-faith");
  var noFaithToggle = container.hasAttribute("data-no-faith-toggle");
  var baseUrl = "https://casperyouthhubmap.org";

  var src = baseUrl + "/#/embed";
  var params = [];
  if (filter) params.push("age_group=" + encodeURIComponent(filter));
  if (ageSelect) params.push("age_select=1");
  if (hideFaith) params.push("hide_faith=1");
  if (noFaithToggle) params.push("no_faith_toggle=1");
  if (params.length) src += "?" + params.join("&");

  var iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.style.width = "100%";
  iframe.style.height = height + "px";
  iframe.style.border = "none";
  iframe.style.borderRadius = "8px";
  iframe.style.display = "block";
  iframe.setAttribute("loading", "lazy");
  iframe.setAttribute("title", "Wyoming Resource Map");
  iframe.setAttribute("allow", "geolocation");

  container.innerHTML = "";
  container.appendChild(iframe);
})();
