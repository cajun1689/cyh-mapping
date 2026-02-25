(function () {
  var container = document.getElementById("wyrm-map");
  if (!container) return;

  var filter = container.getAttribute("data-filter") || "";
  var height = container.getAttribute("data-height") || "600";
  var baseUrl = "https://casperyouthhubmap.org";

  var src = baseUrl + "/#/embed";
  if (filter) src += "?age_group=" + encodeURIComponent(filter);

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
